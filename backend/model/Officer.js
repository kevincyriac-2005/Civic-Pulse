const mongoose = require('mongoose');

const officerSchema = new mongoose.Schema({
    login_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Login",
        required: true
    },
    name: {
        type: String,
        required: true
    },
    phone: {
        type: String
    },
    department: {
        type: String,
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model("Officer", officerSchema);
