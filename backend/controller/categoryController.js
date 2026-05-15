const Category = require('../model/Category');
const asyncHandler = require('../middleware/asyncHandler');

/* =====================
   CREATE CATEGORY
   ===================== */
exports.createCategory = asyncHandler(async (req, res) => {
    const { name, description, department } = req.body;

    const exists = await Category.findOne({ name });
    if (exists) {
        return res.status(400).json({ message: 'Category already exists' });
    }

    const category = await Category.create({
        name,
        description,
        department
    });

    res.status(201).json({
        success: true,
        category
    });
});

/* =====================
   GET ALL CATEGORIES
   ===================== */
exports.getCategories = asyncHandler(async (req, res) => {
    const categories = await Category.find().sort({ name: 1 });
    res.json({
        success: true,
        data: categories
    });
});

/* =====================
   UPDATE CATEGORY
   ===================== */
exports.updateCategory = asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id);

    if (!category) {
        return res.status(404).json({ message: 'Category not found' });
    }

    category.name = req.body.name || category.name;
    category.description = req.body.description || category.description;
    category.department = req.body.department || category.department;

    const updatedCategory = await category.save();

    res.json({
        success: true,
        category: updatedCategory
    });
});

/* =====================
   DELETE CATEGORY
   ===================== */
exports.deleteCategory = asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id);

    if (!category) {
        return res.status(404).json({ message: 'Category not found' });
    }

    await category.deleteOne();

    res.json({
        success: true,
        message: 'Category deleted'
    });
});
