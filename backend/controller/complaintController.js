const mongoose = require('mongoose');
const Complaint = require('../model/Complaint');
const { mapToCanonical } = require('../utils/statusMapper');
const Citizen = require('../model/Citizen');
const asyncHandler = require('../middleware/asyncHandler');
const FieldWorker = require('../model/FieldWorker');
const Officer = require('../model/Officer');
const Category = require('../model/Category');
const Department = require('../model/Department');
const ExifParser = require('exif-parser');
const visionService = require('../services/visionService');
const hazardClassifier = require('../utils/hazardClassifier');
const ActivityLog = require('../model/ActivityLog');
const { getImageBuffer, saveImage } = require('../utils/saveImage');

const buildComplaintLookup = (complaintKey) => {
    const lookup = [{ complaintId: complaintKey }];
    if (mongoose.Types.ObjectId.isValid(complaintKey)) {
        lookup.unshift({ _id: complaintKey });
    }
    return { $or: lookup };
};

const findComplaintByParam = (complaintKey) => Complaint.findOne(buildComplaintLookup(complaintKey));

// Create a new complaint
exports.createComplaint = asyncHandler(async (req, res) => {
    // 1. Get Citizen ID
    const citizen = await Citizen.findOne({ login_id: req.user.id });
    if (!citizen) {
        return res.status(404).json({ message: "Citizen profile not found" });
    }

    const { title, description, imageUrl, beforeImageUrl, location, address, captureSource = 'unknown' } = req.body;
    const submissionImage = imageUrl || beforeImageUrl;

    let verificationStatus = "UNVERIFIED";
    let strictStatus = "UNVERIFIED";
    let spatialDelta = null;
    let exifLocation = undefined;
    let officerRemarks = '';
    let storedBeforeImagePath = submissionImage;

    let imageBuffer = null;
    if (submissionImage) {
        try {
            const imageResult = await getImageBuffer(submissionImage);
            imageBuffer = imageResult.buffer;
        } catch (fetchErr) {
            console.warn('[Submission] Could not load image buffer:', fetchErr.message);
        }
    }

    if (submissionImage) {
        try {
            storedBeforeImagePath = await saveImage(submissionImage);
        } catch (saveError) {
            return res.status(400).json({
                success: false,
                message: "Invalid complaint image. Please upload a supported image."
            });
        }
    }

    if (imageBuffer) {
        try {
            const parser = ExifParser.create(imageBuffer);
            const result = parser.parse();

            if (result.tags && result.tags.GPSLatitude && result.tags.GPSLongitude) {
                const exifLat = result.tags.GPSLatitude;
                const exifLong = result.tags.GPSLongitude;
                exifLocation = { type: 'Point', coordinates: [exifLong, exifLat] };

                const R = 6371e3;
                const φ1 = location.coordinates[1] * Math.PI / 180;
                const φ2 = exifLat * Math.PI / 180;
                const Δφ = (exifLat - location.coordinates[1]) * Math.PI / 180;
                const Δλ = (exifLong - location.coordinates[0]) * Math.PI / 180;

                const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                    Math.cos(φ1) * Math.cos(φ2) *
                    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                const d = R * c;
                spatialDelta = Math.round(d);

                if (spatialDelta < 100) {
                    if (captureSource === 'live') {
                        strictStatus = "VERIFIED_STRICT";
                        verificationStatus = "Verified";
                    } else {
                        strictStatus = "VERIFIED_WEAK";
                        verificationStatus = "Verified";
                    }
                } else {
                    strictStatus = "FLAGGED_MISMATCH";
                    verificationStatus = "Flagged";
                    officerRemarks = `[System Flag] Location Mismatch: ${spatialDelta}m detected. Source: ${captureSource}`;
                }
            } else {
                strictStatus = "UNVERIFIED";
                verificationStatus = "Unverified";
            }
        } catch (error) {
            console.error("Verification failed:", error.message);
            strictStatus = "UNVERIFIED";
        }
    }

    let autoClassification = {};
    let visionMetadata = [];
    let confidenceScore = 0;
    let detectedIssueType = "General";

    if (imageBuffer) {
        try {
            const labels = await visionService.analyzeImage(imageBuffer);
            visionMetadata = labels;
            const classification = hazardClassifier.determineCategory(labels);
            autoClassification = classification;
            confidenceScore = classification.confidence;
            if (classification.category !== 'General' && classification.category !== 'Unclassified') {
                detectedIssueType = classification.category;
            }
        } catch (err) {
            console.error("Vision API failure:", err.message);
        }
    }

    let assignedOfficer = null;
    let assignedDepartmentId = null;

    if (detectedIssueType !== "General") {
        try {
            const categoryDoc = await Category.findOne({ name: detectedIssueType });
            if (categoryDoc && categoryDoc.department) {
                const dept = await Department.findOne({ name: categoryDoc.department });
                if (dept) {
                    assignedDepartmentId = dept._id;
                    const officerPipeline = [
                        { $match: { department: categoryDoc.department, isActive: true } },
                        {
                            $lookup: {
                                from: 'complaints',
                                let: { officerId: '$_id' },
                                pipeline: [
                                    { $match: { $expr: { $and: [{ $eq: ['$officer_id', '$$officerId'] }, { $ne: ['$status', 'Resolved'] }] } } }
                                ],
                                as: 'activeComplaints'
                            }
                        },
                        { $addFields: { workload: { $size: '$activeComplaints' } } },
                        { $sort: { workload: 1 } }
                    ];
                    let officers = await Officer.aggregate(officerPipeline);
                    if (officers.length > 0) {
                        assignedOfficer = officers[0];
                    }
                }
            }
        } catch (assignErr) {
            console.error('Auto-assignment error:', assignErr.message);
        }
    }

    const complaint = await Complaint.create({
        complaintId: `CMP-${Date.now()}`,
        citizenId: citizen._id,
        role: "Citizen",
        title,
        description,
        issueType: detectedIssueType !== "General" ? detectedIssueType : (req.body.issueType || "General"),
        beforeImageUrl: storedBeforeImagePath,
        location,
        exifLocation,
        report_location: address || "Auto-Detected via GPS",
        report_latitude: location?.coordinates ? location.coordinates[1] : null,
        report_longitude: location?.coordinates ? location.coordinates[0] : null,
        autoClassification,
        visionMetadata,
        detectedLabels: visionMetadata.map(vm => ({ label: vm.description, score: vm.score })),
        confidenceScore,
        trustMetadata: {
            captureSource,
            locationSource: 'html5',
            spatialDelta,
            verificationStatus: strictStatus
        },
        verificationStatus: strictStatus.includes('VERIFIED') ? 'Verified' : (strictStatus === 'FLAGGED_MISMATCH' ? 'Flagged' : 'Unverified'),
        locationDelta: spatialDelta,
        officerRemarks: officerRemarks.trim(),
        address: address || "Auto-Detected via GPS",
        departmentId: assignedDepartmentId || undefined,
        officer_id: assignedOfficer ? assignedOfficer._id : undefined,
        status: "REPORTED",
        assignedAt: null
    });

    res.status(201).json({ success: true, data: complaint });
});

