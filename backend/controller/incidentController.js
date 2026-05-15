const Incident = require('../model/Incident');
const Category = require('../model/Category');
const asyncHandler = require('../middleware/asyncHandler');
const { saveImage } = require('../utils/saveImage');
// In a real implementation, we would import Google Cloud Vision client here

/* =====================
   CREATE INCIDENT (The Core Vision Logic)
   ===================== */
exports.createIncident = asyncHandler(async (req, res) => {
    const { title, description, categoryId, latitude, longitude, address } = req.body;

    let savedImageUrl;
    try {
        savedImageUrl = await saveImage(req.body.imageUrl);
    } catch (error) {
        return res.status(400).json({ error: "Invalid image input." });
    }

    // 1. INTELLIGENT ROUTING: Fetch Department from Category
    const categoryDef = await Category.findById(categoryId);
    if (!categoryDef) {
        return res.status(404).json({ message: "Invalid Category" });
    }
    const departmentStr = categoryDef.department;

    // 2. VISION TRIAGE: (Mocking Cloud Vision API for now)
    // In production, we would send 'imageUrl' to Google Vision API here.
    // Result -> tags: ['pothole', 'asphalt'], confidence: 0.98
    const mockAiTags = ['detected_issue', categoryDef.name.toLowerCase()];
    const mockConfidence = 0.95;

    // 3. GEOSPATIAL MAPPING: Construct GeoJSON
    // 4. Create the Smart Incident
    const incident = await Incident.create({
        reportedBy: req.user.profileId, // We need to ensure authMiddleware sets this correctly
        title,
        description,
        category: categoryDef.name,
        department: departmentStr,
        imageUrl: savedImageUrl,
        aiTags: mockAiTags,
        aiConfidence: mockConfidence,
        location: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)], // GeoJSON is [Long, Lat]
            address
        },
        status: 'Pending'
    });

    res.status(201).json({
        success: true,
        data: incident,
        message: "Incident reported successfully. AI Triage complete."
    });
});

/* =====================
   GET INCIDENTS (For Heatmaps & Dashboards)
   ===================== */
exports.getIncidents = asyncHandler(async (req, res) => {
    // Future: Add $near queries for Geospatial filtering
    const incidents = await Incident.find().sort({ createdAt: -1 });
    res.json(incidents);
});
