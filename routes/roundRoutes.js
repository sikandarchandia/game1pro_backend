// backend/routes/roundRoutes.js
import express from "express";
import { getRounds, getRound } from "../controllers/roundController.js";

const router = express.Router();

router.get("/", getRounds);
router.get("/:id", getRound);

export default router;
