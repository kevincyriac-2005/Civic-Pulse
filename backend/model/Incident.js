const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
    // User who reported (Citizen)
    reportedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Citizen',
        required: true
    },

    // Description & Title
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },

    // Category (Auto-filled by AI or Manual)
    category: {
        type: String,
        required: true
    },
    department: {
        type: String,
        required: true
    },

    // VISUAL EVIDENCE
    imageUrl: {
        type: String,
        required: true
    },

    // INTEGRATION 1: GOOGLE CLOUD VISION API
    aiTags: [{
        type: String
    }],
    aiConfidence: {
        type: Number,
        default: 0
    },

    // INTEGRATION 2: GEOSPATIAL MAPPING (GeoJSON)
    location: {
        type: {
            type: String,
            enum: ['Point'],
            required: true
        },
        coordinates: {
            type: [Number], // [Longitude, Latitude]
            required: true
        },
        address: {
            type: String
        }
    },

    // INTEGRATION 3: AUTOMATED AUDITING
    status: {
        type: String,
        enum: ['Pending', 'In Progress', 'Resolved', 'Rejected'],
        default: 'Pending'
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FieldWorker'
    },
    resolutionImage: {
        type: String
    },
    resolutionNotes: {
        type: String
    },
    auditStatus: {
        type: String,
        enum: ['Pending', 'Verified', 'Failed'],
        default: 'Pending'
    }

}, { timestamps: true });

// 2dsphere Index for Geospatial Queries
incidentSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Incident', incidentSchema);
