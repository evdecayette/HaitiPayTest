import { Router } from "express";
import { db } from "../config/db.js";

export const adminRouter = Router();

adminRouter.get("/ledger/status", async (req,res)=>{
  const [[l]] = await db.query("SELECT * FROM ledger_accounts WHERE id='LEDGER_MASTER'");
  res.json(l);
});

adminRouter.get("/ledger/transactions", async (req,res)=>{
  const limit = +req.query.limit || 50;
  const [rows] = await db.query(
    `SELECT * FROM transactions
     WHERE fromAccountId='LEDGER_MASTER' OR toAccountId='LEDGER_MASTER'
     ORDER BY timestamp DESC LIMIT ?`, [limit]);
  res.json(rows);
});
