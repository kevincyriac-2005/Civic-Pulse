const mongoose = require('mongoose');

const citizenSchema = new mongoose.Schema({
    login_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Login",
        required: true
    },
    name: {
        type: String,
        required: true
    },
    place: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    }
}, { timestamps: true });

module.exports = mongoose.model("Citizen", citizenSchema);
