// controllers/withdrawController.js
import User from "../models/User.js";

export const createWithdrawal = async (req, res) => {
  try {
    const { amount, account } = req.body;
    const userId = req.params.userId;

    if (!amount || !account) return res.status(400).json({ success: false, message: "Amount and account required" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (amount > user.coins) return res.status(400).json({ success: false, message: "Insufficient coins" });

    // Deduct coins
    user.coins -= amount;

    // Add withdrawal to user
    user.withdrawals.push({ amount, account });

    await user.save();

    res.status(201).json({ success: true, user });
  } catch (err) {
    console.error("Withdraw Error:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};


export const getWithdrawals = async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    res.json({ success: true, withdrawals: user.withdrawals });
  } catch (err) {
    console.error("Get Withdrawals Error:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};
