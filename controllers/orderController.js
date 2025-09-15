import User from "../models/User.js";

// -------------------- Fetch all processing withdrawals for all agents --------------------
export const getAllOrders = async (req, res) => {
  try {
    const users = await User.find({ "withdrawals.status": "Processing" }).lean();
    let orders = [];

    users.forEach((user) => {
      user.withdrawals.forEach((wd) => {
        if (wd.status === "Processing") {
          orders.push({
            _id: wd._id,                      // unique withdrawal id
            ownerId: user._id,                // user who requested withdrawal
            userNumber: user.userNumber,      // user's number
            country: wd.account.country || user.country || "N/A",
            account: wd.account,              // ✅ full account details (bank, holder, number, etc.)
            amount: wd.amount,
            status: wd.status,                // Processing
          });
        }
      });
    });

    res.json({ success: true, orders });
  } catch (err) {
    console.error("❌ getAllOrders error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// -------------------- Fetch withdrawals grabbed by this agent --------------------
export const getMyOrders = async (req, res) => {
  try {
    const agentId = req.params.userId;
    const users = await User.find({ "withdrawals.grabbedBy": agentId }).lean();
    let myOrders = [];

    users.forEach((user) => {
      user.withdrawals.forEach((wd) => {
        if (String(wd.grabbedBy) === agentId) {
          myOrders.push({
            _id: wd._id,
            ownerId: user._id,
            userNumber: user.userNumber,      // ✅ show owner’s user number
            country: wd.account.country || user.country || "N/A",
            account: wd.account,              // ✅ full account info
            amount: wd.amount,
            status: wd.status,                // Grabbed / Completed
          });
        }
      });
    });

    res.json({ success: true, orders: myOrders });
  } catch (err) {
    console.error("❌ getMyOrders error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// -------------------- Agent grabs a withdrawal --------------------
export const grabOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { userId: agentId } = req.body;

    // Find the user who owns this withdrawal
    const user = await User.findOne({ "withdrawals._id": orderId });
    if (!user) {
      return res.status(404).json({ success: false, message: "Withdrawal not found" });
    }

    // Find the specific withdrawal
    const withdrawal = user.withdrawals.id(orderId);
    if (!withdrawal) {
      return res.status(404).json({ success: false, message: "Withdrawal not found" });
    }

    if (withdrawal.status !== "Processing") {
      return res.status(400).json({ success: false, message: "Already grabbed" });
    }

    // Update withdrawal
    withdrawal.status = "Grabbed";
    withdrawal.grabbedBy = agentId;

    await user.save();

    // Add coins to agent
    const agent = await User.findById(agentId);
    if (!agent) {
      return res.status(404).json({ success: false, message: "Agent not found" });
    }
    agent.coins += withdrawal.amount;
    await agent.save();

    res.json({
      success: true,
      order: {
        _id: withdrawal._id,
        ownerId: user._id,
        userNumber: user.userNumber,
        country: withdrawal.account.country || user.country || "N/A",
        account: withdrawal.account,       // ✅ full bank details
        amount: withdrawal.amount,
        status: withdrawal.status,
      },
      message: `${withdrawal.amount} coins added to agent!`,
    });
  } catch (err) {
    console.error("❌ grabOrder error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
