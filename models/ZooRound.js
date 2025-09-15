// backend/models/ZooRound.js
import mongoose from "mongoose";

const resolvedSchema = new mongoose.Schema({
  betId: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  boxId: { type: String, required: true },
  group: { type: String, default: null },
  stake: { type: Number, required: true },
  mult: { type: Number, required: true },
  isWin: { type: Boolean, default: false },
  payout: { type: Number, default: 0 },
});

const zooRoundSchema = new mongoose.Schema({
  roundId: { type: String, required: true, unique: true },
  timestamp: { type: Date, default: Date.now },
  winner: {
    id: String,
    name: String,
    mult: Number,
  },
  totalBets: { type: Number, default: 0 },
  totalStake: { type: Number, default: 0 },
  roundPayout: { type: Number, default: 0 },
  resolved: [resolvedSchema],
});

export default mongoose.model("ZooRound", zooRoundSchema);
