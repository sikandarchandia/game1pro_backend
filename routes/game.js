import express from "express";
import { getCurrentRound } from "../gameTimer.js";

const router = express.Router();

router.get("/current-round", (req, res) => {
  const round = getCurrentRound();
  const now = Date.now();
  const timeElapsed = now - round.startTime;
  const timeLeft = Math.max(round.duration - timeElapsed, 0);

  res.json({
    startTime: round.startTime,
    crashMultiplier: round.crashMultiplier,
    duration: round.duration,
    timeLeft,
    now,
  });
});

export default router;
