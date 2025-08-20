// trazabilidad/db.js
const path = require('path');

// Carga .env SÍ o SÍ desde el directorio del proyecto actual
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { Pool } = require('pg');

// Normaliza host para evitar IPv6 si usas 'localhost'
const HOST = (process.env.DB_HOST || '127.0.0.1').trim() === 'localhost'
  ? '127.0.0.1'
  : (process.env.DB_HOST || '127.0.0.1');

const PORT = Number(process.env.DB_PORT || 5431);

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: HOST,
  database: process.env.DB_NAME || 'db_trazabilidad',
  password: process.env.DB_PASSWORD || '',
  port: PORT,
  // timeouts opcionales:
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 10,
});

// Log de verificación (una sola vez)
(async () => {
  try {
    await pool.query('SELECT 1');
    console.log(`✅ PG listo → ${HOST}:${PORT}/${process.env.DB_NAME}`);
  } catch (e) {
    console.error('❌ No se pudo conectar a PG con la config actual:', {
      host: HOST, port: PORT, db: process.env.DB_NAME, user: process.env.DB_USER
    });
    console.error(e.message);
  }
})();

module.exports = pool;
