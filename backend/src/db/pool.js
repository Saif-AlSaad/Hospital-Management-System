// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Database Connection Pool & Transaction Manager
// Plain PostgreSQL driver: 'pg' (node-postgres)
// Strictly NO ORM, NO ODM, NO Query Builder
// ============================================================================

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'hospital_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('connect', () => {
  // Connection established
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client pool', err);
});

/**
 * Execute parameterized query using pool
 * @param {string} text - SQL query with $1, $2 placeholders
 * @param {Array} params - Array of parameter values
 */
const query = (text, params) => pool.query(text, params);

/**
 * Execute a multi-query callback inside an explicit SQL transaction.
 * Guarantees BEGIN, COMMIT, and automatic ROLLBACK on failure.
 * @param {Function} callback - Async function receiving client
 */
const withTransaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  query,
  withTransaction,
};
