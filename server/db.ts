import mysql, { type Pool, type RowDataPacket } from "mysql2/promise";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required database configuration: ${name}`);
  return value;
}

export function createDatabasePool(): Pool {
  const url = process.env.MYSQL_URL || process.env.DATABASE_URL;
  if (url) {
    const parsed = new URL(url);
    if (parsed.protocol !== "mysql:" && parsed.protocol !== "mariadb:") {
      throw new Error("Invalid MySQL connection URL configuration");
    }
    return mysql.createPool({
      uri: url,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      charset: "utf8mb4",
      timezone: "Z",
    });
  }

  const portValue = process.env.MYSQL_PORT;
  const port = portValue ? Number(portValue) : 3306;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Invalid MySQL port configuration");
  }

  return mysql.createPool({
    host: required("MYSQL_HOST"),
    port,
    user: required("MYSQL_USER"),
    password: required("MYSQL_PASSWORD"),
    database: required("MYSQL_DATABASE"),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    charset: "utf8mb4",
    timezone: "Z",
  });
}

const STAFF_CATALOG_MIGRATION = {
  version: "001_sunsensor_staff_catalog",
  statements: [
    `CREATE TABLE IF NOT EXISTS sunsensor_staff_users (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      open_id VARCHAR(191) NOT NULL UNIQUE,
      email VARCHAR(320) NOT NULL,
      name VARCHAR(255) NOT NULL DEFAULT '',
      role VARCHAR(32) NOT NULL DEFAULT 'staff',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_sunsensor_staff_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS sunsensor_staff_sessions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      staff_user_id BIGINT UNSIGNED NOT NULL,
      token_hash CHAR(64) NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_sunsensor_sessions_user FOREIGN KEY (staff_user_id)
        REFERENCES sunsensor_staff_users(id) ON DELETE CASCADE,
      KEY idx_sunsensor_sessions_expiry (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS sunsensor_new_catalog_items (
      id CHAR(36) NOT NULL PRIMARY KEY,
      created_by BIGINT UNSIGNED NOT NULL,
      item_type ENUM('Frame','Lens') NOT NULL,
      name VARCHAR(255) NULL,
      description TEXT NULL,
      price_ksh BIGINT UNSIGNED NULL,
      status ENUM('draft','published') NOT NULL DEFAULT 'draft',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_sunsensor_items_user FOREIGN KEY (created_by)
        REFERENCES sunsensor_staff_users(id),
      KEY idx_sunsensor_items_public (status, updated_at),
      KEY idx_sunsensor_items_owner (created_by, updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS sunsensor_new_catalog_media (
      id CHAR(36) NOT NULL PRIMARY KEY,
      item_id CHAR(36) NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      content_type VARCHAR(127) NOT NULL,
      media_type ENUM('image','video') NOT NULL,
      size_bytes BIGINT UNSIGNED NOT NULL,
      position INT UNSIGNED NOT NULL DEFAULT 0,
      storage_key VARCHAR(512) NOT NULL UNIQUE,
      status ENUM('pending','ready','hidden') NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_sunsensor_media_item FOREIGN KEY (item_id)
        REFERENCES sunsensor_new_catalog_items(id) ON DELETE CASCADE,
      KEY idx_sunsensor_media_item (item_id, status, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  ],
};

export async function initializeSchema(pool: Pool): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.query(`CREATE TABLE IF NOT EXISTS sunsensor_schema_migrations (
      version VARCHAR(96) NOT NULL PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    const [rows] = await connection.execute<(RowDataPacket & { version: string })[]>(
      "SELECT version FROM sunsensor_schema_migrations WHERE version = ? LIMIT 1",
      [STAFF_CATALOG_MIGRATION.version],
    );
    if (rows.length) return;

    for (const statement of STAFF_CATALOG_MIGRATION.statements) {
      await connection.query(statement);
    }
    await connection.execute(
      "INSERT IGNORE INTO sunsensor_schema_migrations (version) VALUES (?)",
      [STAFF_CATALOG_MIGRATION.version],
    );
  } finally {
    connection.release();
  }
}
