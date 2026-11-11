const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

const connectionString =
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DB_URL;

if (!connectionString) {
  console.error("Error: Se requiere definir DATABASE_URL en las variables de entorno.");
  process.exit(1);
}

async function runMigration() {
  console.log("Conectando a la base de datos Supabase...");
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("¡Conexión establecida con éxito!");

    const sqlPath = path.join(__dirname, "..", "supabase_schema.sql");
    const sql = fs.readFileSync(sqlPath, "utf-8");

    console.log("Ejecutando script de migración SQL...");
    await client.query(sql);

    console.log("Verificando tablas...");
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log("Tablas encontradas:", res.rows.map((r) => r.table_name));
    console.log("=== ¡MIGRACIÓN COMPLETADA CON ÉXITO! ===");
  } catch (err) {
    console.error("Error durante la migración:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
