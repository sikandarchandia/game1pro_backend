// backend/controllers/roundController.js
import Round from "../models/Round.js";

export const getRounds = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(50, Number(req.query.limit || 20));
    const skip = (page - 1) * limit;

    const total = await Round.countDocuments();
    const rounds = await Round.find().sort({ timestamp: -1 }).skip(skip).limit(limit).lean();

    res.json({ success: true, page, totalPages: Math.ceil(total / limit), total, rounds });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getRound = async (req, res) => {
  try {
    const id = req.params.id;
    const round = await Round.findOne({ roundId: id }).lean();
    if (!round) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, round });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
