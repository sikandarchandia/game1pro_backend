import User from "../models/User.js";
import AgentCoinHistory from "../models/AgentCoinHistory.js";

// ✅ Add coins
export const addCoins_v2 = async (req, res) => {
  try {
    let { userNumber, amount } = req.body;
    if (!userNumber || !amount) {
      return res.status(400).json({ success: false, message: "UserNumber and amount are required" });
    }

    userNumber = Number(userNumber);
    amount = Number(amount);

    const user = await User.findOne({ userNumber });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.coins = (user.coins || 0) + amount;
    await user.save();

    await AgentCoinHistory.create({
      userNumber: user.userNumber,
      username: user.username,
      coinsAdded: amount,
    });

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Get history for one user
export const getCoinHistory_v2 = async (req, res) => {
  try {
    const history = await AgentCoinHistory.find({ userNumber: Number(req.params.userNumber) })
      .sort({ createdAt: -1 });
    res.json({ success: true, history });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Get all history
export const getAllCoinHistory_v2 = async (req, res) => {
  try {
    const history = await AgentCoinHistory.find().sort({ createdAt: -1 });
    res.json({ success: true, history });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};
