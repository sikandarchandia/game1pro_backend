import User from "../models/User.js";

// Add game result
export const addGameResult = async (req, res) => {
  try {
    const user = req.user;
    const { bet, betAmount, dice, result, amount } = req.body;

    if (!bet || !betAmount || !dice || !result || !amount) {
      return res.status(400).json({ message: "Invalid data" });
    }

    // Deduct/add coins
    const newCoins = user.coins + amount;
    if (newCoins < 0)
      return res.status(400).json({ message: "Insufficient balance" });

    user.coins = newCoins;

    // Add to game history
    if (!user.gameHistory) user.gameHistory = [];
    user.gameHistory.unshift({
      date: new Date(),
      bet,
      betAmount,
      dice,
      result,
      amount,
    });

    // Keep only last 50 records
    if (user.gameHistory.length > 50) user.gameHistory.pop();

    await user.save();

    res.json({
      success: true,
      coins: user.coins,
      history: user.gameHistory,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get history
export const getGameHistory = async (req, res) => {
  try {
    const user = req.user;
    res.json(user.gameHistory || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAllWinHistory = async (req, res) => {
  try {
    const users = await User.find({}, { userNumber: 1, gameHistory: 1 });

    let history = [];

    users.forEach((user) => {
      if (user.gameHistory && Array.isArray(user.gameHistory)) {
        user.gameHistory.forEach((item) => {
          if (item.result === "Win") {
            history.push({
              id: item._id, // ✅ entry ID
              userNumber: user.userNumber,
              amount: item.amount,
              result: item.result,
              date: item.date,
            });
          }
        });
      }
    });

    // sort latest first
    history.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({ success: true, history });
  } catch (err) {
    console.error("Error fetching win history:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

