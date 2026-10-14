require('dotenv').config();
const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS auditoria (
          id_auditoria SERIAL PRIMARY KEY,
          id_usuario INTEGER,
          usuario_nombre VARCHAR(200),
          modulo VARCHAR(100) NOT NULL,
          accion VARCHAR(50) NOT NULL,
          descripcion TEXT,
          tabla_afectada VARCHAR(100),
          registro_id VARCHAR(100),
          datos_anteriores TEXT,
          datos_nuevos TEXT,
          ip_address VARCHAR(50),
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (id_usuario) REFERENCES usuario(id) ON DELETE SET NULL
      )
    `);

    await client.query('CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON auditoria(created_at DESC)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_auditoria_modulo ON auditoria(modulo)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria(id_usuario)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_auditoria_accion ON auditoria(accion)');

    await client.query(`
      CREATE TABLE IF NOT EXISTS historial_respaldos (
          id_respaldo SERIAL PRIMARY KEY,
          id_usuario INTEGER,
          usuario_nombre VARCHAR(200),
          nombre_archivo VARCHAR(255) NOT NULL,
          tipo VARCHAR(20) DEFAULT 'completo',
          tamanio_bytes BIGINT,
          estado VARCHAR(30) DEFAULT 'completado',
          observaciones TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (id_usuario) REFERENCES usuario(id) ON DELETE SET NULL
      )
    `);

    const users = await client.query('SELECT id FROM usuario ORDER BY id');
    console.log('Usuarios encontrados:', users.rows.map(r => r.id));

    for (const row of users.rows) {
      await client.query(
        `INSERT INTO Permisos (id_usu, menu_item_id, acciones)
         SELECT $1, 'auditoria', $2
         WHERE NOT EXISTS (
           SELECT 1 FROM Permisos WHERE id_usu = $1 AND menu_item_id = 'auditoria'
         )`,
        [row.id, JSON.stringify(['ver', 'exportar', 'limpiar'])]
      );
      await client.query(
        `INSERT INTO Permisos (id_usu, menu_item_id, acciones)
         SELECT $1, 'respaldo_bd', $2
         WHERE NOT EXISTS (
           SELECT 1 FROM Permisos WHERE id_usu = $1 AND menu_item_id = 'respaldo_bd'
         )`,
        [row.id, JSON.stringify(['ver', 'exportar', 'restaurar'])]
      );
    }

    console.log('✅ Migración auditoría/respaldo completada');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error('❌ Error migración:', err.message);
  process.exit(1);
});
