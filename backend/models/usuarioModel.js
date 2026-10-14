// models/UsuarioModel.js
const pool = require('../config/db');
const { validarNumeroCuentaVE } = require('../utils/cuentaBancariaVE');

class UsuarioModel {
  // Obtener todos los usuarios con datos de persona y rol
  static async getAll() {
  const result = await pool.query(`
    SELECT u.*, 
           p.nacionalidad, p.nombres, p.apellidos, p.fecha_nacimiento, 
           p.telefono, p.correo, p.estado_civil, p.direccion, p.estado as estado_persona, 
           p.municipio, p.parroquia, p.tipo_persona,
           r.id_rol, r.nombre_rol, r.requiere_area, r.unico,
           u.id_area, ar.nombre_area, ar.codigo AS codigo_area,
           CONCAT(p.nombres, ' ', p.apellidos) as nombre_completo
    FROM usuario u
    LEFT JOIN persona p ON u.cedula_usuario = p.cedula
    LEFT JOIN roles r ON u.id_rol_usu = r.id_rol
    LEFT JOIN area ar ON u.id_area = ar.id_area
    ORDER BY u.id
  `);
  return result.rows;
}

// MODIFICAR: Obtener usuario por ID (agregar r.id_rol)
static async getById(id) {
  const result = await pool.query(`
    SELECT u.*, 
           p.nacionalidad, p.nombres, p.apellidos, p.fecha_nacimiento, 
           p.telefono, p.correo, p.estado_civil, p.direccion, p.estado as estado_persona, 
           p.municipio, p.parroquia, p.tipo_persona,
           r.id_rol, r.nombre_rol, r.requiere_area, r.unico,
           u.id_area, ar.nombre_area, ar.codigo AS codigo_area,
           CONCAT(p.nombres, ' ', p.apellidos) as nombre_completo
    FROM usuario u
    LEFT JOIN persona p ON u.cedula_usuario = p.cedula
    LEFT JOIN roles r ON u.id_rol_usu = r.id_rol
    LEFT JOIN area ar ON u.id_area = ar.id_area
    WHERE u.id = $1
  `, [id]);
  return result.rows[0];
}


  // Obtener usuario por cédula con datos de persona y rol
// models/UsuarioModel.js - Método getByCedula CORREGIDO

static async getByCedula(cedula_usuario) {
  const result = await pool.query(`
    SELECT 
      u.id, 
      u.cedula_usuario, 
      u.clave, 
      u.id_rol_usu, 
      u.estatus, 
      u.id_area,
      u.created_at, 
      u.updated_at, 
      u.ultimo_acceso,
      p.nombres, 
      p.apellidos, 
      p.nacionalidad, 
      p.fecha_nacimiento, 
      p.telefono, 
      p.correo, 
      p.estado_civil, 
      p.direccion, 
      p.estado as estado_persona, 
      p.municipio, 
      p.parroquia, 
      p.tipo_persona,
      r.id_rol,
      r.nombre_rol,
      r.requiere_area,
      r.unico,
      ar.nombre_area,
      ar.codigo AS codigo_area,
      CONCAT(p.nombres, ' ', p.apellidos) as nombre_completo
    FROM usuario u
    LEFT JOIN persona p ON u.cedula_usuario = p.cedula
    LEFT JOIN roles r ON u.id_rol_usu = r.id_rol
    LEFT JOIN area ar ON u.id_area = ar.id_area
    WHERE u.cedula_usuario = $1
  `, [cedula_usuario]);
  
  const user = result.rows[0];
  
  if (!user) return null;
  
  // Formatear la respuesta con todos los campos necesarios
  return {
    id: user.id,
    cedula_usuario: user.cedula_usuario,
    clave: user.clave,
    id_rol_usu: user.id_rol_usu,
    nombre_rol: user.nombre_rol, // Asegurar que esté presente
    rol: user.nombre_rol, // Para compatibilidad
    requiere_area: user.requiere_area,
    unico: user.unico,
    id_area: user.id_area || null,
    nombre_area: user.nombre_area || null,
    codigo_area: user.codigo_area || null,
    estatus: user.estatus,
    created_at: user.created_at,
    updated_at: user.updated_at,
    ultimo_acceso: user.ultimo_acceso,
    nombre_completo: user.nombre_completo || `${user.nombres || ''} ${user.apellidos || ''}`.trim(),
    nombres: user.nombres,
    apellidos: user.apellidos,
    persona: {
      nombres: user.nombres,
      apellidos: user.apellidos,
      nombre_completo: user.nombre_completo || `${user.nombres || ''} ${user.apellidos || ''}`.trim(),
      nacionalidad: user.nacionalidad,
      fecha_nacimiento: user.fecha_nacimiento,
      telefono: user.telefono,
      correo: user.correo,
      estado_civil: user.estado_civil,
      direccion: user.direccion,
      estado: user.estado_persona,
      municipio: user.municipio,
      parroquia: user.parroquia,
      tipo_persona: user.tipo_persona
    }
  };
}

