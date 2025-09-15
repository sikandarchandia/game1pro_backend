// backend/worker.js
import mongoose from "mongoose";
import { Worker } from "bullmq";
import Round from "./models/Round.js";
import User from "./models/User.js";

const REDIS_URL = process.env.REDIS_URL || process.env.REDIS || "redis://127.0.0.1:6379";
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/yourdb";

async function init() {
  await mongoose.connect(MONGO_URI, {});

  console.log("Worker connected to MongoDB");

  const worker = new Worker(
    "round-persist",
    async (job) => {
      const r = job.data;

      const roundDoc = new Round({
        roundId: r.roundId,
        timestamp: r.timestamp,
        crashAt: r.crashAt,
        totalBets: r.totalBets,
        totalStake: r.totalStake,
        resolved: r.resolved.map((res) => ({
          betId: res.betId,
          userId: res.userId,
          stake: res.stake,
          cashedAt: res.cashedAt,
          cashed: res.cashed,
          payout: res.payout,
        })),
      });

      await roundDoc.save();

      // Update user gameHistory (keep last 50)
      for (const rr of r.resolved) {
        try {
          const user = await User.findById(rr.userId);
          if (!user) continue;
          const entry = {
            date: new Date(),
            bet: "aviator",
            betAmount: rr.stake,
            dice: [],
            result: rr.cashed ? "Win" : "Loss",
            amount: rr.cashed ? rr.payout : -rr.stake,
          };
          user.gameHistory = user.gameHistory || [];
          user.gameHistory.unshift(entry);
          if (user.gameHistory.length > 50) user.gameHistory.pop();
          await user.save();
        } catch (err) {
          console.warn("Worker: failed to update user history", err);
        }
      }

      return { ok: true };
    },
    { connection: { url: REDIS_URL } }
  );

  worker.on("completed", (job) => console.log("Worker: job completed", job.id));
  worker.on("failed", (job, err) => console.error("Worker: job failed", job.id, err));
}

init().catch((e) => {
  console.error("Worker init error:", e);
  process.exit(1);
});
