const Citizen = require('../model/Citizen');
const Login = require('../model/Login');
const asyncHandler = require('../middleware/asyncHandler');

/* =====================
   GET CITIZENS
   ===================== */
exports.getUsers = asyncHandler(async (req, res) => {
    const citizens = await Citizen.find().populate('login_id', '-password');

    // Flatten structure for frontend compatibility
    const flattenedCitizens = citizens.map(c => {
        const citizenObj = c.toObject();
        return {
            ...citizenObj,
            email: citizenObj.login_id ? (citizenObj.login_id.username || citizenObj.login_id.email || null) : null,
            role: citizenObj.login_id ? (citizenObj.login_id.usertype || citizenObj.login_id.role || 'citizen') : 'citizen',
            status: citizenObj.login_id ? citizenObj.login_id.status : 'active'
        };
    });

    res.json(flattenedCitizens);
});

/* =====================
   APPROVE CITIZEN
   ===================== */
exports.approveUser = asyncHandler(async (req, res) => {
    // 1. Find the Citizen profile
    const citizen = await Citizen.findById(req.params.id);
    if (!citizen) {
        return res.status(404).json({ message: "Citizen not found" });
    }

    // 2. Update the LINKED Login document's status
    await Login.findByIdAndUpdate(citizen.login_id, { status: "active" });

    res.json({ message: "Citizen approved" });
});

/* =====================
   REJECT CITIZEN
   ===================== */
exports.rejectUser = asyncHandler(async (req, res) => {
    const citizen = await Citizen.findById(req.params.id);
    if (!citizen) {
        return res.status(404).json({ message: "Citizen not found" });
    }

    await Login.findByIdAndUpdate(citizen.login_id, { status: "rejected" });
    res.json({ message: "Citizen rejected" });
});

/* =====================
   DELETE CITIZEN
   ===================== */
exports.deleteUser = asyncHandler(async (req, res) => {
    const citizen = await Citizen.findById(req.params.id);
    if (!citizen) {
        return res.status(404).json({ message: "Citizen not found" });
    }

    // Delete both profile and login
    await Login.findByIdAndDelete(citizen.login_id);
    await citizen.deleteOne();

    res.json({ message: "Citizen deleted" });
});

/* =====================
   GET CURRENT CITIZEN PROFILE
   ===================== */
exports.getProfile = asyncHandler(async (req, res) => {
    // 1. Get Login Details
    const loginUser = await Login.findById(req.user.id);
    if (!loginUser) {
        return res.status(404).json({ message: 'User not found' });
    }

    // 2. Get Citizen Details
    const citizen = await Citizen.findOne({ login_id: loginUser._id });

    // 3. Combine Data
    const profileData = citizen ? {
        name: citizen.name,
        place: citizen.place,
        phone: citizen.phone
    } : {};

    res.json({
        success: true,
        user: {
            id: loginUser._id,
            email: loginUser.username,
            role: loginUser.usertype,
            ...profileData
        }
    });
});

/* =====================
   UPDATE CITIZEN PROFILE
   ===================== */
exports.updateProfile = asyncHandler(async (req, res) => {
    const loginUser = await Login.findById(req.user.id);
    if (!loginUser) {
        return res.status(404).json({ message: 'User not found' });
    }

    // 1. Update Password (if provided)
    if (req.body.password) {
        const bcrypt = require('bcryptjs');
        loginUser.password = await bcrypt.hash(req.body.password, 10);
        await loginUser.save();
    }

    // 2. Update Citizen Details
    const updatedCitizen = await Citizen.findOneAndUpdate(
        { login_id: loginUser._id },
        { $set: req.body },
        { new: true }
    );

    // 3. Construct Response
    const profileData = updatedCitizen ? {
        name: updatedCitizen.name,
        place: updatedCitizen.place,
        phone: updatedCitizen.phone
    } : {};

    res.json({
        success: true,
        message: "Profile updated successfully",
        user: {
            id: loginUser._id,
            email: loginUser.username,
            role: loginUser.usertype,
            ...profileData
        }
    });
});
