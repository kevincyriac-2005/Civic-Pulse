const express = require('express');
const router = express.Router();
const departmentController = require('../controller/departmentController');
// const { protect } = require('../middleware/authMiddleware');

router.route('/')
    .get(departmentController.getDepartments)
    .post(departmentController.createDepartment);

router.route('/:id')
    .get(departmentController.getDepartmentById)
    .put(departmentController.updateDepartment)
    .delete(departmentController.deleteDepartment);

module.exports = router;
