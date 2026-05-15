const express = require('express');
const router = express.Router();
const complaintController = require('../controller/complaintController');
const { protect } = require('../middleware/authMiddleware');

// All routes are protected
router.use(protect);

router.post('/', complaintController.createComplaint);
router.get('/map', complaintController.getMapComplaints);
router.get('/', complaintController.getComplaints);
router.put('/assign', complaintController.assignComplaint);
router.get('/:id', complaintController.getCitizenComplaintById);
router.put('/:id/withdraw', complaintController.withdrawComplaint);
router.put('/:id/status', complaintController.updateComplaintStatus);
router.put('/:id/review', complaintController.reviewComplaintEvidence);

module.exports = router;
