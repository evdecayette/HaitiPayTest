import { db } from "../config/db.js";

export const checkPin = async (req, res, next) => {
  try {
    const phone = req.params.phoneNumber ?? req.body.fromPhone;
    const pin = req.headers["x-pin"];

    const [[wallet]] = await db.query(
      `SELECT w.* FROM wallets w JOIN wallet_owners o
       ON w.ownerId=o.id WHERE o.phoneNumber=?`, [phone]);

    if (!wallet) return res.status(404).json({ error: "Wallet not found" });
    if (wallet.pin !== pin) return res.status(401).json({ error: "Wrong PIN" });

    req.wallet = wallet;
    next();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
