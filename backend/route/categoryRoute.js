const express = require('express');
const router = express.Router();
const categoryController = require('../controller/categoryController');
// const { protect } = require('../middleware/authMiddleware'); // Uncomment if protection needed

router.route('/')
    .get(categoryController.getCategories)
    .post(categoryController.createCategory); // Add protect?

router.route('/:id')
    .put(categoryController.updateCategory) // Add protect?
    .delete(categoryController.deleteCategory); // Add protect?

module.exports = router;
