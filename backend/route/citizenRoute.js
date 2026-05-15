const express = require("express");
const router = express.Router();
const citizenController = require("../controller/citizenController");
const { protect } = require("../middleware/authMiddleware");

/* =====================
   GET ALL CITIZENS
   ===================== */
router.get("/", citizenController.getUsers);

/* =====================
   APPROVE USER
   ===================== */
router.put("/:id/approve", citizenController.approveUser);

/* =====================
   REJECT USER
   ===================== */
router.put("/:id/reject", citizenController.rejectUser);

/* =====================
   GET CURRENT PROFILE
   ===================== */
router.get("/me", protect, citizenController.getProfile);

/* =====================
   UPDATE PROFILE
   ===================== */
router.put("/me", protect, citizenController.updateProfile);

/* =====================
   DELETE USER
   ===================== */
router.delete("/:id", citizenController.deleteUser);

module.exports = router;
