import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { addCoins_v2, getCoinHistory_v2, getAllCoinHistory_v2 } from "../controllers/coinController_v2.js";

const router = express.Router();

router.post("/add-coins-v2", protect, addCoins_v2);
router.get("/coin-history-v2/:userNumber", protect, getCoinHistory_v2);
router.get("/agents-v2/history-all", protect, getAllCoinHistory_v2);

export default router;
