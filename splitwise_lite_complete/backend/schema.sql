-- SplitWise Lite — Full Database Schema
-- Run: sqlite3 instance/splitwise.db < schema.sql

CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    email       TEXT    UNIQUE NOT NULL,
    name        TEXT,
    password_hash TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expenses (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    title       TEXT    NOT NULL,
    amount      NUMERIC(10,2) NOT NULL,
    category    TEXT    NOT NULL,
    date        TEXT    NOT NULL,
    notes       TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS groups (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    created_by  INTEGER NOT NULL REFERENCES users(id),
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS group_members (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id    INTEGER NOT NULL REFERENCES groups(id),
    user_id     INTEGER NOT NULL REFERENCES users(id),
    joined_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, user_id)
);

CREATE TABLE IF NOT EXISTS group_expenses (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id      INTEGER NOT NULL REFERENCES groups(id),
    paid_by       INTEGER NOT NULL REFERENCES users(id),
    title         TEXT    NOT NULL,
    total_amount  NUMERIC(10,2) NOT NULL,
    split_type    TEXT    NOT NULL CHECK(split_type IN ('equal','exact')),
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expense_splits (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    group_expense_id  INTEGER NOT NULL REFERENCES group_expenses(id),
    user_id           INTEGER NOT NULL REFERENCES users(id),
    amount_owed       NUMERIC(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS settlements (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id    INTEGER NOT NULL REFERENCES groups(id),
    paid_by     INTEGER NOT NULL REFERENCES users(id),
    paid_to     INTEGER NOT NULL REFERENCES users(id),
    amount      NUMERIC(10,2) NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
