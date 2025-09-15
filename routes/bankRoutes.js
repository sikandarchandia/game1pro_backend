import express from "express";
import { addBankAccount, getBankAccounts , deleteBankAccount} from "../controllers/bankController.js";

const router = express.Router();

// Get all bank accounts for a user
router.get("/:userId", getBankAccounts);

// Add a new bank account
router.post("/:userId", addBankAccount);
router.delete("/:userId/:accountId", deleteBankAccount);

export default router;
