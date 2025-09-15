import User from "../models/User.js";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import transporter from "../utils/mailer.js";
import { OAuth2Client } from "google-auth-library";

dotenv.config();

export const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "postmessage"
);

// ------------------- login with google -------------------

export const googleLogin = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code)
      return res
        .status(400)
        .json({ message: "Authorization code is required" });

    // 1. Exchange code for tokens
    const { tokens } = await googleClient.getToken(code);
    if (!tokens.id_token)
      return res.status(400).json({ message: "Missing ID token" });

    // 2. Verify ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, sub: googleId } = payload;

    if (!email || !name || !googleId)
      return res.status(400).json({ message: "Invalid Google user data" });

    // 3. Find or create user
    let user = await User.findOne({ email });
    let isNewUser = false;

    if (!user) {
      user = await User.create({
        username: name,
        email,
        googleId,
        coins: 0,
        role: "user",
        status: "active",
        userNumber: await generateUserNumber(),
      });
      isNewUser = true;

      // ---------------- Send Welcome Email ----------------
      const mailOptions = {
        from: `"Game1Pro" <${process.env.SMTP_USER}>`,
        to: user.email,
        subject: " Welcome to Game1Pro! 🎉",
        html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
          <title>Welcome to Game1Pro</title>
          <style>
            body { font-family: 'Arial', sans-serif; background-color: #f4f6f8; margin:0; padding:0; }
            .container { max-width:600px; margin:30px auto; background:#fff; border-radius:10px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.1); border:1px solid #e0e0e0; }
            .header { background: linear-gradient(90deg,#4a148c,#0d47a1); color:#fff; padding:20px; text-align:center; }
            .header h1 { margin:0; font-size:28px; }
            .content { padding:25px; color:#333; }
            .content h2 { color:#4a148c; font-size:22px; }
            .content p { font-size:16px; line-height:1.5; margin-bottom:15px; }
            .btn { display:inline-block; padding:12px 25px; background-color:#0d47a1; color:#fff; text-decoration:none; border-radius:6px; font-weight:bold; margin-top:15px; }
            .footer { background-color:#f4f6f8; text-align:center; padding:15px; font-size:14px; color:#777; }
            .footer a { color:#0d47a1; text-decoration:none; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Game1Pro!</h1>
            </div>
            <div class="content">
              <h2>Hello ${user.username},</h2>
              <p>We're thrilled to have you on board! 🎉</p>
              <p>Try your luck and play exciting games to win amazing rewards!</p>
              <p>Visit our platform to start your journey:</p>
              <a href="https://game1pro.com" class="btn">Go to Game1Pro</a>
            </div>
            <div class="footer">
              <p>Game1Pro.com | Your ultimate gaming platform</p>
              <p>If you have any questions, contact us at <a href="mailto:support@game1pro.com">support@game1pro.com</a></p>
            </div>
          </div>
        </body>
        </html>
        `,
      };

      transporter.sendMail(mailOptions, (err, info) => {
        if (err) console.error("❌ Error sending email:", err);
        else console.log("✅ Welcome email sent:", info.response);
      });
    }

    // 4. Generate JWT for your app
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // 5. Response
    res.status(200).json({
      success: true,
      message: isNewUser
        ? "Google signup successful"
        : "Google login successful",
      _id: user._id,
      username: user.username,
      email: user.email,
      coins: user.coins,
      role: user.role,
      status: user.status,
      userNumber: user.userNumber,
      token,
    });
  } catch (error) {
    console.error("🚨 Google login error:", error);
    res.status(500).json({ message: "Failed to login with Google", error });
  }
};

// ------------------- SIGNUP -------------------

// Generate a unique number between 10000 and 99999999 (5 to 8 digits)
const generateUserNumber = async () => {
  let number;
  let exists = true;

  while (exists) {
    number = Math.floor(Math.random() * (99999999 - 10000 + 1)) + 10000; // 5-8 digits
    const user = await User.findOne({ userNumber: number });
    if (!user) exists = false;
  }

  return number;
};

export const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password)
      return res.status(400).json({ message: "All fields are required" });

    const emailExists = await User.findOne({ email });
    if (emailExists)
      return res.status(400).json({ message: "Email already exists" });

    const usernameExists = await User.findOne({ username });
    if (usernameExists)
      return res.status(400).json({ message: "Username already taken" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const userNumber = await generateUserNumber();

    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      coins: 0,
      role: "user",
      status: "active",
      userNumber,
    });

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // ---------------- Send Welcome Email ----------------
    const mailOptions = {
      from: `"Game1Pro" <${process.env.SMTP_USER}>`,
      to: newUser.email,
      subject: " Welcome to Game1Pro! 🎉",
      html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>Welcome to Game1Pro</title>
        <style>
          body { font-family: 'Arial', sans-serif; background-color: #f4f6f8; margin:0; padding:0; }
          .container { max-width:600px; margin:30px auto; background:#fff; border-radius:10px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.1); border:1px solid #e0e0e0; }
          .header { background: linear-gradient(90deg,#4a148c,#0d47a1); color:#fff; padding:20px; text-align:center; }
          .header h1 { margin:0; font-size:28px; }
          .content { padding:25px; color:#333; }
          .content h2 { color:#4a148c; font-size:22px; }
          .content p { font-size:16px; line-height:1.5; margin-bottom:15px; }
          .btn { display:inline-block; padding:12px 25px; background-color:#0d47a1; color:#fff; text-decoration:none; border-radius:6px; font-weight:bold; margin-top:15px; }
          .footer { background-color:#f4f6f8; text-align:center; padding:15px; font-size:14px; color:#777; }
          .footer a { color:#0d47a1; text-decoration:none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Game1Pro!</h1>
          </div>
          <div class="content">
            <h2>Hello ${newUser.username},</h2>
            <p>We're thrilled to have you on board! 🎉</p>
            <p>Try your luck and play exciting games to win amazing rewards!</p>
            <p>Visit our platform to start your journey:</p>
            <a href="https://game1pro.com" class="btn">Go to Game1Pro</a>
          </div>
          <div class="footer">
            <p>Game1Pro.com | Your ultimate gaming platform</p>
            <p>If you have any questions, contact us at <a href="mailto:support@game1pro.com">support@game1pro.com</a></p>
          </div>
        </div>
      </body>
      </html>
      `,
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) console.error("❌ Error sending email:", err);
      else console.log("✅ Welcome email sent:", info.response);
    });

    // ----------------- Response -----------------
    res.status(201).json({
      _id: newUser._id,
      username: newUser.username,
      email: newUser.email,
      coins: newUser.coins,
      role: newUser.role,
      status: newUser.status,
      userNumber: newUser.userNumber,
      token,
    });
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

// ------------------- LOGIN -------------------
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // 🚫 If blocked
    if (user.status === "block") {
      user.loginAttemptsWhileBlocked =
        (user.loginAttemptsWhileBlocked || 0) + 1;
      await user.save();
      return res.status(403).json({
        message: "Your account is blocked. Contact admin.",
        blocked: true,
      });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      coins: user.coins,
      role: user.role,
      status: user.status,
      profilePicture: user.profilePicture || "",
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      token,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// ------------------- PROTECT MIDDLEWARE -------------------
const protect = async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");
      next();
    } catch (err) {
      return res.status(401).json({ message: "Not authorized" });
    }
  } else {
    return res.status(401).json({ message: "No token provided" });
  }
};

// ------------------- GET PROFILE -------------------
export const getProfile = [
  protect,
  async (req, res) => {
    try {
      if (!req.user) return res.status(404).json({ message: "User not found" });
      res.json(req.user);
    } catch (err) {
      res.status(500).json({ message: "Server error" });
    }
  },
];

// ------------------- UPDATE PROFILE -------------------
export const updateProfile = [
  protect,
  async (req, res) => {
    try {
      const user = req.user;
      const { username, email, profilePicture, whatsappNumber } = req.body;

      if (username) user.username = username;
      if (email) user.email = email;
      if (profilePicture) user.profilePicture = profilePicture;
      if (whatsappNumber !== undefined) user.whatsappNumber = whatsappNumber;

      const updatedUser = await user.save();
      res.json({ success: true, user: updatedUser });
    } catch (err) {
      res
        .status(500)
        .json({ success: false, message: "Server error", error: err.message });
    }
  },
];

export { protect };
