const pool = require('../config/db');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const util = require('util');

const execFileAsync = util.promisify(execFile);

const BACKUPS_DIR = path.join(__dirname, '../backups');

class RespaldoModel {
  static getBackupsDir() {
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }
    return BACKUPS_DIR;
  }

  static async ensureSchema() {
    await pool.query(`
      ALTER TABLE historial_respaldos
        ADD COLUMN IF NOT EXISTS ruta_archivo TEXT
    `);
    await pool.query(`
      ALTER TABLE historial_respaldos
        ADD COLUMN IF NOT EXISTS origen VARCHAR(20) DEFAULT 'manual'
    `);
  }

  static async registrarHistorial({
    id_usuario,
    usuario_nombre,
    nombre_archivo,
    tipo = 'completo',
    tamanio_bytes = 0,
    estado = 'completado',
    observaciones = null,
    ruta_archivo = null,
    origen = 'manual',
  }) {
    const result = await pool.query(
      `INSERT INTO historial_respaldos (
        id_usuario, usuario_nombre, nombre_archivo, tipo, tamanio_bytes,
        estado, observaciones, ruta_archivo, origen
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *`,
      [
        id_usuario,
        usuario_nombre,
        nombre_archivo,
        tipo,
        tamanio_bytes,
        estado,
        observaciones,
        ruta_archivo,
        origen,
      ]
    );
    return result.rows[0];
  }

  static async getHistorial(limit = 50) {
    const result = await pool.query(
      `SELECT * FROM historial_respaldos
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  static async getById(id) {
    const result = await pool.query(
      `SELECT * FROM historial_respaldos WHERE id_respaldo = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async getUltimoAutomatico() {
    const result = await pool.query(
      `SELECT * FROM historial_respaldos
       WHERE COALESCE(origen, tipo) IN ('automatico')
         AND estado = 'completado'
       ORDER BY created_at DESC
       LIMIT 1`
    );
    return result.rows[0] || null;
  }

  static async getEstadoProgramacion(diasIntervalo = 15) {
    const ultimo = await this.getUltimoAutomatico();
    const ahora = new Date();
    let proximo = null;
    let diasDesdeUltimo = null;
    let debeEjecutar = true;

    if (ultimo?.created_at) {
      const last = new Date(ultimo.created_at);
      diasDesdeUltimo = (ahora.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
      debeEjecutar = diasDesdeUltimo >= diasIntervalo;
      proximo = new Date(last.getTime() + diasIntervalo * 24 * 60 * 60 * 1000);
    } else {
      proximo = ahora;
    }

    return {
      intervalo_dias: diasIntervalo,
      ultimo_automatico: ultimo
        ? {
            id_respaldo: ultimo.id_respaldo,
            created_at: ultimo.created_at,
            nombre_archivo: ultimo.nombre_archivo,
            tamanio_bytes: ultimo.tamanio_bytes,
          }
        : null,
      dias_desde_ultimo: diasDesdeUltimo != null ? Math.floor(diasDesdeUltimo) : null,
      proximo_automatico: proximo,
      debe_ejecutar: debeEjecutar,
    };
  }

  static async listarTablas() {
    const result = await pool.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    return result.rows.map((r) => r.tablename);
  }

  /**
   * Genera un dump SQL programático (fallback si pg_dump no está disponible).
   */
  static async generarDumpSQL() {
    const tablas = await this.listarTablas();
    const lineas = [];
    const ahora = new Date().toISOString();

    lineas.push(`-- Respaldo IADEY`);
    lineas.push(`-- Generado: ${ahora}`);
    lineas.push(`-- Base de datos: ${process.env.DB_NAME || 'iadey'}`);
    lineas.push(`SET client_encoding = 'UTF8';`);
    lineas.push(`BEGIN;`);
    lineas.push('');

    for (const tabla of tablas) {
      if (tabla === 'historial_respaldos') continue;

      lineas.push(`-- ========================================`);
      lineas.push(`-- Tabla: ${tabla}`);
      lineas.push(`-- ========================================`);
      lineas.push(`TRUNCATE TABLE "${tabla}" CASCADE;`);

      const data = await pool.query(`SELECT * FROM "${tabla}"`);
      if (data.rows.length === 0) {
        lineas.push(`-- (sin registros)`);
        lineas.push('');
        continue;
      }

      const columns = data.fields.map((f) => `"${f.name}"`);
      for (const row of data.rows) {
        const values = data.fields.map((f) => {
          const val = row[f.name];
          if (val === null || val === undefined) return 'NULL';
          if (typeof val === 'number') return String(val);
          if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
          if (val instanceof Date) return `'${val.toISOString()}'`;
          if (typeof val === 'object') {
            return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
          }
          return `'${String(val).replace(/'/g, "''")}'`;
        });
        lineas.push(
          `INSERT INTO "${tabla}" (${columns.join(', ')}) VALUES (${values.join(', ')});`
        );
      }
      lineas.push('');
    }

    lineas.push('COMMIT;');
    lineas.push(`-- Fin del respaldo`);

    return Buffer.from(lineas.join('\n'), 'utf8');
  }

  /**
   * Intenta pg_dump; si falla, usa dump programático.
   */
  static async generarRespaldo() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const nombreArchivo = `respaldo_iadey_${timestamp}.sql`;

    try {
      const tmpFile = path.join(os.tmpdir(), nombreArchivo);
      const env = { ...process.env, PGPASSWORD: process.env.DB_PASSWORD || '' };

      const args = [
        '-h', process.env.DB_HOST || 'localhost',
        '-p', String(process.env.DB_PORT || 5432),
        '-U', process.env.DB_USER || 'postgres',
        '-d', process.env.DB_NAME || 'iadey',
        '-F', 'p',
        '--no-owner',
        '--no-acl',
        '-f', tmpFile,
      ];

      if (process.env.DATABASE_URL && process.env.NODE_ENV === 'production') {
        await execFileAsync(
          'pg_dump',
          [process.env.DATABASE_URL, '-F', 'p', '--no-owner', '--no-acl', '-f', tmpFile],
          { env, timeout: 120000 }
        );
      } else {
        await execFileAsync('pg_dump', args, { env, timeout: 120000 });
      }

      const buffer = fs.readFileSync(tmpFile);
      try {
        fs.unlinkSync(tmpFile);
      } catch (_) {
        /* ignore */
      }

      return { buffer, nombreArchivo, metodo: 'pg_dump' };
    } catch (error) {
      console.warn('pg_dump no disponible, usando dump programático:', error.message);
      const buffer = await this.generarDumpSQL();
      return { buffer, nombreArchivo, metodo: 'programatico' };
    }
  }

  /** Guarda el buffer en disco y registra historial (automático o manual en servidor). */
  static async guardarEnDisco({
    buffer,
    nombreArchivo,
    metodo,
    origen = 'automatico',
    id_usuario = null,
    usuario_nombre = 'Sistema (automático)',
  }) {
    const dir = this.getBackupsDir();
    const ruta_archivo = path.join(dir, nombreArchivo);
    fs.writeFileSync(ruta_archivo, buffer);

    const registro = await this.registrarHistorial({
      id_usuario,
      usuario_nombre,
      nombre_archivo: nombreArchivo,
      tipo: origen === 'automatico' ? 'automatico' : 'completo',
      tamanio_bytes: buffer.length,
      estado: 'completado',
      observaciones: `${origen === 'automatico' ? 'Automático cada 15 días' : 'Manual guardado en servidor'}. Método: ${metodo}`,
      ruta_archivo,
      origen,
    });

    return { registro, ruta_archivo };
  }

  static resolverRutaArchivo(registro) {
    if (!registro) return null;
    if (registro.ruta_archivo && fs.existsSync(registro.ruta_archivo)) {
      return registro.ruta_archivo;
    }
    const candidate = path.join(this.getBackupsDir(), registro.nombre_archivo);
    if (fs.existsSync(candidate)) return candidate;
    return null;
  }
}

module.exports = RespaldoModel;