  // Crear usuario (con id_rol_usu)
  static async create(data) {
    const { cedula_usuario, clave, id_rol_usu, estatus, id_area } = data;
    
    const result = await pool.query(
      `INSERT INTO usuario (cedula_usuario, clave, id_rol_usu, estatus, id_area)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, cedula_usuario, id_rol_usu, estatus, id_area, created_at`,
      [cedula_usuario, clave, id_rol_usu || 1, estatus || 'activo', id_area || null]
    );
    return result.rows[0];
  }

  // Actualizar usuario
  static async update(id, data) {
  const { id_rol_usu, estatus, id_area } = data;
  
  let query = 'UPDATE usuario SET updated_at = CURRENT_TIMESTAMP';
  const params = [];
  let paramCount = 1;

  if (id_rol_usu !== undefined) {
    query += `, id_rol_usu = $${paramCount}`;
    params.push(id_rol_usu);
    paramCount++;
  }

  if (estatus !== undefined) {
    query += `, estatus = $${paramCount}`;
    params.push(estatus);
    paramCount++;
  }

  if (id_area !== undefined) {
    query += `, id_area = $${paramCount}`;
    params.push(id_area === '' || id_area === 0 ? null : id_area);
    paramCount++;
  }

  // Si no hay campos para actualizar, retornar error
  if (params.length === 0) {
    throw new Error('No se proporcionaron campos para actualizar');
  }

  query += ` WHERE id = $${paramCount} RETURNING id, cedula_usuario, id_rol_usu, estatus, id_area, created_at, updated_at`;
  params.push(id);

  const result = await pool.query(query, params);
  return result.rows[0];
}

  // Actualizar contraseña
  static async updatePassword(id, nuevaClave) {
    const result = await pool.query(
      `UPDATE usuario SET clave = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 RETURNING id, cedula_usuario`,
      [nuevaClave, id]
    );
    return result.rows[0];
  }

  // Actualizar último acceso
  static async updateUltimoAcceso(cedula_usuario) {
    const result = await pool.query(
      `UPDATE usuario SET ultimo_acceso = CURRENT_TIMESTAMP
       WHERE cedula_usuario = $1 RETURNING *`,
      [cedula_usuario]
    );
    return result.rows[0];
  }