// Get complaints for citizen map view
exports.getMapComplaints = asyncHandler(async (req, res) => {
    const complaints = await Complaint.find({
        'location.coordinates': { $exists: true, $not: { $size: 0 } },
        'location.type': 'Point'
    })
    .select('title description status issueType location address priority verificationStatus createdAt complaintId')
    .sort({ createdAt: -1 });

    res.status(200).json({ success: true, complaints });
});

// Get single complaint detail
exports.getCitizenComplaintById = asyncHandler(async (req, res) => {
    const complaint = await findComplaintByParam(req.params.id)
        .populate('officer_id', 'name department')
        .populate('employee_id', 'name')
        .populate('citizenId', 'name')
        .populate('departmentId', 'name');

    if (!complaint) {
        return res.status(404).json({ success: false, message: "Complaint not found." });
    }

    if (req.user.usertype === 'citizen') {
        const citizen = await Citizen.findOne({ login_id: req.user._id });
        if (!citizen || complaint.citizenId?._id.toString() !== citizen._id.toString()) {
            return res.status(403).json({ success: false, message: "Access denied." });
        }
    }

    res.status(200).json({ success: true, complaint });
});

// Withdraw a complaint
exports.withdrawComplaint = asyncHandler(async (req, res) => {
    const complaint = await findComplaintByParam(req.params.id);
    if (!complaint) {
        return res.status(404).json({ success: false, message: "Complaint not found." });
    }

    const citizen = await Citizen.findOne({ login_id: req.user._id });
    if (!citizen || complaint.citizenId?.toString() !== citizen._id.toString()) {
        return res.status(403).json({ success: false, message: "Access denied." });
    }

    if (complaint.status !== 'Pending' && complaint.status !== 'REPORTED') {
        return res.status(400).json({
            success: false,
            message: `Cannot withdraw a complaint that is already "${complaint.status}".`
        });
    }

    complaint.status = 'REJECTED';
    complaint.officerRemarks = (complaint.officerRemarks || '') + `\n[System] Withdrawn by citizen.`;
    await complaint.save();

    res.status(200).json({ success: true, message: "Complaint withdrawn successfully.", complaint });
});

