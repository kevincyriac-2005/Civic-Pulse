const express = require('express');
const router = express.Router();
const adminController = require('../controller/adminController');
const { protect } = require('../middleware/authMiddleware');

// Admin Complaint Management
router.get('/complaints', protect, adminController.getAllComplaints);
router.get('/complaints/:id', protect, adminController.getComplaintById);

// Dashboard Summary (Real-time stats)
router.get('/dashboard-summary', protect, adminController.getDashboardSummary);

// Heatmap Geodata Feed (Frontend: /api/admin/heatmap)
router.get('/heatmap', protect, adminController.getHeatmapData);
// Secure Complaint Report Export (Admin Only)
router.get('/export', protect, adminController.exportComplaints);
router.get('/analytics', protect, adminController.getAnalytics);

// Admin Profile (Settings Page)
router.get('/profile', protect, adminController.getAdminProfile);
router.put('/profile', protect, adminController.updateAdminProfile);

// Public Stats (Home Page, No Auth)
router.get('/public-stats', adminController.getPublicStats);

module.exports = router;
