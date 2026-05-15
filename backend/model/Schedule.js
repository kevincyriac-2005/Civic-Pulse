const mongoose = require("mongoose");

const scheduleSchema = new mongoose.Schema({

     employee_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FieldWorker",
        default: null
    },
   

    // Integrated Scheduling Fields
    complaint_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Complaints",
        default: null
    },

    officerRemarks: {
        type: String,
        default: ""
    },

    assignedAt: {
        type: Date,
        default: null
    },

    createdAt: {
        type: Date,
        default: Date.now
    },

    resolvedAt: {
        type: Date,
        default: null
    }

}, { timestamps: true });

module.exports = mongoose.model("Schedule", scheduleSchema);
