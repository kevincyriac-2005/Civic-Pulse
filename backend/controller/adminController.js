const Complaint = require('../model/Complaint');
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');
// Ensure it tracks both standard complaints and possible incidents, but for now we focus on Complaints.

/* =====================
   GET ALL COMPLAINTS (Admin)
   ===================== */
exports.getAllComplaints = async (req, res) => {
    try {
        if (req.user.usertype !== 'admin') {
            return res.status(403).json({ message: "Forbidden: Admin access required." });
        }

        const complaints = await Complaint.find()
            .sort({ createdAt: -1 })
            .populate('officer_id', 'name department')
            .populate('employee_id', 'name')
            .populate('citizenId', 'name')
            .populate('departmentId', 'name');

        res.status(200).json({ success: true, complaints });
    } catch (error) {
        console.error("Error fetching admin complaints:", error);
        res.status(500).json({ message: "Server error fetching complaints." });
    }
};

/* =====================
   GET SINGLE COMPLAINT (Admin)
   ===================== */
exports.getComplaintById = async (req, res) => {
    try {
        if (req.user.usertype !== 'admin') {
            return res.status(403).json({ message: "Forbidden: Admin access required." });
        }

        const complaint = await Complaint.findById(req.params.id)
            .populate('officer_id', 'name department')
            .populate('employee_id', 'name')
            .populate('citizenId', 'name email')
            .populate('departmentId', 'name');

        if (!complaint) {
            return res.status(404).json({ message: "Complaint not found." });
        }

        res.status(200).json({ success: true, complaint });
    } catch (error) {
        console.error("Error fetching complaint detail:", error);
        res.status(500).json({ message: "Server error fetching complaint." });
    }
};

exports.getHeatmapData = async (req, res) => {
    try {
        // Find all complaints that have valid point locations
        const complaints = await Complaint.find({
            'location.coordinates': { $exists: true, $not: { $size: 0 } },
            'location.type': 'Point'
        });

        const heatmapData = complaints.map(complaint => {
            // Map Priority literal to 1-5 severity scale for the WebGL Analytics
            let severityNum = 3; // Default Medium
            if (complaint.priority === 'High') severityNum = 5;
            if (complaint.priority === 'Low') severityNum = 2;

            return {
                _id: complaint._id,
                title: complaint.title, // Pass title for marker tooltip
                location: {
                    coordinates: complaint.location.coordinates
                },
                severity: severityNum
            };
        });

        res.status(200).json(heatmapData);
    } catch (error) {
        console.error("Error fetching heatmap geospatial data:", error);
        res.status(500).json({ message: "Server error fetching analytics" });
    }
};

