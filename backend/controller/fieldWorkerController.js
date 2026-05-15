const Login = require('../model/Login');
const FieldWorker = require('../model/FieldWorker');
const bcrypt = require('bcryptjs');
const asyncHandler = require('../middleware/asyncHandler');
const { getImageBuffer, saveImage } = require('../utils/saveImage');

/* =====================
   CREATE FIELD WORKER
   ===================== */
exports.createFieldWorker = asyncHandler(async (req, res) => {
    try {
        const { name, email, password, department } = req.body;

        const exists = await Login.findOne({ email });
        if (exists) {
            return res.status(400).json({ message: "Email already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // 1. Create Login
        const loginUser = await Login.create({
            username: email, // Map email to username
            password: hashedPassword,
            usertype: 'field', // Fix: use usertype
            status: 'active'
        });

        // 2. Create Profile (Manual Rollback)
        let newProfile;
        const loginId = loginUser._id;

        try {
            newProfile = await FieldWorker.create({
                login_id: loginId, name, department, phone: ""
            });
        } catch (profileError) {
            await Login.findByIdAndDelete(loginId);
            throw profileError;
        }

        res.status(201).json({
            success: true,
            message: "Field Worker created successfully",
            user: { ...newProfile.toObject(), email, role: 'field' }
        });
    } catch (error) {
        throw error;
    }
});

/* =====================
   GET ALL FIELD WORKERS
   ===================== */
exports.getFieldWorkers = asyncHandler(async (req, res) => {
    const workers = await FieldWorker.find().populate('login_id', '-password');

    // Flatten structure
    const flattenedWorkers = workers.map(w => {
        const obj = w.toObject();
        return {
            ...obj,
            role: 'field',
            email: obj.login_id ? obj.login_id.username : null,
            status: obj.login_id ? obj.login_id.status : 'active'
        };
    });

    res.json(flattenedWorkers);
});

/* =====================
   UPDATE FIELD WORKER (Admin)
   ===================== */
exports.updateFieldWorker = asyncHandler(async (req, res) => {
    const { name, email, department } = req.body;

    const worker = await FieldWorker.findById(req.params.id);
    if (!worker) {
        return res.status(404).json({ message: "Field Worker not found" });
    }

    // Update Profile
    worker.name = name || worker.name;
    worker.department = department || worker.department;
    const updatedWorker = await worker.save();

    // Update Login
    if (email) {
        await Login.findByIdAndUpdate(worker.login_id, { username: email });
    }

    res.json({ message: "Field Worker updated", user: updatedWorker });
});

/* =====================
   DELETE FIELD WORKER
   ===================== */
exports.deleteFieldWorker = asyncHandler(async (req, res) => {
    const worker = await FieldWorker.findById(req.params.id);
    if (!worker) {
        return res.status(404).json({ message: "Field Worker not found" });
    }

    await Login.findByIdAndDelete(worker.login_id);
    await worker.deleteOne();

    res.json({ message: "Field Worker deleted" });
});

/* =====================
   GET CURRENT PROFILE
   ===================== */
exports.getProfile = asyncHandler(async (req, res) => {
    const loginUser = await Login.findById(req.user.id);
    if (!loginUser) return res.status(404).json({ message: 'User not found' });

    const worker = await FieldWorker.findOne({ login_id: loginUser._id });
    const profileData = worker ? {
        name: worker.name,
        department: worker.department,
        phone: worker.phone
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
   UPDATE CURRENT PROFILE
   ===================== */
exports.updateProfile = asyncHandler(async (req, res) => {
    const loginUser = await Login.findById(req.user.id);
    if (!loginUser) return res.status(404).json({ message: 'User not found' });

    if (req.body.password) {
        const bcrypt = require('bcryptjs');
        loginUser.password = await bcrypt.hash(req.body.password, 10);
        await loginUser.save();
    }

    const updatedWorker = await FieldWorker.findOneAndUpdate(
        { login_id: loginUser._id },
        { $set: req.body },
        { new: true }
    );

    const profileData = updatedWorker ? {
        name: updatedWorker.name,
        department: updatedWorker.department,
        phone: updatedWorker.phone
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

/* =====================
   PRIVATE HELPER: COMPUTE SUMMARY
   ===================== */
async function _getFieldWorkerSummary(workerId) {
    const Complaint = require('../model/Complaint');
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const SLA_DAYS = 3;
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - SLA_DAYS);

    const [
        totalAssigned,
        assignedToday,
        pendingTasks,
        inProgress,
        completedToday,
        overdueTasks,
        highSeverityPending
    ] = await Promise.all([
        Complaint.countDocuments({ employee_id: workerId }),
        Complaint.countDocuments({ employee_id: workerId, createdAt: { $gte: startOfToday } }),
        Complaint.countDocuments({
            employee_id: workerId,
            status: { $in: ['Assigned', 'assigned', 'Pending', 'pending', 'ASSIGNED', 'REPORTED'] }
        }),
        Complaint.countDocuments({
            employee_id: workerId,
            status: { $in: ['InProgress', 'In-Progress', 'in-progress', 'inProgress', 'IN_PROGRESS'] }
        }),
        Complaint.countDocuments({
            employee_id: workerId,
            status: { $in: ['Resolved', 'resolved', 'Closed', 'closed', 'RESOLVED', 'VERIFICATION_PENDING'] },
            updatedAt: { $gte: startOfToday }
        }),
        Complaint.countDocuments({
            employee_id: workerId,
            status: { $nin: ['Resolved', 'resolved', 'Closed', 'closed', 'Rejected', 'RESOLVED', 'VERIFICATION_PENDING', 'REJECTED'] },
            createdAt: { $lt: thresholdDate }
        }),
        Complaint.countDocuments({
            employee_id: workerId,
            status: { $nin: ['Resolved', 'resolved', 'Closed', 'closed', 'Rejected', 'RESOLVED', 'VERIFICATION_PENDING', 'REJECTED'] },
            priority: { $in: ['High', 'Critical'] }
        })
    ]);

    return {
        totalAssigned,
        assignedToday,
        pendingTasks,
        inProgress,
        completedToday,
        overdueTasks,
        highSeverityPending
    };
}

/* =====================
   GET OVERVIEW STATS (Premium Field Worker Dashboard Page 1)
   ===================== */
exports.getOverviewStats = asyncHandler(async (req, res) => {
    const loginUser = await Login.findById(req.user.id);
    if (!loginUser || loginUser.usertype !== 'field') {
        return res.status(403).json({ success: false, message: "Access denied. Field worker only." });
    }

    const workerProfile = await FieldWorker.findOne({ login_id: loginUser._id });
    if (!workerProfile) {
        return res.status(404).json({ success: false, message: "Field Worker profile not found." });
    }

    const summary = await _getFieldWorkerSummary(workerProfile._id);

    res.status(200).json({
        success: true,
        summary
    });
});

/* =====================
   GET ASSIGNED TASKS (Field Worker Dashboard My Tasks - Page 2)
   ===================== */
exports.getAssignedTasks = asyncHandler(async (req, res) => {
    const loginUser = await Login.findById(req.user.id);
    if (!loginUser || loginUser.usertype !== 'field') {
        return res.status(403).json({ success: false, message: "Access denied. Field worker only." });
    }

    const workerProfile = await FieldWorker.findOne({ login_id: loginUser._id });
    if (!workerProfile) {
        return res.status(404).json({ success: false, message: "Field Worker profile not found." });
    }

    const workerId = workerProfile._id;
    const Complaint = require('../model/Complaint');
    const { filterReq } = req.query;
    let query = { employee_id: workerId };

    if (filterReq === 'pending') {
        query.status = { $in: ['Assigned', 'assigned', 'Pending', 'pending', 'ASSIGNED', 'REPORTED'] };
    } else if (filterReq === 'high_priority') {
        query.status = { $nin: ['Resolved', 'resolved', 'Closed', 'closed', 'Rejected', 'RESOLVED', 'VERIFICATION_PENDING', 'REJECTED'] };
        query.priority = { $in: ['High', 'Critical'] };
    } else if (filterReq === 'completed_today') {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        query.status = { $in: ['Resolved', 'resolved', 'Closed', 'closed', 'RESOLVED', 'VERIFICATION_PENDING'] };
        query.updatedAt = { $gte: startOfToday };
    } else {
        query.status = { $nin: ['Resolved', 'resolved', 'Closed', 'closed', 'Rejected', 'RESOLVED', 'VERIFICATION_PENDING', 'REJECTED'] };
    }

    const tasks = await Complaint.find(query).sort({ priority: -1, createdAt: -1 });
    const summary = await _getFieldWorkerSummary(workerId);

    res.status(200).json({
        success: true,
        summary,
        activeTasks: tasks
    });
});

/* =====================
   UPDATE TASK STATUS (Execution actions)
   ===================== */
exports.updateTaskStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const complaintId = req.params.id;

    const loginUser = await Login.findById(req.user.id);
    const workerProfile = await FieldWorker.findOne({ login_id: loginUser._id });

    if (!workerProfile) {
        return res.status(403).json({ success: false, message: "Not authorized." });
    }

    const Complaint = require('../model/Complaint');
    const task = await Complaint.findById(complaintId);

    if (!task) {
        return res.status(404).json({ success: false, message: "Task not found." });
    }

    // Security Check: Ensure task belongs to *this* worker
    if (task.employee_id.toString() !== workerProfile._id.toString()) {
        return res.status(403).json({ success: false, message: "Cannot modify a task assigned to someone else." });
    }

    // Prevent bypassing evidence requirement if trying to resolve
    if (status === 'RESOLVED' || status === 'resolved') {
        return res.status(400).json({ success: false, message: "Use the /upload-evidence endpoint to resolve tasks natively." });
    }

    task.status = status;
    await task.save();

    // Log the activity
    try {
        const ActivityLog = require('../model/ActivityLog');
        await ActivityLog.create({
            complaintId: task._id,
            actionType: 'STATUS_UPDATED',
            performedBy: loginUser._id,
            performedByName: workerProfile.name,
            performedRole: 'field',
            remarks: `Field worker marked task as ${status}`,
            newStatus: status
        });
    } catch (e) { console.error("Could not log activity:", e); }

    res.status(200).json({ success: true, message: `Task marked as ${status}`, task });
});

/* =====================
   UPLOAD COMPLETION EVIDENCE (Resolve Task)
   Verification Governance: BLOCK vs FLAG Policy
   ===================== */
exports.uploadCompletionEvidence = asyncHandler(async (req, res) => {
    const complaintId = req.params.id;
    const { evidenceImageUrl, remarks, latitude, longitude } = req.body;

    const loginUser = await Login.findById(req.user.id);
    if (!loginUser || loginUser.usertype !== 'field') {
        return res.status(403).json({ success: false, message: "Hard Block: Unauthorized role." });
    }

    const workerProfile = await FieldWorker.findOne({ login_id: loginUser._id });
    if (!workerProfile) {
        return res.status(403).json({ success: false, message: "Hard Block: Field Worker profile not found." });
    }

    const Complaint = require('../model/Complaint');
    const task = await Complaint.findById(complaintId);
    if (!task) {
        return res.status(404).json({ success: false, message: "Hard Block: Task not found." });
    }
    if (!task.employee_id || task.employee_id.toString() !== workerProfile._id.toString()) {
        return res.status(403).json({ success: false, message: "Hard Block: Task not assigned to this field worker." });
    }

    if (!evidenceImageUrl) {
        return res.status(400).json({ success: false, message: "Hard Block: No completion image uploaded." });
    }

    if (typeof evidenceImageUrl !== 'string') {
        return res.status(400).json({ success: false, message: "Hard Block: Invalid file format. Expected image." });
    }

    const verificationResults = { exifCheck: "pending", labelCheck: "pending", hashCheck: "pending" };
    let requiresReview = false;
    const auditLogs = [];
    let imageBuffer = null;
    try {
        const imageResult = await getImageBuffer(evidenceImageUrl);
        imageBuffer = imageResult.buffer;
    } catch (fetchErr) {
        return res.status(400).json({ success: false, message: "Hard Block: Invalid file format. Expected image." });
    }

    if (imageBuffer) {
        try {
            const ExifParser = require('exif-parser');
            const parser = ExifParser.create(imageBuffer);
            const exifResult = parser.parse();

            if (exifResult.tags && exifResult.tags.GPSLatitude && exifResult.tags.GPSLongitude) {
                const exifLat = exifResult.tags.GPSLatitude;
                const exifLng = exifResult.tags.GPSLongitude;
                const origLat = task.location?.coordinates?.[1] || task.report_latitude;
                const origLng = task.location?.coordinates?.[0] || task.report_longitude;

                if (origLat && origLng) {
                    const R = 6371e3;
                    const p1 = origLat * Math.PI / 180, p2 = exifLat * Math.PI / 180;
                    const dp = (exifLat - origLat) * Math.PI / 180;
                    const dl = (exifLng - origLng) * Math.PI / 180;
                    const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
                    const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

                    if (distance > 100) {
                        verificationResults.exifCheck = "fail";
                        auditLogs.push(`Location mismatch detected (${Math.round(distance)}m from origin)`);
                        requiresReview = true;
                    } else {
                        verificationResults.exifCheck = "pass";
                    }
                } else {
                    verificationResults.exifCheck = "pass";
                }
            } else {
                verificationResults.exifCheck = "missing";
                auditLogs.push("EXIF metadata missing from completion image");
                requiresReview = true;
            }
        } catch (exifErr) {
            console.error("[Layer 1 EXIF] Error:", exifErr.message);
            verificationResults.exifCheck = "missing";
            auditLogs.push("EXIF metadata missing (parser error)");
            requiresReview = true;
        }
    }

    if (imageBuffer) {
        try {
            const visionService = require('../services/visionService');
            const visionResult = await visionService.analyzeImage(imageBuffer);
            const newLabels = visionResult.map(l => l.description.toLowerCase());

            const originalIssueType = task.issueType || "";
            const issueKeywords = originalIssueType.toLowerCase().split(/[ \-\/]/);
            const hazardKeywords = ["garbage", "trash", "smoke", "fire", "leak", "waste", "debris", "pothole"];
            let issuePersists = false;

            if (task.autoClassification && task.autoClassification.matchedKeyword) {
                const coreKeyword = task.autoClassification.matchedKeyword.toLowerCase();
                if (newLabels.includes(coreKeyword)) issuePersists = true;
            } else {
                for (const keyword of issueKeywords) {
                    if (keyword.length > 3 && newLabels.includes(keyword) && hazardKeywords.includes(keyword)) {
                        issuePersists = true;
                        break;
                    }
                }
            }

            if (issuePersists) {
                verificationResults.labelCheck = "fail";
                auditLogs.push("Hazard keywords still detected in closure image");
                requiresReview = true;
            } else {
                verificationResults.labelCheck = "pass";
            }
        } catch (visErr) {
            verificationResults.labelCheck = "skipped";
            auditLogs.push(`Vision check skipped (${visErr.message})`);
            requiresReview = true;
        }
    }

    try {
        const imageHasher = require('../utils/imageHasher');
        if (task.beforeImageUrl) {
            const hashBefore = await imageHasher.generateHash(task.beforeImageUrl);
            const hashAfter = await imageHasher.generateHash(imageBuffer);

            if (hashBefore && hashAfter) {
                const distance = imageHasher.calculateHammingDistance(hashBefore, hashAfter);
                if (distance < 5) {
                    verificationResults.hashCheck = "fail";
                    auditLogs.push(`Duplicate or identical image detected (Hamming distance: ${distance}/64)`);
                    requiresReview = true;
                } else {
                    verificationResults.hashCheck = "pass";
                }
            } else {
                verificationResults.hashCheck = "pass";
            }
        } else {
            verificationResults.hashCheck = "pass";
        }
    } catch (hashErr) {
        verificationResults.hashCheck = "skipped";
        auditLogs.push("Hash check skipped (hashing error)");
        requiresReview = true;
    }

    const finalStatus = requiresReview ? "Resolved - Pending Officer Review" : "Resolved";
    const isClean = !requiresReview;

    const auditBlock = auditLogs.length > 0
        ? `\n--- System Audit ---\n${auditLogs.map((log, i) => `${i + 1}. ${log}`).join('\n')}`
        : `\n--- System Audit ---\nClean Resolution. All verification layers passed.`;

    task.afterImageUrl = await saveImage(evidenceImageUrl);
    task.status = finalStatus;
    task.verificationStatus = isClean ? "Verified" : "Flagged";

    task.resolutionMetadata = {
        verifiedAt: Date.now(),
        exifCheck: verificationResults.exifCheck,
        labelCheck: verificationResults.labelCheck,
        imageSimilarityCheck: verificationResults.hashCheck,
        log: auditLogs.join(' | ')
    };

    task.officerRemarks = remarks
        ? `${remarks}${auditBlock}`
        : `Field worker submission.${auditBlock}`;

    if (latitude && longitude) {
        task.report_latitude = latitude;
        task.report_longitude = longitude;
    }

    await task.save();

    try {
        const ActivityLog = require('../model/ActivityLog');
        await ActivityLog.create({
            complaintId: task._id,
            actionType: 'COMPLAINT_RESOLVED',
            performedBy: loginUser._id,
            performedByName: workerProfile.name,
            performedRole: 'field',
            remarks: `Task resolved → ${finalStatus}. ${auditLogs.length > 0 ? auditLogs.join('; ') : 'All checks passed.'}`,
            newStatus: finalStatus
        });
    } catch (e) { console.error("Could not log activity:", e); }

    res.status(200).json({
        success: true,
        message: isClean
            ? "Task successfully resolved. All verification layers passed."
            : "Task resolved but flagged for Officer Review.",
        status: finalStatus,
        task,
        verificationResults,
        auditLogs
    });
});

/* =====================
   GET TASK HISTORY (Paginated Completed Tasks)
   ===================== */
exports.getTaskHistory = asyncHandler(async (req, res) => {
    const loginUser = await Login.findById(req.user.id);
    if (!loginUser || loginUser.usertype !== 'field') {
        return res.status(403).json({ success: false, message: "Access denied. Field worker only." });
    }

    const workerProfile = await FieldWorker.findOne({ login_id: loginUser._id });
    if (!workerProfile) {
        return res.status(404).json({ success: false, message: "Field Worker profile not found." });
    }

    const workerId = workerProfile._id;
    const Complaint = require('../model/Complaint');

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    const query = {
        employee_id: workerId,
        status: { $in: ['Resolved', 'resolved', 'Closed', 'closed', 'RESOLVED', 'VERIFICATION_PENDING'] }
    };

    const total = await Complaint.countDocuments(query);
    const tasks = await Complaint.find(query)
        .sort({ updatedAt: -1 })
        .skip(startIndex)
        .limit(limit);

    const formattedTasks = tasks.map(task => ({
        _id: task._id,
        complaintId: task.complaintId || task._id.toString().substring(0, 8),
        category: task.category?.name || "Target Area Zone",
        description: task.description,
        severity: task.priority || "Normal",
        trustLevel: (task.upvotes > 5 || task.trustScore > 70) ? "Verified" : "Standard",
        resolvedAt: task.updatedAt,
        completionNotes: task.officerRemarks || "No completion notes provided.",
        officerRemarks: task.officerRemarks,
        location: {
            lat: task.report_latitude || (task.location && task.location.coordinates ? task.location.coordinates[1] : null),
            lng: task.report_longitude || (task.location && task.location.coordinates ? task.location.coordinates[0] : null)
        }
    }));

    res.status(200).json({
        success: true,
        count: formattedTasks.length,
        pagination: {
            total,
            page,
            pages: Math.ceil(total / limit)
        },
        historictasks: formattedTasks
    });
});

/* =====================
   GET SINGLE TASK DETAIL (Task Action Page)
   ===================== */
exports.getTaskDetail = asyncHandler(async (req, res) => {
    const loginUser = await Login.findById(req.user.id);
    if (!loginUser || loginUser.usertype !== 'field') {
        return res.status(403).json({ success: false, message: "Access denied. Field worker only." });
    }

    const workerProfile = await FieldWorker.findOne({ login_id: loginUser._id });
    if (!workerProfile) {
        return res.status(404).json({ success: false, message: "Field Worker profile not found." });
    }

    const Complaint = require('../model/Complaint');
    const task = await Complaint.findById(req.params.id);

    if (!task) {
        return res.status(404).json({ success: false, message: "Task not found. The complaint ID may be invalid." });
    }

    console.log('[TaskDetail] task.employee_id:', task.employee_id, '| workerProfile._id:', workerProfile._id);

    if (!task.employee_id) {
        return res.status(403).json({ success: false, message: "This task has no assigned field worker." });
    }
    if (task.employee_id.toString() !== workerProfile._id.toString()) {
        return res.status(403).json({ success: false, message: `Access denied: task is assigned to a different field worker.` });
    }

    res.status(200).json({ success: true, task });
});

/* =====================
   GET WORK SUMMARY (Performance Metrics)
   ===================== */
exports.getWorkSummary = asyncHandler(async (req, res) => {
    const loginUser = await Login.findById(req.user.id);
    if (!loginUser || loginUser.usertype !== 'field') {
        return res.status(403).json({ success: false, message: "Access denied. Field worker only." });
    }

    const workerProfile = await FieldWorker.findOne({ login_id: loginUser._id });
    if (!workerProfile) {
        return res.status(404).json({ success: false, message: "Field Worker profile not found." });
    }

    const workerId = workerProfile._id;
    const Complaint = require('../model/Complaint');

    const summary = await Complaint.aggregate([
        { $match: { employee_id: workerId } },
        {
            $group: {
                _id: null,
                totalAssigned: { $sum: 1 },
                totalCompleted: {
                    $sum: {
                        $cond: [{ $in: ["$status", ["Resolved", "resolved", "Closed", "closed", "RESOLVED", "VERIFICATION_PENDING"]] }, 1, 0]
                    }
                },
                pending: {
                    $sum: {
                        $cond: [{ $in: ["$status", ["Assigned", "assigned", "Pending", "pending", "InProgress", "In-Progress", "in-progress", "inProgress", "ASSIGNED", "REPORTED", "IN_PROGRESS"]] }, 1, 0]
                    }
                },
                completedTasks: {
                    $push: {
                        $cond: [
                            { $in: ["$status", ["Resolved", "resolved", "Closed", "closed", "RESOLVED", "VERIFICATION_PENDING"]] },
                            {
                                timeDiffMs: { $subtract: ["$updatedAt", "$createdAt"] },
                                completedAt: "$updatedAt"
                            },
                            null
                        ]
                    }
                }
            }
        },
        {
            $project: {
                _id: 0,
                totalAssigned: 1,
                totalCompleted: 1,
                pending: 1,
                validCompletedTasks: {
                    $filter: {
                        input: "$completedTasks",
                        as: "task",
                        cond: { $ne: ["$$task", null] }
                    }
                }
            }
        }
    ]);

    if (!summary || summary.length === 0) {
        return res.status(200).json({
            success: true,
            summary: {
                totalAssigned: 0,
                totalCompleted: 0,
                pending: 0,
                avgCompletionTime: 0,
                lastCompleted: null
            }
        });
    }

    const result = summary[0];
    let avgTimeHours = 0;
    let lastCompletedDate = null;

    if (result.validCompletedTasks && result.validCompletedTasks.length > 0) {
        const totalMs = result.validCompletedTasks.reduce((acc, task) => acc + task.timeDiffMs, 0);
        avgTimeHours = totalMs / result.validCompletedTasks.length / (1000 * 60 * 60);

        lastCompletedDate = result.validCompletedTasks.reduce((latest, task) => {
            return (new Date(task.completedAt) > new Date(latest)) ? task.completedAt : latest;
        }, result.validCompletedTasks[0].completedAt);
    }

    res.status(200).json({
        success: true,
        summary: {
            totalAssigned: result.totalAssigned,
            totalCompleted: result.totalCompleted,
            pending: result.pending,
            avgCompletionTime: parseFloat(avgTimeHours.toFixed(2)),
            lastCompleted: lastCompletedDate
        }
    });
});
