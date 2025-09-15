import mongoose from "mongoose";

const agentCoinHistorySchema = new mongoose.Schema(
  {
    userNumber: { type: Number, required: true },
    username: { type: String, required: true },
    coinsAdded: { type: Number, required: true },
  },
  { timestamps: true } // ensures createdAt exists
);

export default mongoose.model("AgentCoinHistory", agentCoinHistorySchema);
