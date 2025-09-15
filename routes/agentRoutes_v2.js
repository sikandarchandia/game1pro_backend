import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { searchAgentV2, addCoinsV2, getCoinHistoryV2 } 
  from "../controllers/agentController_v2.js";

const router = express.Router();

// ✅ Search user by userNumber
router.get("/search/:userNumber", protect, searchAgentV2);

// ✅ Transfer coins from agent → user
router.post("/add-coins", protect, addCoinsV2);

// ✅ Get user’s coin history
router.get("/history/:id", protect, getCoinHistoryV2);

export default router;
