import express from "express";
import dotenv from "dotenv";
import { walletRouter } from "./routes/wallet.js";
import { adminRouter } from "./routes/admin.js";

dotenv.config();

const app = express();

// 🚨 OBLIGATOIRE AVANT TOUTES LES ROUTES
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/wallet", walletRouter);
app.use("/admin", adminRouter);

app.listen(process.env.PORT || 4000, () =>
  console.log(`API running on port ${process.env.PORT || 4000}`)
);
