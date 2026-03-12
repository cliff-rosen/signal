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
      ip_address VARCHAR(45),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS api_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      namespace VARCHAR(12),
      action VARCHAR(50) NOT NULL,
      device VARCHAR(100),
      content_type VARCHAR(20),
      body LONGTEXT,
      ip_address VARCHAR(45),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

  // Add ip_address column if missing (safe for existing tables)
  await db.query(`
    ALTER TABLE namespaces ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45) AFTER id
  `).catch(() => {});

  console.log('  Database initialized.');
}

module.exports = { getPool, initDB };
