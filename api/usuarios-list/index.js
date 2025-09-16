// GET /api/usuarios-list   (opcional: ?q=texto)
// Devuelve [{ id_usuario, nombre }] detectando dinámicamente la mejor columna de nombre.
const { getPool, sql } = require("../_db");

module.exports = async function (context, req) {
  try {
    const pool = await getPool();

    // 1) Detectar columnas disponibles en dbo.usuario
    const meta = await pool.request()
      .query(`
        SELECT c.name AS col, t.name AS typ
        FROM sys.columns c
        JOIN sys.types t ON c.user_type_id = t.user_type_id
        WHERE c.object_id = OBJECT_ID('dbo.usuario')
        ORDER BY c.column_id
      `);

    const cols = meta.recordset.map(r => ({ name: r.col, typ: r.typ.toLowerCase() }));

    // id: preferimos id_usuario; si no existe, tomamos la primera INT/NUMERIC/IDENTITY
    let idCol = cols.find(c => c.name.toLowerCase() === "id_usuario")?.name;
    if (!idCol) {
      idCol = cols.find(c => ["int","bigint","numeric","decimal"].includes(c.typ))?.name;
    }
    if (!idCol) {
      throw new Error("No encuentro columna de id en dbo.usuario (ej. id_usuario).");
    }

    // nombre: probamos candidatos más comunes; si ninguno existe,
    // usamos la primera columna de tipo texto (nvarchar/varchar)
    const candidates = [
      "nombre", "nombre_completo", "usuario", "login",
      "email", "alias", "username", "display_name", "full_name"
    ];
    let nameCol = candidates.find(n => cols.some(c => c.name.toLowerCase() === n));
    if (!nameCol) {
      nameCol = cols.find(c => ["nvarchar","varchar","nchar","char","text","ntext"].includes(c.typ))?.name;
    }
    if (!nameCol) {
      throw new Error("No encuentro columna de nombre en dbo.usuario.");
    }

    // 2) Construir SQL según si viene filtro q
    const q = (req.query?.q || "").toString().trim();
    let sqlText = `
      SELECT TOP 100
        CAST(${idCol} AS INT) AS id_usuario,
        CAST(${nameCol} AS NVARCHAR(200)) AS nombre
      FROM dbo.usuario
      WHERE ${nameCol} IS NOT NULL AND LTRIM(RTRIM(${nameCol})) <> ''
    `;
    if (q.length >= 2) {
      sqlText += ` AND ${nameCol} LIKE @like `;
    }
    sqlText += ` ORDER BY ${nameCol};`;

    const rs = await pool.request()
      .input("like", sql.NVarChar(210), `%${q}%`)
      .query(sqlText);

    context.res = { status: 200, body: rs.recordset };
  } catch (e) {
    context.log.error("GET /api/usuarios-list ERROR:", e);
    context.res = { status: 500, body: { error: e.message } };
  }
};
