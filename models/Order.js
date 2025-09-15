import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // who placed withdrawal
    userNumber: { type: Number, required: true },
    country: { type: String, required: true },
    account: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["processing", "grabbed"], default: "processing" },
    grabbedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
