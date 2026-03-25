import dotenv from "dotenv";
import mysql from "mysql2/promise";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "..", ".env");

dotenv.config({ path: envPath });

const UNRESOLVED_ENV_PATTERN = /^\$\{\{?[^}]+\}?\}$/;

const readEnvValue = (...keys) => {
  for (const key of keys) {
    const rawValue = process.env[key];
    if (rawValue === undefined || rawValue === null) continue;
    const value = String(rawValue).trim();
    if (!value) continue;
    if (UNRESOLVED_ENV_PATTERN.test(value)) continue;
    return value;
  }
  return "";
};

const collectMissingOrUnresolved = (...keys) =>
  keys.filter((key) => {
    const rawValue = process.env[key];
    if (rawValue === undefined || rawValue === null) return true;
    const value = String(rawValue).trim();
    return !value || UNRESOLVED_ENV_PATTERN.test(value);
  });

const DB_HOST = readEnvValue("DB_HOST", "MYSQLHOST") || "localhost";
const DB_PORT = readEnvValue("DB_PORT", "MYSQLPORT") || "3306";
const DB_USER = readEnvValue("DB_USER", "MYSQLUSER");
const DB_PASSWORD = readEnvValue("DB_PASSWORD", "MYSQLPASSWORD");
const DB_NAME = readEnvValue("DB_NAME", "MYSQLDATABASE");

const missingDebugVars = [
  ...collectMissingOrUnresolved("DB_HOST", "MYSQLHOST"),
  ...collectMissingOrUnresolved("DB_PORT", "MYSQLPORT"),
  ...collectMissingOrUnresolved("DB_USER", "MYSQLUSER"),
  ...collectMissingOrUnresolved("DB_PASSWORD", "MYSQLPASSWORD"),
  ...collectMissingOrUnresolved("DB_NAME", "MYSQLDATABASE")
];

if (missingDebugVars.length) {
  console.warn(
    `[db] Missing or unresolved env vars detected: ${[...new Set(missingDebugVars)].join(", ")}`
  );
}

const missingConfigMessage =
  "Database credentials are missing or unresolved. Checked DB_* and Railway MYSQL* variables.";

const createUnavailablePool = () => {
  const error = new Error(missingConfigMessage);
  return {
    query: async () => {
      throw error;
    },
    execute: async () => {
      throw error;
    },
    getConnection: async () => {
      throw error;
    },
    end: async () => {}
  };
};

export const pool =
  DB_USER && DB_PASSWORD && DB_NAME
    ? mysql.createPool({
        host: DB_HOST,
        port: Number(DB_PORT),
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      })
    : createUnavailablePool();
