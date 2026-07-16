const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || "localhost",
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "250520",
  database: process.env.MYSQL_DATABASE || "byteverse_db",
  waitForConnections: true,
  connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 10),
  queueLimit: 0,
  decimalNumbers: true,
  dateStrings: false,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  connectTimeout: Number(process.env.MYSQL_CONNECT_TIMEOUT || 10000),
});

async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function one(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

async function ping() {
  await pool.query("SELECT 1");
  return true;
}

async function waitForDatabase({ retries = 30, delayMs = 2000 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await ping();
      console.log(
        `✅ MySQL disponible (${process.env.MYSQL_HOST || "localhost"}:${process.env.MYSQL_PORT || 3306})`,
      );
      return true;
    } catch (error) {
      lastError = error;
      console.error(
        `⏳ Esperando MySQL (${attempt}/${retries}): ${error.code || error.message}`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

function bool(value) {
  return value === true || value === 1 || value === "1" || value === "true";
}

function toJson(value, fallback = []) {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch (_) {
    return fallback;
  }
}

function rowToApi(row) {
  if (!row) return row;
  const out = { ...row };
  out._id = String(row._id ?? row.id);
  for (const key of Object.keys(out)) {
    if (Buffer.isBuffer(out[key])) out[key] = out[key].toString();
  }
  return out;
}

module.exports = {
  pool,
  query,
  one,
  ping,
  waitForDatabase,
  bool,
  toJson,
  rowToApi,
};
