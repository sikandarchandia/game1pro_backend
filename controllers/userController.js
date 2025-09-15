// controllers/userController.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import bcrypt from "bcryptjs";

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "Not authorized, token missing" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    }
    next();
  } catch (err) {
    console.error(err);
    res
      .status(401)
      .json({ success: false, message: "Not authorized, token invalid" });
  }
};

// controllers/userController.js

export const getUserWithWithdrawals = async (req, res) => {
  try {
    const userId = req.params.userId;

    const user = await User.findById(userId).lean();
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    // Everything is already in one object
    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};
// ✅ Update password with old password check
export const updatePassword = async (req, res) => {
  try {
    const { userId } = req.params;
    const { oldPassword, newPassword } = req.body;
    console.log("Password update hit for user:", req.params.userId);

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // 🔑 Check old password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Old password is incorrect" });
    }

    // 🔑 Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();

    res.json({ success: true, message: "Password updated successfully!" });
  } catch (err) {
    console.error("Password update error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
