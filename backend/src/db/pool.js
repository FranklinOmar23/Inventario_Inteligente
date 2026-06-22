import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

let pool;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host:               env.db.host,
      port:               env.db.port,
      user:               env.db.user,
      password:           env.db.password,
      database:           env.db.name,
      waitForConnections: true,
      connectionLimit:    10,
      charset:            'utf8mb4',
      timezone:           '+00:00',
    });
  }
  return pool;
}
