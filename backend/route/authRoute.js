const express = require("express");
const router = express.Router();
const authController = require("../controller/authController");

// Register (Frontend: /auth/register)
router.post("/register", authController.register);

// Login (Frontend: /auth/login)
router.post("/login", authController.login);

// Update login via email/username
router.put("/update/email/:username", authController.updateLoginByEmail);

module.exports = router;
