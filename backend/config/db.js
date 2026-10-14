const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

function buildPoolConfig() {
  const databaseUrl = (process.env.DATABASE_URL || '').trim();

  // Preferir DATABASE_URL siempre que exista (Render/Neon/etc.)
  if (databaseUrl) {
    return {
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 15000,
      idleTimeoutMillis: 30000,
      max: 10,
    };
  }

  if (process.env.NODE_ENV === 'production') {
    console.error(
      '❌ DATABASE_URL no está definida en producción. Las consultas a PostgreSQL fallarán.'
    );
  }

  return {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
    max: 10,
  };
}

const poolConfig = buildPoolConfig();
const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('❌ Error inesperado en el pool de PostgreSQL:', err?.message || err);
});

pool
  .query('SELECT 1 AS ok')
  .then(() => {
    console.log('✅ PostgreSQL conectado');
  })
  .catch((err) => {
    console.error('❌ Error conectar al PostgreSQL:', err?.message || err);
    if (!process.env.DATABASE_URL && process.env.NODE_ENV === 'production') {
      console.error('   → Configura DATABASE_URL en las variables de entorno del servidor.');
    }
  });

module.exports = pool;
