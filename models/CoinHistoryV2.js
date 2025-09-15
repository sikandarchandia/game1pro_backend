import mongoose from "mongoose";

const coinHistoryV2Schema = new mongoose.Schema(
  {
    fromAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // refers to agent
      required: true,
    },
    fromAgentName: {
      type: String,
      required: true,
    },
    toUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // refers to user
      required: true,
    },
    userNumber: {
      type: Number,
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    coinsAdded: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

const CoinHistoryV2 = mongoose.model("CoinHistoryV2", coinHistoryV2Schema);

export default CoinHistoryV2;
