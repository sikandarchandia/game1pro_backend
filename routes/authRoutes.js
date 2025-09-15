import express from "express";
import {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  googleLogin,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/auth/google", googleLogin);
router.post("/signup", registerUser);
router.post("/login", loginUser);
router.get("/profile", getProfile);
router.put("/profile/update", updateProfile);

export default router;
