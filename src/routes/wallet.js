import { Router } from "express";
import { db } from "../config/db.js";
import { v4 as uuid } from "uuid";

export const walletRouter = Router();

// ============================
// CREATE WALLET
// ============================
walletRouter.post("/create", async (req, res) => {
  try {
    const { firstName, lastName, phoneNumber, dateOfBirth, nationalId, pin } = req.body;

    // Check if phone already exists
    const [[exists]] = await db.query(
      "SELECT id FROM wallet_owners WHERE phoneNumber=?", 
      [phoneNumber]
    );
    if (exists) return res.status(400).json({ error: "Phone already used" });

    // Generate IDs
    const ownerId = uuid();
    const walletId = uuid();

    // Insert wallet owner
    await db.query(
      `INSERT INTO wallet_owners (id, firstName, lastName, phoneNumber, dateOfBirth, nationalId)
       VALUES (?,?,?,?,?,?)`,
      [ownerId, firstName, lastName, phoneNumber, dateOfBirth, nationalId]
    );

    // Insert wallet with plain PIN
    await db.query(
      `INSERT INTO wallets (id, ownerId, pin, balance, createdAt, lastActivity) 
       VALUES (?,?,?,0,NOW(),NOW())`,
      [walletId, ownerId, pin]
    );

    res.status(201).json({
      success: true,
      wallet: {
        id: walletId,
        balance: 0,
        owner: {
          firstName,
          lastName,
          phoneNumber
        }
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================
// GET WALLET PROFILE
// ============================
walletRouter.get("/:phoneNumber/profile", async (req,res)=>{
  const phone = req.params.phoneNumber;
  const [[owner]] = await db.query(
    `SELECT o.firstName,o.lastName,o.phoneNumber,w.balance
     FROM wallets w JOIN wallet_owners o ON w.ownerId=o.id 
     WHERE o.phoneNumber=?`, [phone]
  );

  if (!owner) return res.status(404).json({ error: "Wallet not found" });

  res.json(owner);
});

// ============================
// GET WALLET BALANCE
// ============================
walletRouter.get("/:phoneNumber/balance", async (req,res)=>{
  const { pin } = req.query;

  const [[wallet]] = await db.query(
    `SELECT w.*, o.id oid
     FROM wallets w
     JOIN wallet_owners o ON w.ownerId=o.id
     WHERE o.phoneNumber=?`,
    [req.params.phoneNumber]
  );

  if (!wallet) return res.status(404).json({ error: "Wallet not found" });
  if (wallet.pin !== pin) return res.status(401).json({ error: "Wrong PIN" });

  res.json({ balance: wallet.balance });
});

// ============================
// RECHARGE WALLET
// ============================
walletRouter.post("/recharge", async (req, res) => {
  try {
    const { phoneNumber, amount } = req.body;
    if (!phoneNumber || !amount) {
      return res.status(400).json({ success: false, error: "Missing parameters" });
    }

    // Get ledger
    const [[ledger]] = await db.query(`SELECT * FROM ledger_accounts WHERE id='LEDGER_MASTER'`);
    if (!ledger) return res.status(500).json({ success: false, error: "Ledger account missing" });

    if (ledger.balance < amount)
      return res.status(400).json({ success: false, error: "Ledger insufficient balance" });

    // Get wallet + owner
    const [[wallet]] = await db.query(
      `SELECT w.id walletId, w.balance, o.id ownerId, o.firstName, o.lastName
       FROM wallets w JOIN wallet_owners o ON w.ownerId=o.id 
       WHERE o.phoneNumber=?`,
      [phoneNumber]
    );
    if (!wallet) return res.status(404).json({ success: false, error: "Wallet not found" });

    // Compute IDs
    const txWallet = uuid();
    const txLedger = uuid();

    // Update balances
    await db.query(`UPDATE wallets SET balance = balance + ?, lastActivity = NOW() WHERE id=?`,
      [amount, wallet.walletId]);

    await db.query(`UPDATE ledger_accounts SET balance = balance - ? WHERE id='LEDGER_MASTER'`,
      [amount]);

    // Insert transactions
    await db.query(
      `INSERT INTO transactions 
       (id, type, fromAccountId, toAccountId, amount, fees, description, status, timestamp)
       VALUES (?, 'wallet_recharge', 'LEDGER_MASTER', ?, ?, 0, 'Recharge', 'completed', NOW())`,
      [txWallet, wallet.walletId, amount]
    );

    await db.query(
      `INSERT INTO transactions
       (id, type, fromAccountId, toAccountId, amount, fees, description, status, timestamp)
       VALUES (?, 'ledger_debit', ?, 'LEDGER_MASTER', ?, 0, 'Debit Ledger', 'completed', NOW())`,
      [txLedger, wallet.walletId, amount]
    );

    // Fetch updated balances
    const [[updatedWallet]] = await db.query(`SELECT balance FROM wallets WHERE id=?`, [wallet.walletId]);
    const [[updatedLedger]] = await db.query(`SELECT balance FROM ledger_accounts WHERE id='LEDGER_MASTER'`);

    // SUCCESS RESPONSE
    res.json({
      success: true,
      data: {
        walletTransaction: {
          id: txWallet,
          type: "wallet_recharge",
          amount,
          metadata: {
            ownerName: `${wallet.firstName} ${wallet.lastName}`
          }
        },
        ledgerTransaction: {
          id: txLedger,
          type: "ledger_debit",
          amount
        },
        newBalance: updatedWallet.balance,
        ledgerBalance: updatedLedger.balance
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});


// walletRouter.post("/recharge", async (req, res) => {
//   try {
//     const { phoneNumber, amount} = req.body;

//     // Fetch wallet
//     const [[wallet]] = await db.query(
//       `SELECT w.*, o.id ownerId
//        FROM wallets w
//        JOIN wallet_owners o ON w.ownerId=o.id
//        WHERE o.phoneNumber=?`,
//       [phoneNumber]
//     );
//     if (!wallet) return res.status(404).json({ error: "Wallet not found" });

//     // Check phoneNumber
//     if (wallet.phoneNumber !== phoneNumber) return res.status(401).json({ error: "Wrong PhoneNumber" });

//     // Fetch ledger
//     const [[ledger]] = await db.query("SELECT * FROM ledger_accounts WHERE id='LEDGER_MASTER'");
//     if (!ledger || ledger.balance < amount) return res.status(400).json({ error: "Ledger insufficient" });

//     const fees = Math.round(amount * 0.01);
//     const tx1 = uuid(), tx2 = uuid();

//     // Update balances
//     await db.query("UPDATE wallets SET balance=balance+? WHERE id=?", [amount, wallet.id]);
//     await db.query("UPDATE ledger_accounts SET balance=balance-?+? WHERE id='LEDGER_MASTER'", [amount, fees]);

//     // Insert transactions
//     await db.query(
//       `INSERT INTO transactions (id,type,fromAccountId,toAccountId,amount,fees,description,status,timestamp)
//        VALUES (?,?,?,?,?,?,?,?,NOW())`,
//       [tx1,'wallet_recharge','LEDGER_MASTER',wallet.id,amount,fees,'Recharge','completed']
//     );
//     await db.query(
//       `INSERT INTO transactions (id,type,fromAccountId,toAccountId,amount,fees,description,status,timestamp)
//        VALUES (?,?,?,?,?,?,?,?,NOW())`,
//       [tx2,'ledger_debit',wallet.id,'LEDGER_MASTER',amount,fees,'Debit ledger','completed']
//     );

//     res.json({ success:true });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ success:false, error: err.message });
//   }
// });

// ============================
// TRANSFER BETWEEN WALLETS
// ============================
walletRouter.post("/transfer", async (req, res) => {
  try {
    const { fromPhone, toPhone, amount, description, pin } = req.body;
    const fees = Math.round(amount * 0.02);

    // Fetch sender
    const [[sender]] = await db.query(
      `SELECT w.*, o.id oid
       FROM wallets w
       JOIN wallet_owners o ON w.ownerId=o.id
       WHERE o.phoneNumber=?`,
      [fromPhone]
    );
    if (!sender) return res.status(404).json({ error: "Sender not found" });
    if (sender.pin !== pin) return res.status(401).json({ error: "Wrong PIN" });

    // Fetch receiver
    const [[receiver]] = await db.query(
      `SELECT w.*, o.id oid
       FROM wallets w
       JOIN wallet_owners o ON w.ownerId=o.id
       WHERE o.phoneNumber=?`,
      [toPhone]
    );
    if (!receiver) return res.status(404).json({ error: "Receiver not found" });

    if (sender.balance < amount + fees) return res.status(400).json({ error: "Insufficient balance" });

    // Update balances
    await db.query("UPDATE wallets SET balance=balance-? WHERE id=?", [amount+fees, sender.id]);
    await db.query("UPDATE wallets SET balance=balance+? WHERE id=?", [amount, receiver.id]);
    await db.query("UPDATE ledger_accounts SET balance=balance+? WHERE id='LEDGER_MASTER'", [fees]);

    const tx = uuid();
    await db.query(
      `INSERT INTO transactions (id,type,fromAccountId,toAccountId,amount,fees,description,status,timestamp)
       VALUES (?,?,?,?,?,?,?,?,NOW())`,
      [tx,'wallet_transfer',sender.id,receiver.id,amount,fees,description,'completed']
    );

    res.json({ success:true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success:false, error: err.message });
  }
});

// ============================
// GET TRANSACTIONS
// ============================
walletRouter.get("/:phoneNumber/transactions", async (req,res)=>{
  const limit = +req.query.limit || 20;
  const [[{ id: walletId }]] =
    await db.query(`SELECT w.id FROM wallets w JOIN wallet_owners o ON w.ownerId=o.id
                    WHERE o.phoneNumber=?`,[req.params.phoneNumber]);

  const [rows] = await db.query(
    `SELECT * FROM transactions WHERE fromAccountId=? OR toAccountId=?
     ORDER BY timestamp DESC LIMIT ?`, [walletId,walletId,limit]
  );

  res.json(rows);
});
