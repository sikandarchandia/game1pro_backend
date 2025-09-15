// backend/zooEngine.js
import jwt from "jsonwebtoken";
import User from "./models/User.js";
import { Queue } from "bullmq";

const REDIS_URL = process.env.REDIS_URL || process.env.REDIS || "redis://127.0.0.1:6379";

const PHASES = { BETTING: "BETTING", SPINNING: "SPINNING", RESULT: "RESULT" };
const BET_WINDOW_MS = 15_000;
const RESULT_PAUSE_MS = 1_200;

const MIN_BET = 5;
const MAX_BET = 50_000;

/* helpers */
const I = (n) => Math.max(0, Math.round(Number(n || 0))); // integer PKR everywhere

/* ===== board ===== */
const COUPLES = [
  { key: "lion", emoji: "🦁", mult: 6 },
  { key: "rabbit", emoji: "🐰", mult: 6 },
  { key: "panda", emoji: "🐼", mult: 3 },
  { key: "monkey", emoji: "🐒", mult: 3 },
  { key: "sparrow", emoji: "🐦", mult: 5 },
  { key: "eagle", emoji: "🦅", mult: 5 },
  { key: "pigeon", emoji: "🕊️", mult: 2 },
  { key: "peacock", emoji: "🦚", mult: 2 },
];
const SINGLES = [
  { key: "snake", emoji: "🐍", mult: 0 },
  { key: "fish", emoji: "🐟", mult: 10 },
  { key: "female", emoji: "👩", mult: 20 },
  { key: "dragon", emoji: "🐉", mult: 10 },
];

function buildBoard() {
  const rows = [
    { couples: ["lion", "rabbit"], single: "snake" },
    { couples: ["panda", "monkey"], single: "fish" },
    { couples: ["sparrow", "eagle"], single: "female" },
    { couples: ["pigeon", "peacock"], single: "dragon" },
  ];
  const cMap = Object.fromEntries(COUPLES.map((c) => [c.key, c]));
  const sMap = Object.fromEntries(SINGLES.map((s) => [s.key, s]));
  const out = [];
  rows.forEach((row, ri) => {
    row.couples.forEach((k) => {
      for (let i = 0; i < 3; i++) {
        const c = cMap[k];
        out.push({ id: `${k}-${i + 1}-${ri}`, group: k, name: k, emoji: c.emoji, mult: c.mult, isSingle: false });
      }
    });
    const s = sMap[row.single];
    out.push({ id: `${s.key}-${ri}`, group: null, name: s.key, emoji: s.emoji, mult: s.mult, isSingle: true });
  });
  return out;
}
const BOXES = buildBoard();
const BOX_INDEX = Object.fromEntries(BOXES.map((b, i) => [b.id, i]));
const PATH = Array.from({ length: BOXES.length }, (_, i) => i); // 0..27

const roundQueue = new Queue("zoo-round-persist", { connection: { url: REDIS_URL } });

// never block the game loop on persistence
const persistRoundSafely = async (roundRecord) => {
  try {
    await roundQueue.add("persistZooRound", roundRecord, {
      removeOnComplete: true,
      attempts: 3,
    });
  } catch (e) {
    console.warn("Zoo persist skipped:", e?.message || e);
  }
};

async function verifyToken(token) {
  try {
    if (!token) return null;
    const t = token.replace(/^Bearer\s+/i, "");
    const payload = jwt.verify(t, process.env.JWT_SECRET);
    if (!payload?.id) return null;
    const user = await User.findById(payload.id);
    return user || null;
  } catch {
    return null;
  }
}

