const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    complaintId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Complaint',
        required: true
    },
    actionType: {
        type: String,
        required: true,
        enum: ['COMPLAINT_CREATED', 'COMPLAINT_ASSIGNED', 'COMPLAINT_REASSIGNED', 'STATUS_UPDATED', 'COMPLAINT_RESOLVED', 'HAZARD_FLAGGED']
    },
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Login', // Assuming mapping back directly to the auth Login ID
        required: true
    },
    performedRole: {
        type: String,
        required: true
    },
    performedByName: {
        type: String,
        required: true
    },
    remarks: {
        type: String,
        default: ''
    },
    newStatus: {
        type: String,
        default: ''
    }
}, { timestamps: true });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
