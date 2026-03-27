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

const parseConnectionUrl = (value) => {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return {
      host: parsed.hostname || "",
      port: parsed.port || "",
      user: decodeURIComponent(parsed.username || ""),
      password: decodeURIComponent(parsed.password || ""),
      database: parsed.pathname ? parsed.pathname.replace(/^\/+/, "") : ""
    };
  } catch {
    return null;
  }
};

const databaseUrlValue = readEnvValue("DATABASE_URL");
const mysqlUrlValue = readEnvValue("MYSQL_URL");
const mysqlPublicUrlValue = readEnvValue("MYSQL_PUBLIC_URL");
const connectionUrlEnvName = databaseUrlValue
  ? "DATABASE_URL"
  : mysqlUrlValue
    ? "MYSQL_URL"
    : mysqlPublicUrlValue
      ? "MYSQL_PUBLIC_URL"
      : "";
const connectionUrlValue = databaseUrlValue || mysqlUrlValue || mysqlPublicUrlValue;
const connectionUrlConfig = parseConnectionUrl(connectionUrlValue);

const manualConfig = {
  host: readEnvValue("DB_HOST", "MYSQLHOST"),
  port: readEnvValue("DB_PORT", "MYSQLPORT"),
  user: readEnvValue("DB_USER", "MYSQLUSER"),
  password: readEnvValue("DB_PASSWORD", "MYSQLPASSWORD"),
  database: readEnvValue("DB_NAME", "MYSQLDATABASE")
};

const resolvedConfig = connectionUrlConfig || manualConfig;

const DB_HOST = resolvedConfig.host || "localhost";
const DB_PORT = resolvedConfig.port || "3306";
const DB_USER = resolvedConfig.user || "";
const DB_PASSWORD = resolvedConfig.password || "";
const DB_NAME = resolvedConfig.database || "";

const missingDebugVars = [
  ...collectMissingOrUnresolved("DATABASE_URL", "MYSQL_URL", "MYSQL_PUBLIC_URL"),
  ...collectMissingOrUnresolved("DB_HOST", "MYSQLHOST"),
  ...collectMissingOrUnresolved("DB_PORT", "MYSQLPORT"),
  ...collectMissingOrUnresolved("DB_USER", "MYSQLUSER"),
  ...collectMissingOrUnresolved("DB_PASSWORD", "MYSQLPASSWORD"),
  ...collectMissingOrUnresolved("DB_NAME", "MYSQLDATABASE")
];

if (connectionUrlValue && !connectionUrlConfig) {
  console.warn(`[db] ${connectionUrlEnvName} exists but could not be parsed.`);
}

if (missingDebugVars.length && !connectionUrlConfig) {
  console.warn(
    `[db] Missing or unresolved env vars detected: ${[...new Set(missingDebugVars)].join(", ")}`
  );
}

if (connectionUrlConfig) {
  console.log(`[db] Using ${connectionUrlEnvName} for database connection.`);
} else if (manualConfig.host || manualConfig.port || manualConfig.user || manualConfig.password || manualConfig.database) {
  console.log("[db] Using DB_* env vars for database connection.");
}

if ((connectionUrlConfig || DB_USER) && DB_NAME) {
  console.log(`[db] Target database: ${DB_HOST}:${DB_PORT}/${DB_NAME}`);
}

const missingConfigMessage =
  "Database credentials are missing or unresolved. Set DATABASE_URL or DB_* variables.";

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