export default function initZooEngine(io) {
  const nsp = io.of("/zoo");

  // ===== round state (persists across connections) =====
  let phase = PHASES.BETTING;
  let roundId = `Z${Date.now()}`;
  let roundStart = Date.now();

  let highlightIdx = null;
  let winnerIdx = null;

  // per-round accounting
  let bets = []; // {id,userId,socketId,amount,boxId,group,mult,isSingle}
  let totalsPerBox = new Map(); // boxId -> amount
  let totalStake = 0;           // sum of all bets (amount)
  let totalBets = 0;            // number of bets
  let roundPayout = 0;          // sum of payouts to all users THIS round

  // last 50 winners
  const history = []; // {roundId, winner:{id,name,emoji,mult}}

  const timeLeftMs = () =>
    phase === PHASES.BETTING ? Math.max(0, BET_WINDOW_MS - (Date.now() - roundStart)) : 0;

  const snapshot = () => ({
    phase,
    roundId,
    serverTime: Date.now(),
    timeLeft: timeLeftMs(),
    totalBets: I(totalBets),
    totalStake: I(totalStake),
    roundPayout: I(roundPayout),
    perBoxTotals: Object.fromEntries([...totalsPerBox].map(([k, v]) => [k, I(v)])),
    highlightIdx,
    winnerIdx,
    history: history.slice(0, 10),
  });

  const emitPhase = () => {
    nsp.emit("zoo:phase", snapshot());
  };

  const emitTimerTick = () => {
    const secs = Math.ceil(timeLeftMs() / 1000);
    nsp.emit("zoo:timer", { timeLeft: secs, serverTime: Date.now() });
  };

  const resetRound = () => {
    phase = PHASES.BETTING;
    roundId = `Z${Date.now()}`;
    roundStart = Date.now();
    highlightIdx = null;
    winnerIdx = null;
    bets = [];
    totalsPerBox = new Map();
    totalStake = 0;
    totalBets = 0;
    roundPayout = 0;
  };

  const bookTotals = (boxId, delta) => {
    totalsPerBox.set(boxId, I((totalsPerBox.get(boxId) || 0) + delta));
  };

  // ===== spin profile (4–8s accel→decel) =====
  const randBetween = (a, b) => a + Math.random() * (b - a);
  const randInt = (a, b) => Math.floor(randBetween(a, b + 1));

  const startSpin = () => {
    phase = PHASES.SPINNING;
    emitPhase();

    const total = PATH.length; // 28
    const startPathIdx = randInt(0, total - 1);
    const loops = Math.random() < 0.5 ? 1 : 2;
    const targetOnPath = randInt(0, total - 1);
    const stepsToTarget =
      loops * total + ((targetOnPath - startPathIdx + total) % total);

    const totalMs = randBetween(4000, 8000);
    const fastPortion = randBetween(0.3, 0.6);
    const startDelay = 240, minDelay = 95, maxDelay = 450;
    const easeIn = (x) => x * x;
    const easeOut = (x) => 1 - Math.pow(1 - x, 3);

    const delays = new Array(stepsToTarget + 1).fill(0).map((_, i) => {
      const p = i / stepsToTarget;
      if (p < fastPortion) {
        const x = p / fastPortion;
        return startDelay - easeIn(x) * (startDelay - minDelay);
      } else {
        const x = (p - fastPortion) / (1 - fastPortion);
        return minDelay + easeOut(x) * (maxDelay - minDelay);
      }
    });
    const baseTotal = delays.reduce((a, b) => a + b, 0);
    const scale = totalMs / baseTotal;
    const scaled = delays.map((d) => Math.max(30, Math.floor(d * scale)));

    // initial highlight
    highlightIdx = PATH[startPathIdx];
    nsp.emit("zoo:highlight", { highlightIdx, serverTime: Date.now() });

    let current = startPathIdx;
    let i = 0;
    const step = () => {
      if (i > stepsToTarget) {
        winnerIdx = PATH[current % total];
        nsp.emit("zoo:stop", { winnerIdx, roundId, serverTime: Date.now() });
        settleRound(winnerIdx);
        return;
      }
      current = (current + 1) % total;
      highlightIdx = PATH[current];
      nsp.emit("zoo:highlight", { highlightIdx, serverTime: Date.now() });
      setTimeout(() => { i += 1; step(); }, scaled[i]);
    };
    step();
  };

  const settleRound = async (winIdx) => {
    phase = PHASES.RESULT;

    const winner = BOXES[winIdx];
    const resolved = [];
    const creditByUser = new Map(); // userId -> payout sum

    for (const b of bets) {
      const isWin = winner.isSingle ? b.boxId === winner.id : b.group === winner.group;
      const payout = isWin ? I(b.amount * winner.mult) : 0;
      resolved.push({
        betId: b.id,
        userId: b.userId,
        boxId: b.boxId,
        group: b.group,
        stake: I(b.amount),
        mult: winner.mult,
        isWin,
        payout,
      });
      if (payout > 0) creditByUser.set(b.userId, I((creditByUser.get(b.userId) || 0) + payout));
    }

    // sum of payouts this round (for the header tile)
    roundPayout = I([...creditByUser.values()].reduce((s, v) => s + v, 0));

    // credit winners; balances always integers
    for (const [userId, payoutSum] of creditByUser.entries()) {
      try {
        const user = await User.findById(userId);
        if (!user) continue;
        user.coins = I((user.coins || 0) + payoutSum);
        await user.save();
        const sockets = bets.filter(b => b.userId === userId).map(b => b.socketId);
        sockets.forEach((sid) => {
          nsp.to(sid).emit("zoo:roundSettle", {
            roundId,
            winner: { id: winner.id, name: winner.name, emoji: winner.emoji, mult: winner.mult },
            totalPayout: I(payoutSum),
            newBalance: I(user.coins),
            serverTime: Date.now(),
          });
        });
      } catch (err) {
        console.warn("zoo settle credit error:", err);
      }
    }

    // history + broadcast end
    const roundRecord = {
      roundId,
      timestamp: new Date().toISOString(),
      winner: { id: winner.id, name: winner.name, mult: winner.mult },
      totalBets: I(totalBets),
      totalStake: I(totalStake),
      roundPayout: I(roundPayout),
      resolved,
    };
    history.unshift({
      roundId,
      winner: { id: winner.id, name: winner.name, emoji: winner.emoji, mult: winner.mult },
    });
    if (history.length > 50) history.pop();

    // broadcast the RESULT snapshot immediately
    emitPhase();
    nsp.emit("zoo:roundEnd", { ...roundRecord, serverTime: Date.now() });

    // ✅ Always schedule the next round EVEN IF Redis is down
    setTimeout(() => {
      resetRound();
      emitPhase();
      startBettingTimer();
    }, RESULT_PAUSE_MS);

    // Fire-and-forget persistence
    persistRoundSafely(roundRecord);
  };

  // ===== betting countdown (server-authoritative) =====
  let tickInterval = null, hardStopTO = null;
  const startBettingTimer = () => {
    clearInterval(tickInterval); clearTimeout(hardStopTO);
    emitPhase(); emitTimerTick();

    tickInterval = setInterval(() => {
      emitTimerTick();
      const left = timeLeftMs();
      if (left <= 0) { clearInterval(tickInterval); clearTimeout(hardStopTO); startSpin(); }
    }, 1000);

    // hard guard in case of drift
    hardStopTO = setTimeout(() => {
      clearInterval(tickInterval);
      startSpin();
    }, BET_WINDOW_MS + 50);
  };

  resetRound(); startBettingTimer();

  // ===== sockets =====
  nsp.on("connection", (socket) => {
    // Exact current state for late joiners
    socket.emit("zoo:phase", snapshot());
    socket.emit("zoo:timer", { timeLeft: Math.ceil(timeLeftMs() / 1000), serverTime: Date.now() });

    socket.on("zoo:getBalance", async ({ token }, cb) => {
      const user = await verifyToken(token);
      if (!user) return cb?.({ ok: false, code: "UNAUTH" });
      cb?.({ ok: true, coins: I(user.coins) });
    });

    socket.on("zoo:placeBet", async (payload, cb) => {
      try {
        if (phase !== PHASES.BETTING) return cb?.({ ok: false, code: "NOT_BETTING", message: "Betting closed." });

        const amount = I(payload?.amount || 0);
        const boxId = payload?.boxId;
        if (!boxId || !(boxId in BOX_INDEX)) return cb?.({ ok: false, code: "BAD_BOX", message: "Invalid selection." });
        if (!amount || amount < MIN_BET || amount > MAX_BET)
          return cb?.({ ok: false, code: "BAD_AMOUNT", message: `Bet must be between ${MIN_BET} and ${MAX_BET}.` });

        const user = await verifyToken(payload?.token);
        if (!user) return cb?.({ ok: false, code: "UNAUTH", message: "Sign in required." });
        if (I(user.coins) < amount) return cb?.({ ok: false, code: "INSUFFICIENT", message: "Insufficient balance." });

        user.coins = I((user.coins || 0) - amount);
        await user.save();

        const bx = BOXES[BOX_INDEX[boxId]];
        bets.push({
          id: `ZB${Date.now()}${Math.floor(Math.random() * 9999)}`,
          userId: user._id.toString(),
          socketId: socket.id,
          amount,
          boxId,
          group: bx.group,
          mult: bx.mult,
          isSingle: bx.isSingle,
        });
        totalBets = I(totalBets + 1);
        totalStake = I(totalStake + amount);
        bookTotals(boxId, amount);
        emitPhase();

        socket.emit("zoo:betPlacedPrivate", { newBalance: I(user.coins), serverTime: Date.now() });
        cb?.({ ok: true });
      } catch (err) {
        console.error("zoo:placeBet error", err);
        cb?.({ ok: false, code: "ERR", message: "Server error" });
      }
    });

    socket.on("zoo:cancelBet", async (payload, cb) => {
      try {
        if (phase !== PHASES.BETTING) return cb?.({ ok: false, code: "NOT_BETTING", message: "Betting closed." });

        const betId = payload?.betId;
        const idx = bets.findIndex((b) => b.id === betId);
        if (idx === -1) return cb?.({ ok: false, code: "NOT_FOUND" });

        const bet = bets[idx];
        const user = await verifyToken(payload?.token);
        if (!user || user._id.toString() !== bet.userId) return cb?.({ ok: false, code: "UNAUTH" });

        user.coins = I((user.coins || 0) + bet.amount);
        await user.save();

        bets.splice(idx, 1);
        totalBets = I(totalBets - 1);
        totalStake = I(totalStake - bet.amount);
        bookTotals(bet.boxId, -bet.amount);
        emitPhase();

        socket.emit("zoo:betCanceled", { newBalance: I(user.coins), serverTime: Date.now() });
        cb?.({ ok: true });
      } catch (err) {
        console.error("zoo:cancelBet error", err);
        cb?.({ ok: false, code: "ERR", message: "Server error" });
      }
    });

    socket.on("disconnect", () => {});
  });

  // minimal http snapshot (used by /api/zoo/current-round)
  return {
    getSnapshot() {
      return snapshot();
    },
  };
}
