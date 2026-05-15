const Schedule = require('../model/Schedule');
const Complaint = require('../model/Complaint');
const ActivityLog = require('../model/ActivityLog');
const Officer = require('../model/Officer');
const asyncHandler = require('../middleware/asyncHandler');

// Create a new Schedule (Assign Field Worker)
exports.createSchedule = asyncHandler(async (req, res) => {
    const { complaint_id, employee_id, officerRemarks, assignedAt } = req.body;

    // 1. Verify Complaint exists
    const complaint = await Complaint.findById(complaint_id);
    if (!complaint) {
        return res.status(404).json({ message: "Complaint not found" });
    }

    // 2. Create Schedule
    const previousEmployeeId = complaint.employee_id ? complaint.employee_id.toString() : null;
    const isReassignment = Boolean(previousEmployeeId && previousEmployeeId !== String(employee_id));
    const schedule = await Schedule.create({
        complaint_id,
        employee_id,
        officerRemarks,
        assignedAt: assignedAt || Date.now()
    });

    // 3. Update Complaint Status and Assignee
    complaint.status = "ASSIGNED";
    complaint.employee_id = employee_id; // Sync employee_id for easy querying
    if (officerRemarks) {
        complaint.officerRemarks = officerRemarks;
    }
    await complaint.save();

    try {
        const officerProfile = req.user?.usertype === 'officer'
            ? await Officer.findOne({ login_id: req.user._id }).select('name')
            : null;

        await ActivityLog.create({
            complaintId: complaint._id,
            actionType: isReassignment ? 'COMPLAINT_REASSIGNED' : 'COMPLAINT_ASSIGNED',
            performedBy: req.user._id,
            performedByName: officerProfile?.name || 'Officer',
            performedRole: req.user?.usertype || 'officer',
            remarks: officerRemarks || (isReassignment ? 'Complaint reassigned by officer.' : 'Complaint assigned by officer.'),
            newStatus: complaint.status
        });
    } catch (logError) {
        console.error('Could not log assignment activity:', logError);
    }

    res.status(201).json({
        success: true,
        message: "Field Worker assigned successfully",
        data: schedule
    });
});

// Get Schedules for a Complaint (Optional, for viewing history)
exports.getSchedules = asyncHandler(async (req, res) => {
    const schedules = await Schedule.find({ complaint_id: req.params.complaintId })
        .populate('employee_id', 'name phone department');

    res.json(schedules);
});
