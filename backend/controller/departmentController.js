const Department = require('../model/Department');
const asyncHandler = require('../middleware/asyncHandler');

exports.createDepartment = asyncHandler(async (req, res) => {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });
    const exists = await Department.findOne({ name });
    if (exists) return res.status(400).json({ message: 'Department already exists' });
    const dept = await Department.create({ name, description });
    res.status(201).json({
        success: true,
        data: dept
    });
});

exports.getDepartments = asyncHandler(async (req, res) => {
    const depts = await Department.find().sort({ createdAt: -1 });
    res.json({
        success: true,
        data: depts
    });
});

exports.getDepartmentById = asyncHandler(async (req, res) => {
    const dept = await Department.findById(req.params.id);
    if (!dept) return res.status(404).json({ message: 'Department not found' });
    res.json(dept);
});

exports.updateDepartment = asyncHandler(async (req, res) => {
    const dept = await Department.findById(req.params.id);
    if (!dept) return res.status(404).json({ message: 'Department not found' });
    const { name, description } = req.body;
    if (name) dept.name = name;
    if (description !== undefined) dept.description = description;
    await dept.save();
    res.json({
        success: true,
        data: dept
    });
});

exports.deleteDepartment = asyncHandler(async (req, res) => {
    const dept = await Department.findById(req.params.id);
    if (!dept) return res.status(404).json({ message: 'Department not found' });
    await dept.deleteOne();
    res.json({
        success: true,
        message: 'Department deleted'
    });
});
