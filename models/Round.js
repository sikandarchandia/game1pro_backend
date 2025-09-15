// backend/models/Round.js
import mongoose from "mongoose";

const resolvedSchema = new mongoose.Schema({
  betId: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  stake: { type: Number, required: true },
  cashedAt: { type: Number, default: null },
  cashed: { type: Boolean, default: false },
  payout: { type: Number, default: 0 },
});

const roundSchema = new mongoose.Schema({
  roundId: { type: String, required: true, unique: true },
  timestamp: { type: Date, default: Date.now },
  crashAt: { type: Number, required: true },
  totalBets: { type: Number, default: 0 },
  totalStake: { type: Number, default: 0 },
  resolved: [resolvedSchema],
});

export default mongoose.model("Round", roundSchema);
