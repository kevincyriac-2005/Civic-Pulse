const Login = require('../model/Login');
const mongoose = require('mongoose');
const Officer = require('../model/Officer');
const Complaint = require('../model/Complaint');
const FieldWorker = require('../model/FieldWorker');
const Department = require('../model/Department');
const ActivityLog = require('../model/ActivityLog');
const bcrypt = require('bcryptjs');
const asyncHandler = require('../middleware/asyncHandler');
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');

/* =====================
   CREATE OFFICER
   ===================== */
exports.createOfficer = asyncHandler(async (req, res) => {
    try {
        const { name, email, password, department } = req.body;

        const exists = await Login.findOne({ email });
        if (exists) {
            return res.status(400).json({ message: "Email already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // 1. Create Login
        const loginUser = await Login.create({
            username: email, // Map email to username for Login model
            password: hashedPassword,
            usertype: 'officer',
            status: 'active'
        });

        // 2. Create Profile (Manual Rollback)
        let newProfile;
        const loginId = loginUser._id;

        try {
            newProfile = await Officer.create({
                login_id: loginId, name, department, phone: ""
            });
        } catch (profileError) {
            await Login.findByIdAndDelete(loginId);
            throw profileError;
        }

        res.status(201).json({
            success: true,
            message: "Officer created successfully",
            user: { ...newProfile.toObject(), email, role: 'officer' }
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
});

/* =====================
   OFFICER PROFILE DATA
   ===================== */
exports.getProfile = asyncHandler(async (req, res) => {
    try {
        // 1. Fetch Core Officer Identity
        const loginId = req.user._id;
        const officer = await Officer.findOne({ login_id: loginId }).populate('login_id', 'username email status');

        if (!officer) {
            return res.status(404).json({ success: false, message: "Officer profile not found" });
        }

        // 2. Compute Department Information (Total Workers)
        // Ensure accurate count matching officer's assigned department
        const departmentObj = await Department.findOne({ name: officer.department });
        let totalWorkers = 0;

        // Build secure scoping query
        const scopingOr = [{ officer_id: officer._id }];
        if (departmentObj) {
            totalWorkers = await FieldWorker.countDocuments({ departmentId: departmentObj._id });
            scopingOr.push({ departmentId: departmentObj._id });
        }
        const baseQuery = { $or: scopingOr };

        // 3. Compute Workload & SLA Metrics
        const activeComplaints = await Complaint.countDocuments({
            ...baseQuery,
            status: { $nin: ['RESOLVED', 'REJECTED', /RESOLVED/i] }
        });

        const totalResolved = await Complaint.countDocuments({
            ...baseQuery,
            status: { $regex: /RESOLVED/i }
        });

        // SLA Overdue logic (>3 days old & Active)
        const SLA_DAYS = 3;
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - SLA_DAYS);

        const overdueCount = await Complaint.countDocuments({
            ...baseQuery,
            status: { $nin: ['RESOLVED', 'REJECTED'] },
            createdAt: { $lt: thresholdDate }
        });

        // Analytics (Closure Rate & Avg Resolution Time)
        const analyticsAggregation = await Complaint.aggregate([
            { $match: baseQuery },
            {
                $group: {
                    _id: null,
                    totalCases: { $sum: 1 },
                    resolvedCases: {
                        $sum: { $cond: [{ $regexMatch: { input: "$status", regex: /RESOLVED/i } }, 1, 0] }
                    },
                    resolutionTimeSum: {
                        $sum: {
                            $cond: [
                                { $regexMatch: { input: "$status", regex: /RESOLVED/i } },
                                { $subtract: ["$resolvedAt", "$createdAt"] },
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        let closureRate = 0;
        let avgResolutionTime = 0; // In Hours

        if (analyticsAggregation.length > 0) {
            const stats = analyticsAggregation[0];
            if (stats.totalCases > 0) {
                closureRate = Math.round((stats.resolvedCases / stats.totalCases) * 100);
            }
            if (stats.resolvedCases > 0) {
                // Convert milliseconds to hours
                const msInHour = 1000 * 60 * 60;
                avgResolutionTime = Math.round((stats.resolutionTimeSum / stats.resolvedCases) / msInHour);
            }
        }

        // 4. Fetch Recent Activity (Last 5 actions via ActivityLog model)
        const relevantComplaints = await Complaint.find(baseQuery).select('_id');
        const relevantIds = relevantComplaints.map(c => c._id);

        let recentActivity = [];
        if (relevantIds.length > 0) {
            const logs = await ActivityLog.find({ complaintId: { $in: relevantIds } })
                .sort({ timestamp: -1 })
                .limit(5)
                .populate('complaintId', 'complaintId');

            recentActivity = logs.map(log => ({
                id: log._id,
                action: log.actionType,
                complaintRef: log.complaintId ? (log.complaintId.complaintId || log.complaintId._id.toString().substring(0, 8).toUpperCase()) : 'N/A',
                timestamp: log.createdAt || log.timestamp
            }));
        }

        // 5. Structure Final Payload
        const payload = {
            success: true,
            user: {
                name: officer.name,
                email: officer.login_id?.email || officer.login_id?.username,
                phone: officer.phone || '',
                officerId: officer._id.toString().substring(0, 8).toUpperCase(),
                department: officer.department,
                region: "Central Metro District", // Hardcoded placeholder for now since region isn't strictly defined on Officer model
                joiningDate: officer.createdAt,
                totalWorkers,
                activeComplaints,
                performanceStats: {
                    avgResolutionTime,
                    closureRate,
                    overdueCount,
                    totalResolved
                },
                recentActivity
            }
        };

        res.status(200).json(payload);
    } catch (error) {
        console.error("Profile Fetch Error:", error);
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
});

/* =====================
   UPDATE PROFILE 
   ===================== */
exports.updateProfile = asyncHandler(async (req, res) => {
    try {
        const { name, phone, password } = req.body;
        const loginId = req.user._id;

        // 1. Find the mapped Officer Profile
        const officer = await Officer.findOne({ login_id: loginId });

        if (!officer) {
            return res.status(404).json({ success: false, message: "Officer profile not found" });
        }

        // 2. Update Officer specific details
        const updateFields = {};
        if (name) updateFields.name = name;
        if (phone) updateFields.phone = phone;

        if (Object.keys(updateFields).length > 0) {
            await Officer.findByIdAndUpdate(officer._id, updateFields, { new: true, runValidators: true });
        }

        // 3. Update Login (Password) if provided
        if (password) {
            // Re-hash the new secure password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            await Login.findByIdAndUpdate(loginId, { password: hashedPassword }, { new: true });
        }

        res.status(200).json({
            success: true,
            message: "Profile credentials updated successfully",
            updatedName: name || officer.name
        });

    } catch (error) {
        console.error("Profile Update Error:", error);
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
});

/* =====================
   GET ALL OFFICERS
   ===================== */
exports.getOfficers = asyncHandler(async (req, res) => {
    const officers = await Officer.find().populate('login_id', '-password');

    // Flatten structure
    const flattenedOfficers = officers.map(o => {
        const obj = o.toObject();
        return {
            ...obj,
            role: 'officer',
            email: obj.login_id ? obj.login_id.username : null,
            status: obj.login_id ? obj.login_id.status : 'active'
        };
    });

    res.json(flattenedOfficers);
});

/* =====================
   UPDATE OFFICER (Admin)
   ===================== */
exports.updateOfficer = asyncHandler(async (req, res) => {
    const { name, email, department } = req.body;

    const officer = await Officer.findById(req.params.id);
    if (!officer) {
        return res.status(404).json({ message: "Officer not found" });
    }

    // Update Profile
    officer.name = name || officer.name;
    officer.department = department || officer.department;
    const updatedOfficer = await officer.save();

    // Update Login
    if (email) {
        await Login.findByIdAndUpdate(officer.login_id, { username: email }); // Email is username
    }

    res.json({ message: "Officer updated", user: updatedOfficer });
});

/* =====================
   DELETE OFFICER
   ===================== */
exports.deleteOfficer = asyncHandler(async (req, res) => {
    const officer = await Officer.findById(req.params.id);
    if (!officer) {
        return res.status(404).json({ message: "Officer not found" });
    }

    await Login.findByIdAndDelete(officer.login_id);
    await officer.deleteOne();

    res.json({ message: "Officer deleted" });
});

/* =====================
   OFFICER DASHBOARD SUMMARY
   ===================== */
exports.getDashboardSummary = asyncHandler(async (req, res) => {
    // 1. Identify Officer Profile mapping to this login
    const officerProfile = await Officer.findOne({ login_id: req.user._id });

    if (!officerProfile) {
        return res.status(404).json({ message: "Officer profile not found. Cannot load dashboard." });
    }

    const dept = officerProfile.department;

    // Build secure scoping query
    const scopingOr = [{ officer_id: officerProfile._id }];
    if (officerProfile.department) {
        const deptObj = await Department.findOne({ name: officerProfile.department });
        if (deptObj) {
            scopingOr.push({ departmentId: deptObj._id });
        }
    }
    const baseQuery = { $or: scopingOr };

    // 2. Fetch KPIs using Promise.all for parallelism
    const [
        totalAssigned,
        open,
        inProgress,
        pendingReview,
        resolvedToday,
        highPriority,
        fieldWorkers
    ] = await Promise.all([
        // Total complaints assigned to this specific officer/dept
        Complaint.countDocuments(baseQuery),
        // Status: Open/Pending -> REPORTED
        Complaint.countDocuments({ ...baseQuery, status: { $regex: /REPORTED/i } }),
        // Status: In Progress -> ASSIGNED, IN_PROGRESS, etc.
        Complaint.countDocuments({ ...baseQuery, status: { $in: ['ASSIGNED', 'IN_PROGRESS', 'IN-PROGRESS'] } }),
        // Status: Needs Review -> VERIFICATION_PENDING or Flagged resolutions
        Complaint.countDocuments({ ...baseQuery, status: { $regex: /PENDING|REVIEW/i } }),
        // Resolved Today (Any variation of resolved)
        Complaint.countDocuments({
            ...baseQuery,
            status: { $regex: /RESOLVED/i },
            updatedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        }),
        // Top 5 High Priority Complaints (Non-resolved)
        Complaint.find({
            ...baseQuery,
            status: { $nin: ['RESOLVED', 'REJECTED'] }
        })
            .populate('employee_id', 'name')
            .sort({ priority: -1, createdAt: -1 })
            .limit(5),
        // Active Field Workers in the Same Department
        FieldWorker.find({ department: dept, isActive: true }).select('name _id')
    ]);

    // 3. Aggregate Workloads for Field Workers
    const workerStats = await Promise.all(fieldWorkers.map(async (fw) => {
        const [activeTasks, completedToday] = await Promise.all([
            Complaint.countDocuments({
                employee_id: fw._id,
                status: { $nin: ['RESOLVED', 'REJECTED'] }
            }),
            Complaint.countDocuments({
                employee_id: fw._id,
                status: { $regex: /RESOLVED/i },
                updatedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
            })
        ]);

        return {
            id: fw._id,
            name: fw.name,
            activeTasks,
            completedToday,
            lastUpdate: "Live" 
        };
    }));

    // 4. Return formatted response matching the Architecture Plan
    const resolvedCount = await Complaint.countDocuments({ ...baseQuery, status: { $regex: /RESOLVED/i } });

    res.json({
        totalAssigned,
        open,
        inProgress,
        pendingReview,
        resolvedToday,
        workerStats,
        statusBreakdown: {
            open,
            inProgress,
            pendingReview,
            resolved: resolvedCount
        },
        highPriority: highPriority.map(c => ({
            id: c._id.toString(),
            complaintRef: c.complaintId || c._id.toString().substring(0, 8).toUpperCase(),
            category: c.issueType || c.category,
            location: c.address || c.report_location || 'Mapped Location',
            assignedWorker: c.employee_id ? c.employee_id.name : 'Unassigned',
            status: c.status,
            createdAt: c.createdAt
        }))
    });
});

/* =====================
   OFFICER PERFORMANCE ANALYTICS
   ===================== */
exports.getAnalytics = asyncHandler(async (req, res) => {
    // 1. Identify Officer Profile mapping to this login
    const officerProfile = await Officer.findOne({ login_id: req.user._id });

    if (!officerProfile) {
        return res.status(404).json({ message: "Officer profile not found." });
    }

    // Build secure scoping query
    const scopingOr = [{ officer_id: officerProfile._id }];
    if (officerProfile.department) {
        const deptObj = await Department.findOne({ name: officerProfile.department });
        if (deptObj) {
            scopingOr.push({ departmentId: deptObj._id });
        }
    }
    const baseQuery = { $or: scopingOr };

    // 2. Fetch raw totals for ratios
    const totalAssigned = await Complaint.countDocuments(baseQuery);

    const activeCount = await Complaint.countDocuments({
        ...baseQuery,
        status: { $nin: ['RESOLVED', 'REJECTED'] }
    });

    const resolvedCount = await Complaint.countDocuments({
        ...baseQuery,
        status: { $in: ['RESOLVED'] }
    });

    const closureRate = totalAssigned > 0 ? (resolvedCount / totalAssigned) * 100 : 0;

    // 3. Calculate Average Resolution Time
    // Using an aggregation to compute the average time difference if 'updatedAt' is available
    const resolutionStats = await Complaint.aggregate([
        {
            $match: {
                ...baseQuery,
                status: { $in: ['RESOLVED'] },
                createdAt: { $exists: true },
                updatedAt: { $exists: true }
            }
        },
        {
            $project: {
                resolutionTimeMs: { $subtract: ["$updatedAt", "$createdAt"] }
            }
        },
        {
            $group: {
                _id: null,
                avgTimeMs: { $avg: "$resolutionTimeMs" }
            }
        }
    ]);

    // Convert ms to hours
    const avgResolutionTime = resolutionStats.length > 0
        ? (resolutionStats[0].avgTimeMs / (1000 * 60 * 60))
        : 0;

    // 4. Calculate 6-Month Trend using Aggregation
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1); // Start of the 6th month ago

    const trendData = await Complaint.aggregate([
        {
            $match: {
                ...baseQuery,
                createdAt: { $gte: sixMonthsAgo }
            }
        },
        {
            $group: {
                _id: {
                    year: { $year: "$createdAt" },
                    month: { $month: "$createdAt" }
                },
                count: { $sum: 1 }
            }
        },
        {
            $sort: { "_id.year": 1, "_id.month": 1 }
        }
    ]);

    // Format Trend Data to exact month names and fill gaps
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyTrend = [];

    // Generate exactly the last 6 months in order
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);

        const mYear = d.getFullYear();
        const mMonth = d.getMonth() + 1; // 1-12

        // Find if aggregation returned data for this month
        const match = trendData.find(t => t._id.year === mYear && t._id.month === mMonth);

        monthlyTrend.push({
            month: monthNames[mMonth - 1], // Array is 0-indexed
            count: match ? match.count : 0
        });
    }

    res.json({
        avgResolutionTime: parseFloat(avgResolutionTime.toFixed(2)),
        closureRate: parseFloat(closureRate.toFixed(2)),
        activeCount,
        monthlyTrend
    });
});

/* =====================
   OFFICER-LEVEL REPORTS EXPORT
   ===================== */
exports.exportReports = asyncHandler(async (req, res) => {
    // 1. Identify Officer Profile mapping to this login
    const officerProfile = await Officer.findOne({ login_id: req.user._id });

    if (!officerProfile) {
        return res.status(403).json({ message: "Access denied. Officer profile not found." });
    }

    const { status, fromDate, toDate, format } = req.query;

    // 2. Build secure scoping query
    const scopingOr = [{ officer_id: officerProfile._id }];

    // If the officer has a department string, find its ObjectId to include department-wide complaints
    if (officerProfile.department) {
        const deptObj = await Department.findOne({ name: officerProfile.department });
        if (deptObj) {
            scopingOr.push({ departmentId: deptObj._id });
        }
    }

    const query = { $or: scopingOr };

    // 3. Apply optional filters
    if (status && status !== 'All') {
        query.status = status;
    }

    if (fromDate || toDate) {
        query.createdAt = {};
        if (fromDate) query.createdAt.$gte = new Date(fromDate);
        if (toDate) {
            const endDate = new Date(toDate);
            endDate.setHours(23, 59, 59, 999);
            query.createdAt.$lte = endDate;
        }
    }

    // 4. Fetch the complaints
    const complaints = await Complaint.find(query)
        .populate('employee_id', 'name')
        .sort({ createdAt: -1 });

    if (!complaints.length) {
        return res.status(404).json({ message: "No records found matching criteria." });
    }

    // 5. Build standardized export data
    const exportData = complaints.map(c => ({
        "Complaint ID": c.complaintId || c._id.toString(),
        "Category": c.issueType || c.category || 'N/A',
        "Status": c.status || 'Pending',
        "Assigned Field Worker": c.employee_id ? c.employee_id.name : 'Unassigned',
        "Severity": c.priority || 'Medium',
        "Created Date": c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A',
        "Resolved Date": (c.status === 'RESOLVED' && c.updatedAt) ? new Date(c.updatedAt).toLocaleDateString() : 'N/A'
    }));

    // 6. Output Generation
    if (format === 'pdf') {
        const doc = new PDFDocument({ margin: 30, size: 'A4' });

        res.setHeader('Content-disposition', `attachment; filename=Officer_Report_${Date.now()}.pdf`);
        res.setHeader('Content-type', 'application/pdf');

        doc.pipe(res);

        // Header
        doc.fontSize(20).text('Department Report - Civic-Pulse', { align: 'center' });
        doc.moveDown(1);
        doc.fontSize(12).text(`Supervising Officer: ${officerProfile.name}`);
        doc.text(`Department: ${officerProfile.department || 'All'}`);
        doc.text(`Generated Date: ${new Date().toLocaleDateString()}`);
        doc.text(`Total Records: ${complaints.length}`);
        doc.moveDown(2);

        // Simple Table-like structure for PDF
        exportData.forEach((row, index) => {
            doc.fontSize(10).text(`${index + 1}. ID: ${row["Complaint ID"]} | Status: ${row["Status"]} | Category: ${row["Category"]}`);
            doc.fontSize(9).fillColor('gray').text(`Assigned to: ${row["Assigned Field Worker"]} | Logged: ${row["Created Date"]} | Severity: ${row["Severity"]}`);
            doc.moveDown(0.5);
            doc.fillColor('black');
        });

        doc.end();

    } else {
        // Default to CSV
        const json2csvParser = new Parser({ fields: Object.keys(exportData[0]) });
        const csv = json2csvParser.parse(exportData);

        res.header('Content-Type', 'text/csv');
        res.attachment(`Officer_Report_${Date.now()}.csv`);
        res.send(csv);
    }
});

/* =====================
   OFFICER SLA / OVERDUE MONITORING
   ===================== */
exports.getSlaSummary = asyncHandler(async (req, res) => {
    // 1. Identify Officer Profile mapping to this login
    const officerProfile = await Officer.findOne({ login_id: req.user._id });

    if (!officerProfile) {
        return res.status(403).json({ message: "Access denied. Officer profile not found." });
    }

    const SLA_DAYS = 3;
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - SLA_DAYS);

    // Build secure scoping query
    const scopingOr = [{ officer_id: officerProfile._id }];
    if (officerProfile.department) {
        const deptObj = await Department.findOne({ name: officerProfile.department });
        if (deptObj) {
            scopingOr.push({ departmentId: deptObj._id });
        }
    }
    const baseQuery = { $or: scopingOr };

    // 2. Query total active (not resolved) complaints assigned to this officer
    const activeQuery = {
        ...baseQuery,
        status: { $nin: ['RESOLVED', 'REJECTED'] }
    };

    const totalActive = await Complaint.countDocuments(activeQuery);

    // 3. Query Overdue active complaints (older than SLA threshold)
    const overdueQuery = {
        ...activeQuery,
        createdAt: { $lt: thresholdDate }
    };

    const overdueCount = await Complaint.countDocuments(overdueQuery);

    // 4. Query High Severity Overdue active complaints
    const highSeverityOverdueQuery = {
        ...overdueQuery,
        priority: { $in: ['High', 'Critical'] }
    };

    const highSeverityOverdue = await Complaint.countDocuments(highSeverityOverdueQuery);

    // 5. Return JSON mapping exactly what the UI needs
    res.json({
        totalActive,
        overdueCount,
        highSeverityOverdue,
        slaThresholdDays: SLA_DAYS
    });
});

/* =====================
   OFFICER ACTIVITY LOG
   ===================== */
exports.getActivityLog = asyncHandler(async (req, res) => {
    // 1. Identify Officer Profile
    const officerProfile = await Officer.findOne({ login_id: req.user._id });

    if (!officerProfile) {
        return res.status(403).json({ message: "Access denied. Officer profile not found." });
    }

    // 2. Build secure scoping query for complaints
    const scopingOr = [{ officer_id: officerProfile._id }];

    if (officerProfile.department) {
        const deptObj = await Department.findOne({ name: officerProfile.department });
        if (deptObj) {
            scopingOr.push({ departmentId: deptObj._id });
        }
    }

    // Find all complaints belonging to this officer/department
    const complaints = await Complaint.find({ $or: scopingOr }).select('_id');
    const complaintIds = complaints.map(c => c._id);

    if (complaintIds.length === 0) {
        return res.status(200).json([]); // No complaints, no activity
    }

    // 3. Query ActivityLog for these complaints
    const logs = await ActivityLog.find({ complaintId: { $in: complaintIds } })
        .sort({ timestamp: -1 })
        .limit(20)
        .populate('complaintId', 'complaintId issueType category status');

    // 4. Transform for frontend consumption
    const formattedLogs = logs.map(log => {
        // Handle potentially missing populated complaint
        const shortId = log.complaintId ? (log.complaintId.complaintId || log.complaintId._id.toString().substring(0, 8).toUpperCase()) : 'DELETED';
        const category = log.complaintId ? (log.complaintId.issueType || log.complaintId.category || 'General') : 'N/A';

        return {
            _id: log._id,
            complaintId: log.complaintId ? log.complaintId._id : null,
            complaintShortId: shortId,
            complaintCategory: category,
            actionType: log.actionType,
            performedByName: log.performedByName,
            performedRole: log.performedRole,
            remarks: log.remarks,
            newStatus: log.newStatus,
            timestamp: log.createdAt || log.timestamp
        };
    });

    res.status(200).json(formattedLogs);
});

/* =====================
   OFFICER COMPLAINT DETAIL
   ===================== */
exports.getComplaintDetail = asyncHandler(async (req, res) => {
    // 1. Identify Officer Profile mapping to this login
    const officerProfile = await Officer.findOne({ login_id: req.user._id });

    if (!officerProfile) {
        return res.status(403).json({ message: "Access denied. Officer profile not found." });
    }

    const complaintId = req.params.id;

    // 2. Fetch complaint and populate
    const lookup = [{ complaintId }];
    if (mongoose.Types.ObjectId.isValid(complaintId)) {
        lookup.unshift({ _id: complaintId });
    }

    const complaint = await Complaint.findOne({ $or: lookup })
        .populate('citizenId', 'name email phone')
        .populate('employee_id', 'name phone isAvailable isActive')
        .populate('departmentId', 'name');

    if (!complaint) {
        return res.status(404).json({ message: "Complaint not found" });
    }

    // 3. Security Check: Officer must belong to the same department as the complaint, or be explicitly assigned to it
    let isAuthorized = false;

    // Check direct assignment
    if (complaint.officer_id && complaint.officer_id.toString() === officerProfile._id.toString()) {
        isAuthorized = true;
    }
    // Check department level matching
    else if (officerProfile.department) {
        const deptObj = await Department.findOne({ name: officerProfile.department });
        if (deptObj && complaint.departmentId && deptObj._id.toString() === complaint.departmentId._id.toString()) {
            isAuthorized = true;
        }
    }

    if (!isAuthorized) {
        return res.status(403).json({ message: "Access denied. Complaint outside of officer's jurisdiction." });
    }

    // 4. Transform complaint to desired structure
    const timeline = [];

    // Always start with Reported
    if (complaint.createdAt) {
        timeline.push({ status: 'REPORTED', date: complaint.createdAt });
    }

    const currentStatus = complaint.status;
    const updatedAt = complaint.updatedAt;

    // Ordered sequence of Canonical States
    const stateSequence = ['REPORTED', 'ASSIGNED', 'IN_PROGRESS', 'VERIFICATION_PENDING', 'RESOLVED'];
    const currentIndex = stateSequence.indexOf(currentStatus);

    // If active, backfill everything leading up to it
    if (currentIndex >= 1 || currentStatus === 'REJECTED') {
        // Find assigned timeline
        const assignedLog = null; // Idealy query ActivityLog. For now, estimate or rely on last update if match
        timeline.push({ status: 'ASSIGNED', date: (currentStatus === 'ASSIGNED' ? updatedAt : complaint.createdAt) });
    }

    if (currentIndex >= 2) {
        timeline.push({ status: 'IN_PROGRESS', date: (currentStatus === 'IN_PROGRESS' ? updatedAt : complaint.createdAt) });
    }

    if (currentIndex >= 3 || complaint.afterImageUrl) {
        timeline.push({ status: 'VERIFICATION_PENDING', date: (currentStatus === 'VERIFICATION_PENDING' ? updatedAt : complaint.createdAt) });
    }

    if (currentStatus === 'RESOLVED') {
        timeline.push({ status: 'RESOLVED', date: complaint.resolvedAt || updatedAt });
    } else if (currentStatus === 'REJECTED') {
        timeline.push({ status: 'REJECTED', date: updatedAt });
    }

    // Sort timeline by date safely
    timeline.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.status(200).json({
        success: true,
        complaint: {
            id: complaint._id,
            complaintId: complaint.complaintId || complaint._id.toString().substring(0, 8).toUpperCase(),
            category: complaint.issueType || complaint.category || 'General',
            description: complaint.description,
            status: complaint.status,
            department: complaint.departmentId ? complaint.departmentId.name : 'Unknown',
            createdAt: complaint.createdAt,
            location: {
                address: complaint.address || complaint.report_location,
                lat: complaint.report_latitude || (complaint.location && complaint.location.coordinates ? complaint.location.coordinates[1] : null),
                lng: complaint.report_longitude || (complaint.location && complaint.location.coordinates ? complaint.location.coordinates[0] : null)
            },
            beforeImage: complaint.beforeImageUrl,
            afterImage: complaint.afterImageUrl,
            verificationStatus: complaint.verificationStatus,
            resolutionMetadata: complaint.resolutionMetadata || null,
            verificationResults: {
                status: complaint.verificationStatus,
                labels: complaint.detectedLabels || [],
                trustMetadata: complaint.trustMetadata || null
            },
            officerRemarks: complaint.officerRemarks,
            assignedFieldWorker: complaint.employee_id ? {
                id: complaint.employee_id._id,
                name: complaint.employee_id.name,
                phone: complaint.employee_id.phone,
                isActive: complaint.employee_id.isActive,
                status: complaint.employee_id.isAvailable ? 'Available' : 'Busy'
            } : null,
            reportedBy: complaint.citizenId ? {
                id: complaint.citizenId._id,
                name: complaint.citizenId.name,
                email: complaint.citizenId.email,
                phone: complaint.citizenId.phone
            } : null,
            timeline
        }
    });
});