// Get complaints (Admin, Officer, Field, Citizen)
exports.getComplaints = asyncHandler(async (req, res) => {
    let complaints;

    if (req.user.usertype === 'admin') {
        complaints = await Complaint.aggregate([
            { $sort: { createdAt: -1 } },
            { $lookup: { from: 'citizens', localField: 'citizenId', foreignField: '_id', as: 'citizen' } },
            { $unwind: { path: '$citizen', preserveNullAndEmptyArrays: true } },
            { $lookup: { from: 'fieldworkers', localField: 'employee_id', foreignField: '_id', as: 'assignedWorker' } },
            { $unwind: { path: '$assignedWorker', preserveNullAndEmptyArrays: true } }
        ]);
    } else if (req.user.usertype === 'officer') {
        const officer = await Officer.findOne({ login_id: req.user._id });
        if (!officer) return res.status(404).json({ message: "Officer profile not found" });

        const dept = await Department.findOne({ name: officer.department });

        complaints = await Complaint.aggregate([
            {
                $match: {
                    $or: [
                        { departmentId: dept ? dept._id : null },
                        { officer_id: officer._id }
                    ]
                }
            },
            { $sort: { createdAt: -1 } },
            { $lookup: { from: 'citizens', localField: 'citizenId', foreignField: '_id', as: 'citizen' } },
            { $addFields: { citizenId: { $arrayElemAt: ["$citizen", 0] } } },
            { $lookup: { from: 'schedules', localField: '_id', foreignField: 'complaint_id', as: 'schedule' } },
            { $addFields: { latestSchedule: { $arrayElemAt: ["$schedule", 0] } } },
            { $lookup: { from: 'fieldworkers', localField: 'latestSchedule.employee_id', foreignField: '_id', as: 'assignedWorker' } },
            { $addFields: { employee_id: { $arrayElemAt: ["$assignedWorker", 0] } } },
            {
                $project: {
                    _id: 1, complaintId: 1, title: 1, description: 1, status: 1, issueType: 1,
                    location: 1, address: 1, report_location: 1, verificationStatus: 1, createdAt: 1,
                    beforeImageUrl: 1, afterImageUrl: 1, priority: 1, citizenId: 1, employee_id: 1
                }
            }
        ]);
    } else if (req.user.usertype === 'field') {
        const worker = await FieldWorker.findOne({ login_id: req.user._id });
        if (!worker) return res.status(404).json({ message: "Fieldworker profile not found" });
        complaints = await Complaint.find({ employee_id: worker._id }).sort({ createdAt: -1 }).populate('citizenId');
    } else {
        const citizen = await Citizen.findOne({ login_id: req.user._id });
        if (!citizen) return res.status(404).json({ message: "Citizen profile not found" });
        complaints = await Complaint.find({ citizenId: citizen._id }).sort({ createdAt: -1 });
    }

    res.status(200).json({
        success: true,
        debug: { role: req.user.usertype },
        count: complaints ? complaints.length : 0,
        data: complaints || []
    });
});