  // Eliminar usuario
  static async delete(id) {
    const result = await pool.query('DELETE FROM usuario WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }

  // Cambiar estatus del usuario
  static async cambiarEstatus(id, estatus) {
    const result = await pool.query(
      `UPDATE usuario SET estatus = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 RETURNING *`,
      [estatus, id]
    );
    return result.rows[0];
  }

  // Obtener usuarios por rol con datos de persona
  static async getByRol(id_rol) {
    const result = await pool.query(`
      SELECT u.*, 
             p.nacionalidad, p.nombres, p.apellidos, p.fecha_nacimiento, 
             p.telefono, p.correo, p.estado_civil, p.direccion, p.estado as estado_persona, 
             p.municipio, p.parroquia, p.tipo_persona,
             r.nombre_rol,
             CONCAT(p.nombres, ' ', p.apellidos) as nombre_completo
      FROM usuario u
      LEFT JOIN persona p ON u.cedula_usuario = p.cedula
      LEFT JOIN roles r ON u.id_rol_usu = r.id_rol
      WHERE u.id_rol_usu = $1
      ORDER BY u.id
    `, [id_rol]);
    return result.rows;
  }

  /** Inspectores: por nombre de rol; fallback id_rol_usu = 3 */
  static async getInspectores() {
    const result = await pool.query(`
      SELECT u.id, u.cedula_usuario, u.id_rol_usu, u.estatus, u.ultimo_acceso, u.created_at,
             p.nombres, p.apellidos, p.correo, p.telefono,
             CONCAT(p.nombres, ' ', p.apellidos) as nombre_completo,
             r.id_rol, r.nombre_rol
      FROM usuario u
      LEFT JOIN persona p ON u.cedula_usuario = p.cedula
      INNER JOIN roles r ON u.id_rol_usu = r.id_rol
      WHERE LOWER(TRIM(r.nombre_rol)) = 'inspector'
         OR LOWER(TRIM(r.nombre_rol)) LIKE '%inspector%'
         OR u.id_rol_usu = 3
      ORDER BY p.nombres NULLS LAST, p.apellidos NULLS LAST, u.id
    `);
    return result.rows;
  }

  // Crear persona y usuario en una transacción
  static async createPersonaYUsuario(personaData, usuarioData) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insertar persona
      const personaResult = await client.query(`
        INSERT INTO persona (
          nacionalidad, cedula, nombres, apellidos, fecha_nacimiento, 
          telefono, correo, estado_civil, direccion, estado, municipio, 
          parroquia, tipo_persona
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `, [
        personaData.nacionalidad,
        personaData.cedula,
        personaData.nombres,
        personaData.apellidos,
        personaData.fecha_nacimiento,
        personaData.telefono,
        personaData.correo,
        personaData.estado_civil,
        personaData.direccion,
        personaData.estado,
        personaData.municipio,
        personaData.parroquia,
        personaData.tipo_persona
      ]);

      // Insertar usuario con id_rol_usu
      const usuarioResult = await client.query(`
        INSERT INTO usuario (cedula_usuario, clave, id_rol_usu, estatus)
        VALUES ($1, $2, $3, $4)
        RETURNING id, cedula_usuario, id_rol_usu, estatus, created_at
      `, [
        personaData.cedula,
        usuarioData.clave,
        usuarioData.id_rol_usu,
        usuarioData.estatus || 'activo'
      ]);

      await client.query('COMMIT');

      return {
        persona: personaResult.rows[0],
        usuario: usuarioResult.rows[0]
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Registro completo de emprendedor (persona + usuario + bancos) en una sola transacción.
   * Evita el error de FK cuando persona no se creó o el correo estaba duplicado.
   */
  static async registrarEmprendedorCompleto({ persona, claveHasheada, bancos = [] }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const cedula = String(persona.cedula || '').trim();
      const correo = String(persona.correo || '').trim().toLowerCase();
      if (!cedula) throw Object.assign(new Error('La cédula es requerida'), { status: 400 });
      if (!correo) throw Object.assign(new Error('El correo es requerido'), { status: 400 });

      // Rol Emprendedor por nombre (nunca asumir id=1)
      const rolRes = await client.query(`
        SELECT id_rol FROM roles
        WHERE LOWER(TRIM(nombre_rol)) = 'emprendedor'
        ORDER BY id_rol LIMIT 1
      `);
      if (!rolRes.rows[0]) {
        throw Object.assign(
          new Error('No existe el rol Emprendedor en el sistema'),
          { status: 500 }
        );
      }
      const idRolEmprendedor = rolRes.rows[0].id_rol;

      // ¿Ya hay usuario con esa cédula?
      const userExist = await client.query(
        'SELECT id FROM usuario WHERE cedula_usuario = $1 LIMIT 1',
        [cedula]
      );
      if (userExist.rows[0]) {
        throw Object.assign(
          new Error('Esta cédula ya tiene una cuenta. Inicia sesión o recupera tu contraseña.'),
          { status: 400 }
        );
      }

      // Persona existente o nueva
      let personaRow = (
        await client.query('SELECT * FROM persona WHERE cedula = $1 LIMIT 1', [cedula])
      ).rows[0];

      if (!personaRow) {
        // Correo no puede pertenecer a otra persona
        const correoOtro = await client.query(
          'SELECT cedula FROM persona WHERE LOWER(TRIM(correo)) = $1 LIMIT 1',
          [correo]
        );
        if (correoOtro.rows[0]) {
          throw Object.assign(
            new Error('Ya existe una persona con este correo. Usa otro correo o inicia sesión.'),
            { status: 400 }
          );
        }

        const ins = await client.query(
          `INSERT INTO persona (
            nacionalidad, cedula, nombres, apellidos, fecha_nacimiento,
            telefono, correo, estado_civil, direccion, estado, municipio,
            parroquia, tipo_persona
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
          RETURNING *`,
          [
            persona.nacionalidad,
            cedula,
            persona.nombres,
            persona.apellidos,
            persona.fecha_nacimiento,
            persona.telefono,
            correo,
            persona.estado_civil,
            persona.direccion,
            persona.estado,
            persona.municipio,
            persona.parroquia,
            persona.tipo_persona || 'emprendedor',
          ]
        );
        personaRow = ins.rows[0];
      } else {
        // Misma cédula sin usuario: actualizar datos básicos / validar correo
        const correoOtro = await client.query(
          `SELECT cedula FROM persona
           WHERE LOWER(TRIM(correo)) = $1 AND cedula <> $2
           LIMIT 1`,
          [correo, cedula]
        );
        if (correoOtro.rows[0]) {
          throw Object.assign(
            new Error('Ya existe una persona con este correo. Usa otro correo.'),
            { status: 400 }
          );
        }

        const upd = await client.query(
          `UPDATE persona SET
            nacionalidad = $1, nombres = $2, apellidos = $3, fecha_nacimiento = $4,
            telefono = $5, correo = $6, estado_civil = $7, direccion = $8,
            estado = $9, municipio = $10, parroquia = $11,
            tipo_persona = COALESCE(tipo_persona, 'emprendedor'),
            updated_at = CURRENT_TIMESTAMP
           WHERE cedula = $12
           RETURNING *`,
          [
            persona.nacionalidad,
            persona.nombres,
            persona.apellidos,
            persona.fecha_nacimiento,
            persona.telefono,
            correo,
            persona.estado_civil,
            persona.direccion,
            persona.estado,
            persona.municipio,
            persona.parroquia,
            cedula,
          ]
        );
        personaRow = upd.rows[0];
      }

      const usuarioRes = await client.query(
        `INSERT INTO usuario (cedula_usuario, clave, id_rol_usu, estatus)
         VALUES ($1, $2, $3, 'activo')
         RETURNING id, cedula_usuario, id_rol_usu, estatus, created_at`,
        [cedula, claveHasheada, idRolEmprendedor]
      );

      const bancosCreados = [];
      if (!Array.isArray(bancos) || bancos.length === 0) {
        throw Object.assign(
          new Error('Debe indicar al menos un banco y su número de cuenta'),
          { status: 400 }
        );
      }

      const codigosRes = await client.query(
        `SELECT codigo_banco FROM bancos
         WHERE COALESCE(activo, TRUE) = TRUE
           AND codigo_banco IS NOT NULL
           AND TRIM(codigo_banco) <> ''`
      );
      const codigosValidos = codigosRes.rows.map((r) => r.codigo_banco);

      await client.query(
        `UPDATE persona_bancos SET activo = FALSE WHERE cedula_persona = $1`,
        [cedula]
      );
      for (const item of bancos) {
        if (!item?.id_banco) continue;

        const bancoRes = await client.query(
          `SELECT id_banco, nombre, codigo_banco FROM bancos
           WHERE id_banco = $1 AND COALESCE(activo, TRUE) = TRUE`,
          [item.id_banco]
        );
        if (!bancoRes.rows[0]) {
          throw Object.assign(
            new Error('Uno de los bancos seleccionados no es válido o está inactivo'),
            { status: 400 }
          );
        }

        const validacion = validarNumeroCuentaVE(item.numero_cuenta, {
          codigoBancoSeleccionado: bancoRes.rows[0].codigo_banco,
          codigosValidos,
        });
        if (!validacion.ok) {
          throw Object.assign(
            new Error(
              `${bancoRes.rows[0].nombre}: ${validacion.error}`
            ),
            { status: 400 }
          );
        }

        const br = await client.query(
          `INSERT INTO persona_bancos (
            cedula_persona, id_banco, tipo_cuenta, numero_cuenta, es_preferida, activo
          ) VALUES ($1,$2,$3,$4,$5,TRUE)
          ON CONFLICT (cedula_persona, id_banco, numero_cuenta)
          DO UPDATE SET
            tipo_cuenta = EXCLUDED.tipo_cuenta,
            es_preferida = EXCLUDED.es_preferida,
            activo = TRUE
          RETURNING *`,
          [
            cedula,
            item.id_banco,
            item.tipo_cuenta || 'Ahorro',
            validacion.numero,
            !!item.es_preferida,
          ]
        );
        bancosCreados.push(br.rows[0]);
      }

      if (bancosCreados.length === 0) {
        throw Object.assign(
          new Error('Debe indicar al menos un banco y su número de cuenta'),
          { status: 400 }
        );
      }

      await client.query('COMMIT');
      return {
        persona: personaRow,
        usuario: usuarioRes.rows[0],
        bancos: bancosCreados,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Actualizar datos de persona asociada al usuario
  static async updatePersona(cedula, personaData) {
    const result = await pool.query(`
      UPDATE persona SET
        nombres = $1,
        apellidos = $2,
        fecha_nacimiento = $3,
        telefono = $4,
        correo = $5,
        estado_civil = $6,
        direccion = $7,
        estado = $8,
        municipio = $9,
        parroquia = $10,
        updated_at = CURRENT_TIMESTAMP
      WHERE cedula = $12
      RETURNING *
    `, [
      personaData.nombres,
      personaData.apellidos,
      personaData.fecha_nacimiento,
      personaData.telefono,
      personaData.correo,
      personaData.estado_civil,
      personaData.direccion,
      personaData.estado,
      personaData.municipio,
      personaData.parroquia,
      cedula
    ]);
    return result.rows[0];
  }

  static async getRoles() {
    const result = await pool.query(
      `SELECT id_rol, nombre_rol, requiere_area, unico FROM roles
       WHERE COALESCE(activo, TRUE) = TRUE
       ORDER BY id_rol`
    );
    return result.rows;
  }

  /** Clasifica roles únicos del sistema: administrador | presidente | null */
  static clasificarRolUnico(nombreRol) {
    const n = String(nombreRol || '').toLowerCase().trim();
    if (n === 'administrador' || n === 'admin' || n.startsWith('administrador')) {
      return 'administrador';
    }
    if (n.includes('presid')) return 'presidente';
    return null;
  }

  /**
   * ¿Hay un usuario ACTIVO con rol Administrador o Presidente?
   * @param {'administrador'|'presidente'} tipo
   * @param {number|null} excludeUserId - excluir este usuario (edición)
   */
  static async existeActivoRolUnico(tipo, excludeUserId = null) {
    const roleCond =
      tipo === 'administrador'
        ? `LOWER(TRIM(r.nombre_rol)) IN ('administrador', 'admin')
           OR LOWER(TRIM(r.nombre_rol)) LIKE 'administrador%'`
        : `LOWER(TRIM(r.nombre_rol)) LIKE '%presid%'`;

    const params = [];
    let excludeSql = '';
    if (excludeUserId) {
      params.push(excludeUserId);
      excludeSql = `AND u.id <> $${params.length}`;
    }

    const result = await pool.query(
      `SELECT u.id
       FROM usuario u
       INNER JOIN roles r ON r.id_rol = u.id_rol_usu
       WHERE LOWER(TRIM(COALESCE(u.estatus, ''))) = 'activo'
         AND (${roleCond})
         ${excludeSql}
       LIMIT 1`,
      params
    );
    return result.rows.length > 0;
  }

  /**
   * Impide asignar Admin/Presidente si ya hay uno activo (salvo el mismo usuario).
   */
  static async assertRolUnicoDisponible(idRol, excludeUserId = null) {
    if (!idRol) return true;
    const rolRes = await pool.query(
      'SELECT id_rol, nombre_rol FROM roles WHERE id_rol = $1',
      [idRol]
    );
    if (!rolRes.rows[0]) throw new Error('Rol no encontrado');

    const tipo = this.clasificarRolUnico(rolRes.rows[0].nombre_rol);
    if (!tipo) return true;

    const ocupado = await this.existeActivoRolUnico(tipo, excludeUserId);
    if (ocupado) {
      throw new Error(
        tipo === 'presidente'
          ? 'Ya existe un Presidente(a) activo. Solo puede haber uno. Inactiva el actual para asignar este rol.'
          : 'Ya existe un Administrador activo. Solo puede haber uno. Inactiva el actual para asignar este rol.'
      );
    }
    return true;
  }

  /**
   * Roles para el selector de alta/edición.
   * Oculta Admin/Presidente si ya hay un usuario activo con ese rol
   * (excepto el usuario que se está editando).
   */
  static async getRolesDisponibles(excludeUserId = null) {
    const roles = await this.getRoles();
    const disponibles = [];
    for (const rol of roles) {
      const tipo = this.clasificarRolUnico(rol.nombre_rol);
      if (!tipo) {
        disponibles.push(rol);
        continue;
      }
      const ocupado = await this.existeActivoRolUnico(tipo, excludeUserId);
      if (!ocupado) disponibles.push(rol);
    }
    return disponibles;
  }

  /**
   * Datos del Presidente(a) ACTIVO (para firmas / exportaciones).
   */
  static async getPresidenteActivo() {
    const result = await pool.query(`
      SELECT
        u.id,
        u.cedula_usuario,
        u.estatus,
        r.id_rol,
        r.nombre_rol,
        p.nombres,
        p.apellidos,
        p.telefono,
        p.correo,
        TRIM(CONCAT(COALESCE(p.nombres, ''), ' ', COALESCE(p.apellidos, ''))) AS nombre_completo
      FROM usuario u
      INNER JOIN roles r ON r.id_rol = u.id_rol_usu
      LEFT JOIN persona p ON p.cedula = u.cedula_usuario
      WHERE LOWER(TRIM(r.nombre_rol)) LIKE '%presid%'
        AND LOWER(TRIM(COALESCE(u.estatus, ''))) = 'activo'
      ORDER BY u.id ASC
      LIMIT 1
    `);
    return result.rows[0] || null;
  }

  static async assertAreaSegunRol(idRol, idArea) {
    if (!idRol) return true;
    const rolRes = await pool.query(
      'SELECT id_rol, nombre_rol, requiere_area FROM roles WHERE id_rol = $1',
      [idRol]
    );
    const rol = rolRes.rows[0];
    if (!rol) throw new Error('Rol no encontrado');
    const n = String(rol.nombre_rol || '').toLowerCase();
    const requiere =
      Boolean(rol.requiere_area) ||
      n === 'director' ||
      n.startsWith('director') ||
      n.includes('secretar') ||
      n.includes('inspect');
    if (requiere && !idArea) {
      throw new Error(
        `El rol "${rol.nombre_rol}" requiere un área (Presidencia, Administración, Cobranzas, etc.)`
      );
    }
    return true;
  }

  /**
   * ¿Existe al menos un usuario administrativo?
   * - Rol Administrador/Admin, o
   * - Cualquier usuario cuyo rol NO sea Emprendedor
   */
  static async existeAdministrador() {
    const result = await pool.query(`
      SELECT COUNT(*)::int AS total
      FROM usuario u
      INNER JOIN roles r ON u.id_rol_usu = r.id_rol
      WHERE LOWER(TRIM(r.nombre_rol)) IN ('administrador', 'admin')
         OR LOWER(TRIM(r.nombre_rol)) LIKE 'administrador%'
         OR LOWER(TRIM(r.nombre_rol)) NOT IN ('emprendedor')
    `);
    return result.rows[0].total > 0;
  }

  static async getRolEmprendedorId() {
    const result = await pool.query(`
      SELECT id_rol FROM roles
      WHERE LOWER(TRIM(nombre_rol)) = 'emprendedor'
      ORDER BY id_rol LIMIT 1
    `);
    if (result.rows[0]) return result.rows[0].id_rol;

    const created = await pool.query(`
      INSERT INTO roles (nombre_rol) VALUES ('Emprendedor')
      RETURNING id_rol
    `);
    return created.rows[0].id_rol;
  }

  static async esRolEmprendedor(idRol) {
    if (!idRol) return false;
    const result = await pool.query(
      `SELECT LOWER(TRIM(nombre_rol)) AS nombre FROM roles WHERE id_rol = $1`,
      [idRol]
    );
    return result.rows[0]?.nombre === 'emprendedor';
  }

  /**
   * Obtiene o crea el rol Administrador.
   */
  static async obtenerOCrearRolAdministrador() {
    const existing = await pool.query(`
      SELECT id_rol, nombre_rol FROM roles
      WHERE LOWER(TRIM(nombre_rol)) IN ('administrador', 'admin')
      ORDER BY id_rol
      LIMIT 1
    `);
    if (existing.rows[0]) return existing.rows[0];

    const created = await pool.query(`
      INSERT INTO roles (nombre_rol)
      VALUES ('Administrador')
      RETURNING id_rol, nombre_rol
    `);
    return created.rows[0];
  }

  /**
   * Registra el primer administrador del sistema (persona + usuario + permisos).
   * Solo debe llamarse si no existe ningún admin.
   */
  static async registrarPrimerAdministrador(personaData, claveHasheada) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Doble verificación dentro de la transacción
      const check = await client.query(`
        SELECT COUNT(*)::int AS total
        FROM usuario u
        INNER JOIN roles r ON u.id_rol_usu = r.id_rol
        WHERE LOWER(TRIM(r.nombre_rol)) NOT IN ('emprendedor')
      `);
      if (check.rows[0].total > 0) {
        throw Object.assign(new Error('Ya existe un usuario administrativo registrado'), { status: 403 });
      }

      let rol = await client.query(`
        SELECT id_rol, nombre_rol FROM roles
        WHERE LOWER(TRIM(nombre_rol)) IN ('administrador', 'admin')
        ORDER BY id_rol LIMIT 1
      `);
      if (!rol.rows[0]) {
        rol = await client.query(`
          INSERT INTO roles (nombre_rol) VALUES ('Administrador')
          RETURNING id_rol, nombre_rol
        `);
      }
      const idRol = rol.rows[0].id_rol;

      // Persona (si ya existe la cédula, actualizar datos básicos)
      const personaExiste = await client.query(
        'SELECT cedula FROM persona WHERE cedula = $1',
        [personaData.cedula]
      );

      if (personaExiste.rows[0]) {
        await client.query(`
          UPDATE persona SET
            nacionalidad = $1, nombres = $2, apellidos = $3,
            fecha_nacimiento = $4, telefono = $5, correo = $6,
            estado_civil = $7, direccion = $8, estado = $9,
            municipio = $10, parroquia = $11, tipo_persona = $12,
            updated_at = CURRENT_TIMESTAMP
          WHERE cedula = $13
        `, [
          personaData.nacionalidad, personaData.nombres, personaData.apellidos,
          personaData.fecha_nacimiento, personaData.telefono, personaData.correo,
          personaData.estado_civil, personaData.direccion, personaData.estado,
          personaData.municipio, personaData.parroquia, personaData.tipo_persona || 'Administrador',
          personaData.cedula
        ]);
      } else {
        await client.query(`
          INSERT INTO persona (
            nacionalidad, cedula, nombres, apellidos, fecha_nacimiento,
            telefono, correo, estado_civil, direccion, estado, municipio,
            parroquia, tipo_persona
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        `, [
          personaData.nacionalidad, personaData.cedula, personaData.nombres,
          personaData.apellidos, personaData.fecha_nacimiento, personaData.telefono,
          personaData.correo, personaData.estado_civil, personaData.direccion,
          personaData.estado, personaData.municipio, personaData.parroquia,
          personaData.tipo_persona || 'Administrador'
        ]);
      }

      const usuarioExiste = await client.query(
        'SELECT id FROM usuario WHERE cedula_usuario = $1',
        [personaData.cedula]
      );
      if (usuarioExiste.rows[0]) {
        throw Object.assign(new Error('Ya existe un usuario con esta cédula'), { status: 400 });
      }

      const usuarioResult = await client.query(`
        INSERT INTO usuario (cedula_usuario, clave, id_rol_usu, estatus)
        VALUES ($1, $2, $3, 'activo')
        RETURNING id, cedula_usuario, id_rol_usu, estatus, created_at
      `, [personaData.cedula, claveHasheada, idRol]);

      const usuario = usuarioResult.rows[0];

      const permisosCompletos = [
          { menu_item_id: 'dashboard', acciones: '["ver", "estadisticas", "graficos"]' },
          { menu_item_id: 'graficos', acciones: '["ver", "exportar"]' },
          { menu_item_id: 'solicitudes', acciones: '["ver", "crear", "editar", "eliminar", "aprobar", "rechazar", "exportar"]' },
        { menu_item_id: 'expedientes', acciones: '["ver", "crear", "editar", "eliminar", "gestionar_documentos", "exportar"]' },
        { menu_item_id: 'inspecciones', acciones: '["ver", "crear", "editar", "eliminar", "asignar", "exportar"]' },
        { menu_item_id: 'aprobaciones', acciones: '["ver", "evaluar", "aprobar", "rechazar", "ver_historial", "exportar"]' },
        { menu_item_id: 'creditos_banco', acciones: '["ver", "crear", "editar", "eliminar", "cambiar_estado", "exportar"]' },
        { menu_item_id: 'contratos', acciones: '["ver", "crear", "editar", "eliminar", "firmar", "generar", "exportar"]' },
        { menu_item_id: 'desembolsos', acciones: '["ver", "crear", "editar", "eliminar", "aprobar", "ejecutar", "exportar"]' },
        { menu_item_id: 'pagos_cuota', acciones: '["ver", "registrar", "editar", "eliminar", "historial", "reporte", "exportar"]' },
        { menu_item_id: 'config_usuarios', acciones: '["ver", "crear", "editar", "eliminar", "gestionar_permisos", "gestionar_roles", "exportar"]' },
        { menu_item_id: 'config_emprendimientos', acciones: '["ver", "crear", "editar", "eliminar", "exportar"]' },
        { menu_item_id: 'config_roles', acciones: '["ver", "crear", "editar", "eliminar", "exportar"]' },
        { menu_item_id: 'config_contratos', acciones: '["ver", "editar", "exportar"]' },
        { menu_item_id: 'config_requisitos', acciones: '["ver", "crear", "editar", "eliminar", "exportar"]' },
        { menu_item_id: 'config_bancos', acciones: '["ver", "crear", "editar", "eliminar", "exportar"]' },
        { menu_item_id: 'auditoria', acciones: '["ver", "exportar", "limpiar"]' },
        { menu_item_id: 'respaldo_bd', acciones: '["ver", "exportar", "restaurar"]' }
      ];

      for (const p of permisosCompletos) {
        await client.query(
          `INSERT INTO Permisos (id_usu, menu_item_id, acciones) VALUES ($1, $2, $3)`,
          [usuario.id, p.menu_item_id, p.acciones]
        );
      }

      await client.query('COMMIT');

      return {
        usuario: {
          ...usuario,
          nombre_rol: rol.rows[0].nombre_rol,
          nombres: personaData.nombres,
          apellidos: personaData.apellidos,
          correo: personaData.correo
        },
        rol: rol.rows[0]
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

}

module.exports = UsuarioModel;