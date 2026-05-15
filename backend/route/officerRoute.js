const express = require('express');
const router = express.Router();
const officerController = require('../controller/officerController');
const { protect } = require("../middleware/authMiddleware");

router.route('/')
    .get(officerController.getOfficers)
    .post(officerController.createOfficer);

// Profile Routes
router.get('/me', protect, officerController.getProfile);
router.put('/me', protect, officerController.updateProfile);

// Secure Officer Dashboard Metrics
router.get('/dashboard-summary', protect, officerController.getDashboardSummary);
router.get('/sla-summary', protect, officerController.getSlaSummary);
router.get('/analytics', protect, officerController.getAnalytics);
router.get('/reports', protect, officerController.exportReports);
router.get('/activity', protect, officerController.getActivityLog);

router.get('/complaint/:id', protect, officerController.getComplaintDetail);

router.route('/:id')
    .put(officerController.updateOfficer)
    .delete(officerController.deleteOfficer);

module.exports = router;