// Assign a Field Worker
exports.assignComplaint = asyncHandler(async (req, res) => {
    const { complaintId, fieldWorkerId, remarks } = req.body;
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) return res.status(404).json({ message: "Complaint not found" });

    complaint.employee_id = fieldWorkerId;
    complaint.status = "ASSIGNED";
    complaint.assignedAt = Date.now();

    const officer = await Officer.findOne({ login_id: req.user._id });
    if (officer) complaint.officer_id = officer._id;

    if (remarks) complaint.officerRemarks = remarks;
    await complaint.save();

    res.status(200).json({ success: true, data: complaint });
});

// Update Status
exports.updateComplaintStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    let { status, remarks, afterImage } = req.body;
    status = mapToCanonical(status);

    const complaint = await findComplaintByParam(id);
    if (!complaint) return res.status(404).json({ message: "Complaint not found" });

    if (status) complaint.status = status;

    if (status === 'RESOLVED') {
        if (!afterImage && !complaint.afterImageUrl) {
            return res.status(400).json({ message: "After image required" });
        }

        if (afterImage) {
            try {
                const imageResult = await getImageBuffer(afterImage);
                complaint.afterImageUrl = await saveImage(afterImage);
                const visionResult = await visionService.analyzeImage(imageResult.buffer);
                complaint.resolutionMetadata = { verifiedAt: Date.now(), visionLabels: visionResult.labels, safeSearch: visionResult.safeSearch };
            } catch (err) {
                console.error("Resolution verification failed:", err);
            }
        }

        complaint.resolvedAt = Date.now();
    }

    if (remarks) {
        const actorLabel = req.user?.usertype === 'officer' ? 'Officer' : 'Worker';
        complaint.officerRemarks = (complaint.officerRemarks ? complaint.officerRemarks + "\n" : "") + `[${actorLabel}] ${remarks}`;
    }
    await complaint.save();

    res.status(200).json({ success: true, data: complaint });
});

// Review Evidence
exports.reviewComplaintEvidence = asyncHandler(async (req, res) => {
    const { action, officerNotes } = req.body;
    const complaintId = req.params.id;

    const officerProfile = await Officer.findOne({ login_id: req.user._id });
    if (!officerProfile) return res.status(403).json({ success: false, message: "Officer only." });

    const task = await findComplaintByParam(complaintId);
    if (!task) return res.status(404).json({ success: false, message: "Not found." });

    const normalizedAction = String(action || '').trim().toLowerCase();
    if (!['approve', 'rework', 'reject'].includes(normalizedAction)) {
        return res.status(400).json({ success: false, message: "Invalid review action." });
    }

    const cleanedNotes = String(officerNotes || '').trim();
    if (normalizedAction === 'approve') {
        task.status = 'RESOLVED';
        task.verificationStatus = 'Verified';
        task.resolvedAt = task.resolvedAt || Date.now();
    } else {
        task.status = 'IN_PROGRESS';
        task.verificationStatus = 'Failed';
        task.resolvedAt = null;
    }

    const actionLabel = normalizedAction === 'approve' ? 'Approve' : 'Rework';
    const defaultNotes = normalizedAction === 'approve'
        ? 'Resolution approved by officer.'
        : 'Evidence rejected and task returned to worker for rework.';
    task.officerRemarks = (task.officerRemarks ? task.officerRemarks + '\n' : '') + `[Officer Review] ${actionLabel}: ${cleanedNotes || defaultNotes}`;
    await task.save();

    try {
        await ActivityLog.create({
            complaintId: task._id,
            actionType: 'STATUS_UPDATED',
            performedBy: req.user._id,
            performedByName: officerProfile.name,
            performedRole: 'officer',
            remarks: cleanedNotes || defaultNotes,
            newStatus: task.status
        });
    } catch (logError) {
        console.error('Could not log officer review activity:', logError);
    }

    res.status(200).json({ success: true, task });
});
