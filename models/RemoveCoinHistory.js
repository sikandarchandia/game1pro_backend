import mongoose from "mongoose";

const removeCoinHistorySchema = new mongoose.Schema(
  {
    userNumber: { type: Number, required: true },
    username: { type: String, required: true },
    coinsRemoved: { type: Number, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("RemoveCoinHistory", removeCoinHistorySchema);
