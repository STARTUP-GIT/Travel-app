import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const res = await pool.query(`
    SELECT table_name, column_name, data_type, column_default
    FROM information_schema.columns 
    WHERE table_name IN ('district', 'app_config', 'brand_config') 
    ORDER BY table_name, ordinal_position
  `);
  console.log(JSON.stringify(res.rows, null, 2));
  await pool.end();
}

run().catch(console.error);
