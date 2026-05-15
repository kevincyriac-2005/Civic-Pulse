const mongoose = require('mongoose');

const fieldWorkerSchema = new mongoose.Schema({
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
    },
    isAvailable: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model("FieldWorker", fieldWorkerSchema);