exports.exportComplaints = async (req, res) => {
    try {
        // Enforce RBAC Double Check natively inside the controller (Middleware also checks this)
        if (req.user.usertype !== 'admin') {
            return res.status(403).json({ message: "Forbidden: Export privileges require Admin Role." });
        }

        const { status, department, fromDate, toDate, format = 'csv' } = req.query;

        // Build highly dynamic Filter pipeline
        const query = {};

        if (status && status !== 'All') {
            query.status = status;
        }

        if (department && department !== 'All') {
            // Using regex to allow relaxed case matching against Departments
            query.departmentId = department; // Depends on how frontend passes it, if they pass ID or Name we need to adjust
        }

        if (fromDate || toDate) {
            query.createdAt = {};
            if (fromDate) query.createdAt.$gte = new Date(fromDate);
            if (toDate) {
                const endOfDay = new Date(toDate);
                endOfDay.setHours(23, 59, 59, 999);
                query.createdAt.$lte = endOfDay;
            }
        }

        // Deep populate to get the textual representations if stored as ObjectIds
        const complaints = await Complaint.find(query)
            .populate('departmentId', 'name')
            .populate('officer_id', 'name')
            .sort({ createdAt: -1 });

        if (!complaints || complaints.length === 0) {
            return res.status(404).json({ message: "No complaints found for selected filters." });
        }

        if (format === 'csv') {
            const fields = [
                { label: 'Complaint ID', value: 'complaintId' },
                { label: 'Category / Issue Type', value: 'issueType' },
                { label: 'Department', value: (row) => row.departmentId ? row.departmentId.name : 'Unassigned' },
                { label: 'Status', value: 'status' },
                { label: 'Latitude', value: (row) => row.location && row.location.coordinates ? row.location.coordinates[1] : 'N/A' },
                { label: 'Longitude', value: (row) => row.location && row.location.coordinates ? row.location.coordinates[0] : 'N/A' },
                { label: 'Assigned Officer', value: (row) => row.officer_id ? row.officer_id.name : 'Pending' },
                { label: 'Trust Level', value: 'verificationStatus' },
                { label: 'Created Date', value: (row) => new Date(row.createdAt).toLocaleDateString() }
            ];

            const json2csvParser = new Parser({ fields });
            const csv = json2csvParser.parse(complaints);

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="complaint-report.csv"');
            return res.status(200).send(csv);
        } else if (format === 'pdf') {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename="complaint-report.pdf"');

            const doc = new PDFDocument({ margin: 30, size: 'A4' });

            // Pipe its output to the Express response directly
            doc.pipe(res);

            // Add Header
            doc.fontSize(20).text('Civic-Pulse Complaint Report', { align: 'center' });
            doc.moveDown();

            doc.fontSize(12).text(`Generated Date: ${new Date().toLocaleString()}`);
            doc.text(`Total Records: ${complaints.length}`);
            doc.text(`Status Filter: ${status || 'All'}`);
            doc.text(`Department Filter: ${department || 'All'}`);
            doc.moveDown(2);

            // Build simple table layout for each complaint
            complaints.forEach((comp, idx) => {
                doc.fontSize(12).font('Helvetica-Bold').text(`Complaint #${idx + 1}: ${comp.complaintId || comp._id}`);
                doc.fontSize(10).font('Helvetica').text(`Title: ${comp.title || 'N/A'}`);
                doc.text(`Category: ${comp.issueType || 'N/A'}`);
                doc.text(`Department: ${comp.departmentId ? comp.departmentId.name : 'Unassigned'}`);
                doc.text(`Status: ${comp.status}`);
                doc.text(`Officer: ${comp.officer_id ? comp.officer_id.name : 'Pending'}`);
                doc.text(`Date: ${new Date(comp.createdAt).toLocaleDateString()}`);
                doc.moveDown(1);
            });

            // Finalize PDF file
            doc.end();
        } else {
            return res.status(400).json({ message: "Invalid format requested. Valid options: csv, pdf" });
        }

    } catch (error) {
        console.error("Error generating complaint export:", error);
        res.status(500).json({ message: "Server error generating report." });
    }
};
exports.getDashboardSummary = async (req, res) => {
    try {
        if (req.user.usertype !== 'admin') {
            return res.status(403).json({ message: "Forbidden: Admin access required." });
        }

        const Complaint = require('../model/Complaint');
        const Officer = require('../model/Officer');
        const Citizen = require('../model/Citizen');
        const FieldWorker = require('../model/FieldWorker');
        const Department = require('../model/Department');

        // --- Complaint Counts ---
        const [
            totalComplaints,
            openCount,
            inProgressCount,
            resolvedCount,
            rejectedCount,
            verificationPendingCount,
            activeOfficers,
            totalCitizens,
            totalFieldWorkers,
        ] = await Promise.all([
            Complaint.countDocuments(),
            Complaint.countDocuments({ status: 'REPORTED' }),
            Complaint.countDocuments({ status: 'IN_PROGRESS' }),
            Complaint.countDocuments({ status: 'RESOLVED' }),
            Complaint.countDocuments({ status: 'REJECTED' }),
            Complaint.countDocuments({ status: 'VERIFICATION_PENDING' }),
            Officer.countDocuments(),
            Citizen.countDocuments(),
            FieldWorker.countDocuments(),
        ]);

        // --- Department Load ---
        const departments = await Department.find({}, 'name');
        const departmentStats = await Promise.all(
            departments.map(async (dept) => {
                const count = await Complaint.countDocuments({ departmentId: dept._id });
                return { name: dept.name, count };
            })
        );
        // Sort by count desc, take top 6
        departmentStats.sort((a, b) => b.count - a.count);

        // --- Recent 5 Complaints ---
        const recentDocs = await Complaint.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('departmentId', 'name')
            .lean();

        const recentComplaints = recentDocs.map(c => ({
            id: c.complaintId || c._id,
            category: c.issueType || 'General',
            location: c.address || c.report_location || (c.location?.coordinates
                ? `Lat: ${c.location.coordinates[1]?.toFixed(4)}, Lng: ${c.location.coordinates[0]?.toFixed(4)}`
                : 'Unknown'),
            status: c.status,
            createdTime: c.createdAt,
        }));

        res.status(200).json({
            success: true,
            data: {
                totalComplaints,
                open: openCount,
                assigned: await Complaint.countDocuments({ status: 'ASSIGNED' }),
                inProgress: inProgressCount,
                resolved: resolvedCount,
                rejected: rejectedCount,
                verificationPending: verificationPendingCount,
                activeOfficers,
                totalCitizens,
                totalFieldWorkers,
                totalUsers: totalCitizens + activeOfficers + totalFieldWorkers,
                departmentStats,
                recentComplaints,
                systemHealth: {
                    apiStatus: 'online',
                    lastSync: new Date().toISOString()
                }
            }
        });

    } catch (error) {
        console.error("Dashboard summary error:", error);
        res.status(500).json({ message: "Server error fetching dashboard summary." });
    }
};

