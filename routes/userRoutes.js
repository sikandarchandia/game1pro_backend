// routes/userRoutes.js
import express from "express";
import { protect } from "../controllers/authController.js";
import { getUserWithWithdrawals } from "../controllers/userController.js";
import { updatePassword } from "../controllers/userController.js";

const router = express.Router();
router.get("/profile", protect, async (req, res) => {
  try {
    res.json({ success: true, user: req.user });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});
router.get("/:userId/full", getUserWithWithdrawals); // Full user data
// ✅ password update route
router.put("/passwordUpdate/:userId", protect, updatePassword);

export default router;
