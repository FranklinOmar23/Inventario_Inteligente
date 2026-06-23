import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

let pool;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host:                  env.db.host,
      port:                  env.db.port,
      user:                  env.db.user,
      password:              env.db.password,
      database:              env.db.name,
      waitForConnections:    true,
      connectionLimit:       10,
      queueLimit:            0,
      enableKeepAlive:       true,
      keepAliveInitialDelay: 0,
      charset:               'utf8mb4',
      timezone:              '+00:00',
    });
    // Prevent process crash on idle-connection drops from remote MySQL
    pool.on('error', (err) => {
      if (err.fatal) console.warn('[pool] connection dropped, will reconnect:', err.code);
    });
  }
  return pool;
}
