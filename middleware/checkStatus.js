// middleware/checkStatus.js
import User from "../models/User.js";

export const checkUserStatus = async (req, res, next) => {
  try {
    const userId = req.user.id; // assuming you decoded JWT and set req.user
    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (user.status === "block") {
      return res.status(403).json({ success: false, reason: "blocked" });
    }

    next();
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};
