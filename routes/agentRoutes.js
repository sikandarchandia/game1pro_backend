import express from "express";
import User from "../models/User.js";
import AgentCoinHistory from "../models/AgentCoinHistory.js"; // Correct model

const router = express.Router();

// ✅ Fetch all agents
router.get("/agents", async (req, res) => {
  try {
    const agents = await User.find({ role: "agent" });
    res.json({ success: true, agents });
  } catch (error) {
    console.error("Error fetching agents:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ Fetch user by userNumber
router.get("/agents/search/:userNumber", async (req, res) => {
  try {
    const user = await User.findOne({
      userNumber: Number(req.params.userNumber),
    });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    res.json({ success: true, user });
  } catch (err) {
    console.error("Search user error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ Add coins to user & save history
router.post("/add-coins", async (req, res) => {
  try {
    let { userNumber, amount } = req.body;

    if (!userNumber || !amount) {
      return res.status(400).json({
        success: false,
        message: "UserNumber and amount are required",
      });
    }

    userNumber = Number(userNumber);
    amount = Number(amount);

    if (isNaN(userNumber) || isNaN(amount)) {
      return res.status(400).json({ success: false, message: "Invalid user number or amount" });
    }

    const user = await User.findOne({ userNumber });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Add coins
    user.coins = (user.coins || 0) + amount;
    await user.save();

    // Save history
    await AgentCoinHistory.create({
      userNumber: user.userNumber,
      username: user.username,
      coinsAdded: amount,
    });

    res.json({ success: true, user });
  } catch (err) {
    console.error("Add coins error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get coin history of a user
router.get("/coin-history/:userNumber", async (req, res) => {
  try {
    const { userNumber } = req.params;

    if (!userNumber) {
      return res.status(400).json({ success: false, message: "UserNumber is required" });
    }

    const history = await AgentCoinHistory.find({ userNumber: Number(userNumber) })
      .sort({ createdAt: -1 }); // latest first

    res.json({ success: true, history });
  } catch (err) {
    console.error("Fetch coin history error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Fetch all coin addition history
router.get("/agents/history-all", async (req, res) => {
  try {
    const history = await AgentCoinHistory.find().sort({ createdAt: -1 });
    res.json({ success: true, history });
  } catch (err) {
    console.error("Fetch all history error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ Toggle role user ↔ agent
router.put("/agents/:id/make", async (req, res) => {
  try {
    const { role } = req.body;
    if (!role || !["agent", "user"].includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    );
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    res.json({ success: true, user, message: `Role updated to ${role}` });
  } catch (error) {
    console.error("Error updating role:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
