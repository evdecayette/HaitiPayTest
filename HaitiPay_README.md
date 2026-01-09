# HaitiPay Wallet API

A Node.js + Express + MySQL demo e-wallet backend.

## 🚀 Features

-   Create wallet owners
-   Wallet PIN middleware
-   Master ledger account
-   Wallet recharge from ledger
-   Wallet-to-wallet transfer
-   Balance & profile lookup
-   Transaction history

## 📦 Technology Stack

-   Node.js / Express
-   MySQL 8+
-   UUID

## DataBase Script
**************
CREATE TABLE wallet_owners (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),  -- UUID automatique
    firstName VARCHAR(50) NOT NULL,
    lastName VARCHAR(50) NOT NULL,
    phoneNumber VARCHAR(20) UNIQUE NOT NULL,
    dateOfBirth DATE NOT NULL,
    nationalId VARCHAR(20) NOT NULL
);


***************************************
 CREATE TABLE wallets (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    ownerId CHAR(36) NOT NULL,
    pin VARCHAR(255) NOT NULL,
    balance DECIMAL(10,2) DEFAULT 0,
    FOREIGN KEY (ownerId) REFERENCES wallet_owners(id)
);

*********************************
CREATE TABLE ledger_accounts(
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(100) NOT NULL,
    balance DOUBLE DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

);

-- Exemple d’insertion d’un compte ledger
INSERT INTO ledger_accounts (id, balance) VALUES ('LEDGER_MASTER', 1000000);

*********************************
CREATE TABLE transactions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    type VARCHAR(50) NOT NULL,
    fromAccountId CHAR(36) NOT NULL,
    toAccountId CHAR(36) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    fees DECIMAL(10,2) NOT NULL,
    description VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

***********************************

## 🛠 Requirements

-   Node.js \>= 18
-   MySQL running locally
-   npm or yarn

## ▶️ Setup

``` bash
npm install
npm start
```

## 📁 Endpoints

-   POST /wallet/create
-   POST /wallet/recharge
-   POST /wallet/transfer
-   GET /wallet/:phoneNumber/profile
-   GET /wallet/:phoneNumber/balance
-   GET /wallet/:phoneNumber/transactions
