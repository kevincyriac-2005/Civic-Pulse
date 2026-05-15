const express = require('express');
const router = express.Router();
const fieldWorkerController = require('../controller/fieldWorkerController');
const { protect } = require("../middleware/authMiddleware");

router.route('/')
    .get(fieldWorkerController.getFieldWorkers)
    .post(fieldWorkerController.createFieldWorker);

// Profile Routes
router.get('/me', protect, fieldWorkerController.getProfile);
router.put('/me', protect, fieldWorkerController.updateProfile);

// Execution Dashboard Routes
router.get('/overview', protect, fieldWorkerController.getOverviewStats);
router.get('/tasks', protect, fieldWorkerController.getAssignedTasks);
router.get('/task-history', protect, fieldWorkerController.getTaskHistory);
router.get('/work-summary', protect, fieldWorkerController.getWorkSummary);
router.put('/update-status/:id', protect, fieldWorkerController.updateTaskStatus);
router.post('/upload-evidence/:id', protect, fieldWorkerController.uploadCompletionEvidence);
router.get('/task-detail/:id', protect, fieldWorkerController.getTaskDetail);

router.route('/:id')
    .put(fieldWorkerController.updateFieldWorker)
    .delete(fieldWorkerController.deleteFieldWorker);

module.exports = router;