exports.getAnalytics = async (req, res) => {
    try {
        if (req.user.usertype !== 'admin') {
            return res.status(403).json({ message: "Forbidden: Admin access required." });
        }

        const range = req.query.range === '30d' ? '30d' : '7d';
        const startDate = range === '30d'
            ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

        const [
            totalAgg,
            escalatedAgg,
            avgResolutionAgg,
            resolvedStatsAgg,
            trendAgg,
            categoryAgg
        ] = await Promise.all([
            Complaint.aggregate([
                { $match: { createdAt: { $gte: startDate } } },
                { $count: 'count' }
            ]),
            Complaint.aggregate([
                {
                    $match: {
                        createdAt: { $gte: startDate },
                        $or: [
                            { verificationStatus: 'Flagged' },
                            { status: 'VERIFICATION_PENDING' }
                        ]
                    }
                },
                { $count: 'count' }
            ]),
            Complaint.aggregate([
                {
                    $match: {
                        createdAt: { $gte: startDate },
                        status: 'RESOLVED',
                        resolvedAt: { $exists: true, $ne: null }
                    }
                },
                {
                    $project: {
                        resolutionMs: { $subtract: ['$resolvedAt', '$createdAt'] }
                    }
                },
                {
                    $group: {
                        _id: null,
                        avgResolutionMs: { $avg: '$resolutionMs' }
                    }
                }
            ]),
            Complaint.aggregate([
                {
                    $match: {
                        createdAt: { $gte: startDate },
                        status: 'RESOLVED'
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalResolved: { $sum: 1 },
                        totalResolvedWithTimestamp: {
                            $sum: {
                                $cond: [
                                    { $ne: [{ $ifNull: ['$resolvedAt', null] }, null] },
                                    1,
                                    0
                                ]
                            }
                        },
                        onTimeCount: {
                            $sum: {
                                $cond: [
                                    {
                                        $and: [
                                            { $ne: [{ $ifNull: ['$resolvedAt', null] }, null] },
                                            {
                                                $lte: [
                                                    { $subtract: ['$resolvedAt', '$createdAt'] },
                                                    sevenDaysMs
                                                ]
                                            }
                                        ]
                                    },
                                    1,
                                    0
                                ]
                            }
                        },
                        verifiedCount: {
                            $sum: {
                                $cond: [
                                    { $eq: ['$verificationStatus', 'Verified'] },
                                    1,
                                    0
                                ]
                            }
                        }
                    }
                }
            ]),
            range === '30d'
                ? Complaint.aggregate([
                    { $match: { createdAt: { $gte: startDate } } },
                    {
                        $group: {
                            _id: {
                                isoWeekYear: { $isoWeekYear: '$createdAt' },
                                isoWeek: { $isoWeek: '$createdAt' }
                            },
                            count: { $sum: 1 }
                        }
                    },
                    {
                        $sort: {
                            '_id.isoWeekYear': 1,
                            '_id.isoWeek': 1
                        }
                    }
                ])
                : Complaint.aggregate([
                    { $match: { createdAt: { $gte: startDate } } },
                    {
                        $group: {
                            _id: {
                                $dateToString: {
                                    format: '%Y-%m-%d',
                                    date: '$createdAt'
                                }
                            },
                            count: { $sum: 1 }
                        }
                    },
                    { $sort: { _id: 1 } }
                ]),
            Complaint.aggregate([
                { $match: { createdAt: { $gte: startDate } } },
                {
                    $group: {
                        _id: { $ifNull: ['$issueType', 'Uncategorized'] },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1, _id: 1 } },
                { $limit: 6 },
                {
                    $project: {
                        _id: 0,
                        name: '$_id',
                        count: 1
                    }
                }
            ])
        ]);

        const total = totalAgg[0]?.count || 0;
        const escalated = escalatedAgg[0]?.count || 0;
        const avgResolutionMs = avgResolutionAgg[0]?.avgResolutionMs || 0;
        const resolvedStats = resolvedStatsAgg[0] || {
            totalResolved: 0,
            totalResolvedWithTimestamp: 0,
            onTimeCount: 0,
            verifiedCount: 0
        };

        const avgResolution = Number((avgResolutionMs / (1000 * 60 * 60)).toFixed(1));
        const escalationRate = total > 0 ? Number(((escalated / total) * 100).toFixed(1)) : 0;
        const onTimeResolutionRate = resolvedStats.totalResolvedWithTimestamp > 0
            ? Number(((resolvedStats.onTimeCount / resolvedStats.totalResolvedWithTimestamp) * 100).toFixed(1))
            : 0;
        const complianceScore = resolvedStats.totalResolved > 0
            ? Number(((resolvedStats.verifiedCount / resolvedStats.totalResolved) * 100).toFixed(1))
            : 0;

        let trendData = [];

        if (range === '30d') {
            const trendMap = new Map(
                trendAgg.map(item => [
                    `${item._id.isoWeekYear}-W${String(item._id.isoWeek).padStart(2, '0')}`,
                    item.count
                ])
            );

            const weekStarts = [];
            const current = new Date(startDate);
            current.setHours(0, 0, 0, 0);
            current.setDate(current.getDate() - ((current.getDay() + 6) % 7));

            const end = new Date();
            end.setHours(0, 0, 0, 0);

            while (current <= end) {
                weekStarts.push(new Date(current));
                current.setDate(current.getDate() + 7);
            }

            trendData = weekStarts.map(weekStart => {
                const isoData = getIsoWeekParts(weekStart);
                const key = `${isoData.isoWeekYear}-W${String(isoData.isoWeek).padStart(2, '0')}`;

                return {
                    label: `Week ${isoData.isoWeek}`,
                    count: trendMap.get(key) || 0
                };
            });
        } else {
            const trendMap = new Map(trendAgg.map(item => [item._id, item.count]));
            const current = new Date(startDate);
            current.setHours(0, 0, 0, 0);
            const end = new Date();
            end.setHours(0, 0, 0, 0);

            while (current <= end) {
                const key = current.toISOString().slice(0, 10);
                trendData.push({
                    label: key,
                    count: trendMap.get(key) || 0
                });
                current.setDate(current.getDate() + 1);
            }
        }

        res.status(200).json({
            avgResolution,
            escalationRate,
            onTimeResolutionRate,
            complianceScore,
            trendData,
            categoryData: categoryAgg
        });
    } catch (error) {
        console.error("Admin analytics error:", error);
        res.status(500).json({ error: 'Failed to compute analytics' });
    }
};

