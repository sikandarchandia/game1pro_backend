// models/User.js
import mongoose from "mongoose";

const bankAccountSchema = new mongoose.Schema({
  bank: { type: String, required: true },
  number: { type: String, required: true },
  holder: { type: String, required: true },
  country: { type: String, required: true },
});

const withdrawalSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  account: {
    bank: { type: String, required: true },
    number: { type: String, required: true },
    holder: { type: String, required: true },
    country: { type: String, required: true },
  },
  status: {
    type: String,
    enum: ["Processing", "Completed", "Grabbed"],
    default: "Processing",
  },
  grabbedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  }, // ✅ who grabbed the order
  createdAt: { type: Date, default: Date.now },
});
const gameHistorySchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  bet: String,
  betAmount: Number,
  dice: [Number],
  result: String,
  amount: Number,
});

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: {
      type: String,
      required: function () {
        return !this.googleId;
      },
    },
    googleId: { type: String },
    coins: { type: Number, default: 0 },
    role: { type: String, default: "user" },
    status: { type: String, default: "active" },
    userNumber: { type: Number, unique: true, required: true },

    whatsappNumber: { type: String, default: "" }, // ✅ new field
    gameHistory: [gameHistorySchema],

    bankAccounts: [bankAccountSchema],
    withdrawals: [withdrawalSchema],
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
