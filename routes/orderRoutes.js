import express from "express";
import { getAllOrders, getMyOrders, grabOrder } from "../controllers/orderController.js";
import { protect } from "../controllers/authController.js";

const router = express.Router();

router.get("/", protect, getAllOrders);
router.get("/my/:userId", protect, getMyOrders);
router.post("/grab/:orderId", protect, grabOrder);

export default router;
