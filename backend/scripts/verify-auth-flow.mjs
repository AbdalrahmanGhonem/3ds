import dotenv from "dotenv";
import mysql from "mysql2/promise";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(backendRoot, ".env") });

process.env.PORT = "4100";

const port = Number(process.env.PORT);
const baseUrl = `http://127.0.0.1:${port}`;
const email = `codex-verify-${Date.now()}@example.com`;
const password = "Codex123!";

await import("../src/server.js");

const waitForHealth = async () => {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Server did not become ready on ${baseUrl}`);
};

const postJson = async (pathname, body) => {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: response.status, data };
};

const queryUser = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || ""
  });

  try {
    const [rows] = await connection.query(
      "SELECT id, email, full_name, is_admin FROM users WHERE email = ? LIMIT 1",
      [email]
    );
    return rows;
  } finally {
    await connection.end();
  }
};

await waitForHealth();

const signup = await postJson("/api/signup", {
  name: "Codex Verify",
  email,
  password
});

const duplicateSignup = await postJson("/api/signup", {
  name: "Codex Verify",
  email,
  password
});

const login = await postJson("/api/login", {
  email,
  password
});

const dbRows = await queryUser();

console.log(JSON.stringify({ email, signup, duplicateSignup, login, dbRows }, null, 2));
process.exit(
  signup.status === 201 &&
    duplicateSignup.status === 409 &&
    login.status === 200 &&
    dbRows.length === 1
    ? 0
    : 1
);
