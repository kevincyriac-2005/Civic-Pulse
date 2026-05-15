const jwt = require('jsonwebtoken');
const Login = require('../model/Login');
const asyncHandler = require('./asyncHandler');

exports.protect = asyncHandler(async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        console.log("Auth Middleware Error: No token provided in headers.");
        return res.status(401).json({ message: 'Not authorized to access this route' });
    }

    try {
        // Use consistent secret with fallback
        const secret = process.env.JWT_SECRET || "fallback_secret_key_123";
        const decoded = jwt.verify(token, secret);

        // Debug Log
        // console.log("Token Decoded User ID:", decoded.user ? decoded.user.id : decoded.id);

        // Payload structure check
        const userId = decoded.user ? decoded.user.id : decoded.id;
        const loginUser = await Login.findById(userId);

        if (!loginUser) {
            console.log("Auth Middleware Error: User not found in DB for ID:", userId);
            return res.status(401).json({ message: 'User not found' });
        }

        req.user = loginUser;

        // Attach Profile ID for specific roles
        if (loginUser.usertype === 'citizen') {
            const Citizen = require('../model/Citizen');
            const profile = await Citizen.findOne({ login_id: loginUser._id });
            req.user.profileId = profile ? profile._id : null;
        } else if (loginUser.usertype === 'field') {
            const FieldWorker = require('../model/FieldWorker');
            const profile = await FieldWorker.findOne({ login_id: loginUser._id });
            req.user.profileId = profile ? profile._id : null;
        } else if (loginUser.usertype === 'officer') {
            const Officer = require('../model/Officer');
            const profile = await Officer.findOne({ login_id: loginUser._id });
            req.user.profileId = profile ? profile._id : null;
        }

        next();
    } catch (err) {
        console.error("Auth Middleware JWT Error:", err.message);
        return res.status(401).json({ message: 'Not authorized to access this route' });
    }
});
