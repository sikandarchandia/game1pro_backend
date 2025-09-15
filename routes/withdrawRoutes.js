import express from "express";
import { createWithdrawal, getWithdrawals  } from "../controllers/withdrawController.js";
import { protect } from "../controllers/userController.js";

const router = express.Router();

router.post("/:userId", protect, createWithdrawal);
router.get("/:userId", protect, getWithdrawals);

export default router;
