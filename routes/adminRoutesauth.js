import express from "express";
import AdminLogin from "../models/AdminLogin.js";
import bcrypt from "bcryptjs";

const router = express.Router();

// ------------------ GET all admins ------------------
router.get("/get-all", async (req, res) => {
  try {
    const admins = await AdminLogin.find({}, "-password"); // exclude passwords
    res.status(200).json({ success: true, admins });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ------------------ LOGIN ------------------
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await AdminLogin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Password incorrect" });
    }

    res.status(200).json({
      success: true,
      message: "Login successful",
      admin: { _id: admin._id, username: admin.username, email: admin.email },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ------------------ CREATE new admin ------------------
router.post("/create", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password)
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });

    const existingAdmin = await AdminLogin.findOne({ email });
    if (existingAdmin)
      return res
        .status(400)
        .json({ success: false, message: "Admin already exists" });

    const newAdmin = new AdminLogin({ username, email, password });
    await newAdmin.save();

    res.status(201).json({
      success: true,
      message: "Admin created successfully",
      admin: { username, email },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET single admin
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await AdminLogin.findById(id).select("-password");
    if (!admin) return res.status(404).json({ success: false, message: "Admin not found" });
    res.status(200).json({ success: true, admin });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// UPDATE admin
router.put("/update/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, password } = req.body;

    const admin = await AdminLogin.findById(id);
    if (!admin) return res.status(404).json({ success: false, message: "Admin not found" });

    if (username) admin.username = username;
    if (email) admin.email = email;

    if (password) {
      const salt = await bcrypt.genSalt(10);
      admin.password = await bcrypt.hash(password, salt);
    }

    await admin.save();
    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      admin: { username: admin.username, email: admin.email },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