function getIsoWeekParts(date) {
    const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNumber = utcDate.getUTCDay() || 7;
    utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNumber);
    const isoWeekYear = utcDate.getUTCFullYear();
    const yearStart = new Date(Date.UTC(isoWeekYear, 0, 1));
    const isoWeek = Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7);

    return { isoWeekYear, isoWeek };
}

/* =====================
   GET ADMIN PROFILE
   ===================== */
exports.getAdminProfile = async (req, res) => {
    try {
        const Login = require('../model/Login');
        const admin = await Login.findById(req.user.id).select('-password');
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found.' });
        }
        res.status(200).json({
            firstName: admin.firstName || '',
            lastName: admin.lastName || '',
            username: admin.username || '',
            usertype: admin.usertype || '',
            status: admin.status || '',
            createdAt: admin.createdAt || null,
        });
    } catch (error) {
        console.error('Error fetching admin profile:', error);
        res.status(500).json({ message: 'Server error fetching profile.' });
    }
};

/* =====================
   UPDATE ADMIN PROFILE
   ===================== */
exports.updateAdminProfile = async (req, res) => {
    try {
        const Login = require('../model/Login');
        const bcrypt = require('bcryptjs');

        const { firstName, lastName, currentPassword, newPassword } = req.body;

        const hasNameUpdate = firstName !== undefined || lastName !== undefined;
        const hasPasswordUpdate = currentPassword && newPassword;

        if (!hasNameUpdate && !hasPasswordUpdate) {
            return res.status(400).json({ message: 'Nothing to update.' });
        }

        const admin = await Login.findById(req.user.id);
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found.' });
        }

        if (hasNameUpdate) {
            if (firstName !== undefined) admin.firstName = firstName;
            if (lastName !== undefined) admin.lastName = lastName;
        }

        if (hasPasswordUpdate) {
            const isMatch = await bcrypt.compare(currentPassword, admin.password);
            if (!isMatch) {
                return res.status(400).json({ message: 'Current password is incorrect.' });
            }
            admin.password = await bcrypt.hash(newPassword, 10);
        }

        await admin.save();

        res.status(200).json({
            firstName: admin.firstName || '',
            lastName: admin.lastName || '',
            username: admin.username || '',
            usertype: admin.usertype || '',
            status: admin.status || '',
            createdAt: admin.createdAt || null,
        });
    } catch (error) {
        console.error('Error updating admin profile:', error);
        res.status(500).json({ message: 'Server error updating profile.' });
    }
};

