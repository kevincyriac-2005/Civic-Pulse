const express = require('express');
const router = express.Router();
const scheduleController = require('../controller/scheduleController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, scheduleController.createSchedule);
router.get('/:complaintId', protect, scheduleController.getSchedules);

module.exports = router;
