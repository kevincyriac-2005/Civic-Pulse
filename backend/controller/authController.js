const Login = require("../model/Login");
const Citizen = require("../model/Citizen");
const Officer = require("../model/Officer");
const FieldWorker = require("../model/FieldWorker");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendResetEmail, sendPasswordChangedEmail } = require("../utils/emailService");

// Register / Create Login
exports.register = async (req, res) => {
    try {
        const emailInput = req.body.username || req.body.email;
        const nameInput = req.body.firstName || req.body.name;
        
        const sanitizedUsername = emailInput?.trim().toLowerCase();
        const sanitizedPassword = req.body.password?.trim();
        const sanitizedFirstName = nameInput?.trim();
        const sanitizedLastName = req.body.lastName?.trim();

        // Required fields
        if (!sanitizedUsername || !sanitizedPassword) {
            return res.status(400).json({ 
                message: 'Email and password are required' 
            });
        }

        // Email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(sanitizedUsername)) {
            return res.status(400).json({ 
                message: 'Please enter a valid email address' 
            });
        }

        // Password length
        if (sanitizedPassword.length < 8) {
            return res.status(400).json({ 
                message: 'Password must be at least 8 characters' 
            });
        }

        // Name length
        if (sanitizedFirstName && sanitizedFirstName.length < 2) {
            return res.status(400).json({ 
                message: 'First name must be at least 2 characters' 
            });
        }

        const status = req.body.status || "active";
        const email = sanitizedUsername;
        const name = sanitizedFirstName;
        const username = sanitizedUsername;
        const password = sanitizedPassword;
        const usertype = 'citizen';

        // Check if user exists
        const existingUser = await Login.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists (email taken)" });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 1. Create Login Doc
        const user = new Login({
            username,
            password: hashedPassword,
            usertype,
            status
        });

        console.log("DEBUG: Attempting to save Login...");
        const savedUser = await user.save();
        console.log("DEBUG: Login saved. ID:", savedUser._id, "Usertype:", usertype);

        // 2. Create Citizen Profile
        if (usertype === 'citizen') {
            console.log("DEBUG: Creating Citizen Profile...");
            try {
                const newCitizen = await Citizen.create({
                    login_id: savedUser._id,
                    name: name || "Unknown",
                    email: email,
                    place: "Not Updated", // Placeholder for required field
                    phone: "0000000000"   // Placeholder for required field
                });
                console.log("DEBUG: Citizen Profile Created:", newCitizen);
            } catch (profileErr) {
                console.error("DEBUG: Citizen Profile Creation Failed:", profileErr);
                // If profile fails, delete the login so we don't have a zombie account
                await Login.findByIdAndDelete(savedUser._id);
                throw profileErr; // Re-throw to be caught below
            }
        } else {
            console.log("DEBUG: Skipping Citizen creation. Usertype is:", usertype);
        }

        res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        console.error("Register Error:", error);
        res.status(500).json({ message: `Server error: ${error.message}`, error });
    }
};

// Login Check
exports.login = async (req, res) => {
    try {
        const emailInput = req.body.username || req.body.email;
        const sanitizedUsername = emailInput?.trim().toLowerCase();
        const sanitizedPassword = req.body.password?.trim();

        if (!sanitizedUsername || !sanitizedPassword) {
            return res.status(400).json({ 
                message: 'Email and password are required' 
            });
        }

        const username = sanitizedUsername;

        // Find user
        const user = await Login.findOne({ 
            username: sanitizedUsername 
        });

        if (!user) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // Check password
        const isMatch = await bcrypt.compare(sanitizedPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check status
        if (user.status !== "active") {
            return res.status(403).json({ message: "Account is inactive" });
        }

        await Login.findByIdAndUpdate(user._id, {
            lastLogin: new Date()
        });

        // Create Token
        const payload = {
            user: {
                id: user._id,
                role: user.usertype,
                username: user.username
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET || "fallback_secret_key_123", // Use env variable preferably
            { expiresIn: "24h" },
            (err, token) => {
                if (err) throw err;
                res.json({
                    token,
                    user: {
                        id: user._id,
                        role: user.usertype,
                        email: user.username
                    }
                });
            }
        );

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: "Server error during login", error });
    }
};

// Update login via email/username
exports.updateLoginByEmail = async (req, res) => {
    try {
        const { username } = req.params;
        const { password, usertype, status, firstName, lastName, phone } = req.body;

        const user = await Login.findOne({ username });
        if (!user) return res.status(404).json({ message: "User not found" });

        if (password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
        }
        if (usertype) user.usertype = usertype;
        if (status) user.status = status;
        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (phone !== undefined) user.phone = phone; // Allow empty phone

        await user.save();
        res.json({ message: "User updated successfully", user });
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
};

// Get Admin Profile details (via Login document)
exports.getAdminProfile = async (req, res) => {
    try {
        const { username } = req.params;

        const user = await Login.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: "Admin profile not found" });
        }

        // Strip sensitive info before returning
        res.json({
            username: user.username,
            usertype: user.usertype,
            status: user.status,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone
        });
    } catch (error) {
        console.error("Profile Fetch Error:", error);
        res.status(500).json({ message: "Server error fetching profile", error });
    }
};

// Forgot Password — generate token and send reset email
exports.forgotPassword = async (req, res) => {
    try {
        const email = req.body.email?.trim().toLowerCase();
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const user = await Login.findOne({ username: email });
        if (!user) {
            return res.status(404).json({ message: 'No account found with that email address.' });
        }

        // Generate a raw random token (sent in email)
        const rawToken = crypto.randomBytes(32).toString('hex');
        // Store a SHA-256 hash in the DB (so the raw token never touches DB)
        const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await user.save();

        const resetUrl = `http://localhost:3000/reset-password/${rawToken}`;
        await sendResetEmail(email, resetUrl);

        res.status(200).json({ message: 'If that email is registered, a reset link has been sent.' });
    } catch (error) {
        console.error('Forgot Password Error:', error);
        res.status(500).json({ message: 'Server error. Please try again later.' });
    }
};

// Reset Password — validate token and update password
exports.resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        if (!token || !password) {
            return res.status(400).json({ message: 'Token and new password are required' });
        }
        if (password.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters' });
        }

        // Hash the incoming raw token to compare with stored hash
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = await Login.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: new Date() } // not expired
        });

        if (!user) {
            return res.status(400).json({ message: 'Reset link is invalid or has expired.' });
        }

        // Use findByIdAndUpdate with $set to guarantee MongoDB clears the token fields.
        // Mongoose's save() can skip null assignments if the field was already null,
        // which would leave the token valid. $set bypasses that behaviour.
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await Login.findByIdAndUpdate(user._id, {
            $set: {
                password: hashedPassword,
                resetPasswordToken: null,
                resetPasswordExpires: null,
                loginAttempts: 0,
                lockUntil: null
            }
        });

        // Send confirmation email (non-blocking — don't fail the request if email fails)
        sendPasswordChangedEmail(user.username).catch(err =>
            console.error('Confirmation email failed:', err)
        );

        res.status(200).json({ message: 'Password updated successfully. You can now log in.' });
    } catch (error) {
        console.error('Reset Password Error:', error);
        res.status(500).json({ message: 'Server error. Please try again later.' });
    }
};