/* =====================
   GET PUBLIC STATS (Home Page)
   ===================== */
exports.getPublicStats = async (req, res) => {
    try {
        const Complaint = require('../model/Complaint');
        
        // 1. Total Complaints
        const totalComplaints = await Complaint.countDocuments();
        
        // 2. Resolved Today
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        
        const resolvedToday = await Complaint.countDocuments({
            status: 'RESOLVED',
            updatedAt: { $gte: startOfToday }
        });
        
        let resolvedTodayPercent = 0;
        if (totalComplaints > 0) {
            resolvedTodayPercent = Math.round((resolvedToday / totalComplaints) * 100);
        }
        
        // 3. Average Response Time in hours
        let avgResponseHours = 0;
        const responseStats = await Complaint.aggregate([
            { $match: { status: 'RESOLVED' } },
            { $project: { responseTimeMs: { $subtract: ['$updatedAt', '$createdAt'] } } },
            { $group: { _id: null, avgResponseMs: { $avg: '$responseTimeMs' } } }
        ]);
        
        if (responseStats.length > 0 && responseStats[0].avgResponseMs) {
            avgResponseHours = Number((responseStats[0].avgResponseMs / (1000 * 60 * 60)).toFixed(1));
        }
        
        res.status(200).json({
            totalComplaints,
            resolvedTodayPercent,
            avgResponseHours
        });
    } catch (error) {
        console.warn("Public stats error (ignoring to prevent home page fail):", error);
        res.status(200).json({
            totalComplaints: 0,
            resolvedTodayPercent: 0,
            avgResponseHours: 0
        });
    }
};
