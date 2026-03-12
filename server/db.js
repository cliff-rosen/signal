const mysql = require('mysql2/promise');

let pool;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
    });
  }
  return pool;
}

async function initDB() {
  const db = getPool();

  await db.query(`
    CREATE TABLE IF NOT EXISTS namespaces (
      id VARCHAR(12) PRIMARY KEY,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS devices (
      id VARCHAR(100) NOT NULL,
      namespace VARCHAR(12) NOT NULL,
      name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (namespace, id),
      FOREIGN KEY (namespace) REFERENCES namespaces(id) ON DELETE CASCADE
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS content (
      namespace VARCHAR(12) NOT NULL,
      device_id VARCHAR(100) NOT NULL,
      type VARCHAR(20) NOT NULL,
      body LONGTEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (namespace, device_id),
      FOREIGN KEY (namespace, device_id) REFERENCES devices(namespace, id) ON DELETE CASCADE
    )
  `);

  console.log('  Database initialized.');
}

module.exports = { getPool, initDB };
