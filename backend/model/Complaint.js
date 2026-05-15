const mongoose = require("mongoose");
const { mapToCanonical } = require('../utils/statusMapper');

const complaintSchema = new mongoose.Schema({

    complaintId: {
        type: String,
        required: true,
        unique: true
    },

    citizenId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Citizen",
        required: true
    },

    role: {
        type: String,
        enum: ["Citizen", "FieldWorker"],
        required: true
    },

    title: {
        type: String,
        required: true
    },

    description: {
        type: String
    },

    issueType: {
        type: String,
        required: true
    },

    detectedLabels: [{
        label: String,
        score: Number
    }],

    beforeImageUrl: {
        type: String,
        required: true
    },

    afterImageUrl: {
        type: String,
        default: null
    },

    departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Department"
    },

    employee_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FieldWorker",
        default: null
    },

    officer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Officer",
        default: null
    },

    officerRemarks: {
        type: String,
        default: ''
    },

    assignedAt: {
        type: Date,
        default: null
    },

    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number]
        }
    },

    report_location: {
        type: String
    },

    report_latitude: {
        type: Number,
        required: false
    },

    report_longitude: {
        type: Number,
        required: false
    },

    address: {
        type: String
    },

    status: {
        type: String,
        enum: [
            "REPORTED",
            "ASSIGNED",
            "IN_PROGRESS",
            "VERIFICATION_PENDING",
            "RESOLVED",
            "REJECTED"
        ],
        default: "REPORTED"
    },

    autoClassification: {
        category: { type: String },
        confidence: { type: Number },
        matchedKeyword: { type: String },
        raw: { type: mongoose.Schema.Types.Mixed }
    },

    resolutionMetadata: {
        verifiedAt: { type: Date },
        exifCheck: { type: String },
        labelCheck: { type: String },
        imageSimilarityCheck: { type: String },
        log: { type: String }
    },

    verificationStatus: {
        type: String,
        enum: ["NotVerified", "Verified", "Failed", "Flagged", "Unverified"],
        default: "NotVerified"
    },

    priority: {
        type: String,
        enum: ["Low", "Medium", "High"],
        default: "Medium"
    }

}, { timestamps: true });

complaintSchema.index({ location: '2dsphere' });

// Ensure any status updates go through the canonical mapping
complaintSchema.pre('validate', async function () {
    if (this.isModified('status') || this.isNew || this.status) {
        this.status = mapToCanonical(this.status);
    }
});

// Middleware for findOneAndUpdate / updateOne / updateMany
async function canonicalizeStatusUpdate() {
    const update = this.getUpdate();
    if (update && update.status) {
        update.status = mapToCanonical(update.status);
    }
    if (update && update.$set && update.$set.status) {
        update.$set.status = mapToCanonical(update.$set.status);
    }
}

complaintSchema.pre('findOneAndUpdate', canonicalizeStatusUpdate);
complaintSchema.pre('updateOne', canonicalizeStatusUpdate);
complaintSchema.pre('updateMany', canonicalizeStatusUpdate);

module.exports = mongoose.model("Complaint", complaintSchema);
