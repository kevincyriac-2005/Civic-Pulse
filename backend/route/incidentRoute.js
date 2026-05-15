const express = require('express');
const router = express.Router();
const incidentController = require('../controller/incidentController');
const { protect } = require('../middleware/authMiddleware');

// All incident routes should be protected
router.post('/', protect, incidentController.createIncident);
router.get('/', protect, incidentController.getIncidents);

module.exports = router;
