import User from "../models/User.js";
import CoinHistoryV2 from "../models/CoinHistoryV2.js";
import AgentCoinHistory from "../models/AgentCoinHistory.js"; // import agent coin history

// ✅ Search user by userId
export const searchAgentV2 = async (req, res) => {
  try {
    const { userNumber } = req.params;
    const user = await User.findOne({ userNumber: Number(userNumber) });

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Get all agents
export const getAllAgents_v2 = async (req, res) => {
  try {
    const agents = await Agent.find({}, "-password"); // exclude passwords
    res.json({ success: true, agents });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Toggle role (example: user <-> agent)
export const toggleRole_v2 = async (req, res) => {
  try {
    const { id } = req.params;
    const agent = await Agent.findById(id);

    if (!agent) {
      return res.json({ success: false, message: "Agent not found" });
    }

    agent.role = agent.role === "user" ? "agent" : "user";
    await agent.save();

    res.json({ success: true, message: "Role updated", agent });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Add coins from agent → user
export const addCoinsV2 = async (req, res) => {
  try {
    const { userNumber, amount } = req.body;
    const agentId = req.user.id; // logged-in agent

    const transferAmount = Number(amount);
    if (!transferAmount || transferAmount <= 0) {
      return res.json({ success: false, message: "Invalid amount" });
    }

    const agent = await User.findById(agentId);
    if (!agent || agent.role !== "agent") {
      return res.json({ success: false, message: "Agent not found or not authorized" });
    }

    if (String(agent.userNumber) === String(userNumber)) {
      return res.json({ success: false, message: "You cannot send coins to your own account" });
    }

    if ((agent.coins || 0) < transferAmount) {
      return res.json({
        success: false,
        message: `Insufficient balance. You have ${agent.coins} coins.`,
      });
    }

    const user = await User.findOne({ userNumber: Number(userNumber) });
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    agent.coins -= transferAmount;
    user.coins = (user.coins || 0) + transferAmount;

    await agent.save();
    await user.save();

    const history = new CoinHistoryV2({
      fromAgent: agent._id,
      fromAgentName: agent.username,
      toUser: user._id,
      userNumber,
      username: user.username,
      coinsAdded: transferAmount,
    });
    await history.save();

    res.json({
      success: true,
      message: `${transferAmount} coins transferred to ${user.username}`,
      agentBalance: agent.coins,
      userBalance: user.coins,
    });
  } catch (err) {
    console.error("❌ addCoinsV2 error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Get coin history of user (agent only)
export const getCoinHistoryV2 = async (req, res) => {
  try {
    const { id } = req.params;
    const history = await CoinHistoryV2.find({ userNumber: id }).sort({
      createdAt: -1,
    });

    res.json({ success: true, history });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Get full coin history (admin + agent) for a user
export const getFullCoinHistoryV2 = async (req, res) => {
  try {
    const { userNumber } = req.params;

    const adminHistory = await CoinHistoryV2.find({ userNumber: Number(userNumber) }).lean();
    const agentHistory = await AgentCoinHistory.find({ userNumber: Number(userNumber) }).lean();

    const adminWithType = adminHistory.map((h) => ({ ...h, addedBy: "Admin" }));
    const agentWithType = agentHistory.map((h) => ({ ...h, addedBy: "Agent" }));

    const fullHistory = [...adminWithType, ...agentWithType].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.json({ success: true, history: fullHistory });
  } catch (err) {
    console.error("Fetch full coin history error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
