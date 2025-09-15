import User from "../models/User.js";

export const getDashboardStats = async (req, res) => {
  try {
    console.log("📊 Fetching Dashboard Stats...");

    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: "active" });
    const blockedUsers = await User.countDocuments({ status: "block" });

    const allUsers = await User.find().select("withdrawals coins role");

    let totalWithdrawCount = 0;
    let todayRequests = 0;
    let totalEarning = 0;

    let totalProcessingAmount = 0;
    let totalSuccessfulAmount = 0;

    const today = new Date().toISOString().split("T")[0];

    allUsers.forEach((user) => {
      if (user.withdrawals?.length) {
        user.withdrawals.forEach((w) => {
          totalWithdrawCount++;

          const status = w.account?.status?.toLowerCase() || "unknown";

          if (status === "processing") {
            totalProcessingAmount += w.amount || 0;
          } else if (
            status === "success" ||
            status === "successful" ||
            status === "successfull" || // ✅ handles typo in DB
            status === "completed"
          ) {
            totalSuccessfulAmount += w.amount || 0;
          }

          if (w.createdAt) {
            const wDate = new Date(w.createdAt).toISOString().split("T")[0];
            if (wDate === today) todayRequests++;
          }
        });
      }

      totalEarning += user.coins || 0;
    });

    res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        blockedUsers,
        totalWithdrawCount,
        todayRequests,
        totalProcessingAmount,
        totalSuccessfulAmount,
        totalEarning,
      },
    });
  } catch (err) {
    console.error("❌ Dashboard Error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};
