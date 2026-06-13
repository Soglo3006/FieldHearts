import "dotenv/config";
import pool from "../src/config/db.js";

const EMAIL = "ablbooh0+test3@gmail.com";

async function main() {
  const result = await pool.query(
    `DELETE FROM services
     WHERE title ILIKE '[TEST]%'
       AND user_id = (SELECT id FROM users WHERE email = $1)`,
    [EMAIL],
  );
  console.log(`Removed ${result.rowCount} test listing(s) for ${EMAIL}.`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
