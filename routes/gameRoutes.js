// routes/gameRoutes.js
import express from "express";
import { protect } from "../controllers/authController.js";
import { addGameResult, getGameHistory, getAllWinHistory  } from "../controllers/gameController.js";

const router = express.Router();

// Add a game result
router.post("/add", protect, addGameResult);

// Get user game history
router.get("/history", protect, getGameHistory);
// get all win history
router.get("/winhistory", getAllWinHistory);

export default router;
