import mongoose from "mongoose";

const CoinsAddedByAgentSchema = new mongoose.Schema(
  {
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // who added
    agentName: { type: String, required: true },
    userNumber: { type: Number, required: true }, // who received
    username: { type: String, required: true },
    coinsAdded: { type: Number, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("CoinsAddedByAgent", CoinsAddedByAgentSchema);
