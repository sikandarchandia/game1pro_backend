import User from "../models/User.js";

// Get all bank accounts
export const getBankAccounts = async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, accounts: user.bankAccounts });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// Add a new bank account
export const addBankAccount = async (req, res) => {
  const { userId } = req.params;
  const { bank, number, holder, country } = req.body;

  if (!bank || !number || !holder || !country)
    return res.status(400).json({ success: false, message: "All fields are required" });

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.bankAccounts.push({ bank, number, holder, country });
    await user.save();

    res.json({ success: true, accounts: user.bankAccounts });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};


// Delete a bank account
export const deleteBankAccount = async (req, res) => {
  const { userId, accountId } = req.params;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Filter out the account to delete
    user.bankAccounts = user.bankAccounts.filter(
      (acc) => acc._id.toString() !== accountId
    );

    await user.save();

    res.json({ success: true, accounts: user.bankAccounts });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};
