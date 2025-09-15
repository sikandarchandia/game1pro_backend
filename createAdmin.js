import mongoose from "mongoose";
import dotenv from "dotenv";
import AdminLogin from "./models/AdminLogin.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("Connected to MongoDB"))
.catch((err) => console.log("MongoDB connection error:", err));

const createAdmin = async () => {
  try {
    const admin = new AdminLogin({
      username: "sikandar",
      email: "admin@gmail.com",
      password: "12345678"
    });

    await admin.save();
    console.log("Admin created successfully!");
    mongoose.disconnect();
  } catch (err) {
    console.log("Error creating admin:", err.message);
    mongoose.disconnect();
  }
};

createAdmin();
