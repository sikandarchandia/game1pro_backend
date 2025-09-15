import express from "express";
import User from "../models/User.js";
import RemoveCoinHistory from "../models/RemoveCoinHistory.js";

const router = express.Router();

// Fetch user by userNumber
router.get("/search/:userNumber", async (req, res) => {
  try {
    const userNumber = Number(req.params.userNumber);
    const user = await User.findOne({ userNumber });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    res.json({ success: true, user });
  } catch (err) {
    console.error("Fetch user error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/remove", async (req, res) => {
  try {
    const { userNumber, amount } = req.body;
    if (!amount || amount <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid amount" });
    }

    const user = await User.findOne({ userNumber });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    if (amount > user.coins) {
      return res
        .status(400)
        .json({ success: false, message: "Amount exceeds user's coins" });
    }

    // Safely decrement coins without validating entire document
    await User.updateOne({ userNumber }, { $inc: { coins: -amount } });

    // Save remove coin history
    const history = await RemoveCoinHistory.create({
      userNumber: user.userNumber,
      username: user.username,
      coinsRemoved: amount,
    });

    res.json({
      success: true,
      user: { ...user.toObject(), coins: user.coins - amount },
      history,
    });
  } catch (err) {
    console.error("Remove coins error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Fetch remove coin history
router.get("/history-all", async (req, res) => {
  try {
    const history = await RemoveCoinHistory.find().sort({ createdAt: -1 });
    res.json({ success: true, history });
  } catch (err) {
    console.error("Fetch history error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});
export default router;
