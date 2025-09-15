import express from "express";
import AgentCoinHistory from "../models/AgentCoinHistory.js";

const router = express.Router();

// GET /api/agents/history/:userNumber
router.get("/:userNumber", async (req, res) => {
  try {
    const userNumber = Number(req.params.userNumber);
    const history = await AgentCoinHistory.find({ userNumber }).sort({ createdAt: -1 });
    res.json({ success: true, history });
  } catch (err) {
    console.error("Fetch history error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});
export default router;
