import dotenv from "dotenv";
import mysql from "mysql2/promise";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "..", ".env");

dotenv.config({ path: envPath });

const DB_HOST = process.env.DB_HOST || process.env.MYSQLHOST || "localhost";
const DB_PORT = process.env.DB_PORT || process.env.MYSQLPORT || 3306;
const DB_USER = process.env.DB_USER || process.env.MYSQLUSER;
const DB_PASSWORD = process.env.DB_PASSWORD || process.env.MYSQLPASSWORD;
const DB_NAME = process.env.DB_NAME || process.env.MYSQLDATABASE;

if (!DB_USER || !DB_PASSWORD || !DB_NAME) {
  throw new Error("Database credentials are missing. Set DB_* or Railway MYSQL* variables.");
}

export const pool = mysql.createPool({
  host: DB_HOST,
  port: Number(DB_PORT),
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
