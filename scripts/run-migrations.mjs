import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const { Client } = pg
const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, '..')

const client = new Client({
  host: 'aws-1-ap-northeast-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.jtyiqxwsxxzidkulgkeg',
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
})

const files = [
  'supabase/migrations/00001_initial_schema.sql',
  'supabase/migrations/00002_rls_policies.sql',
  'supabase/migrations/00003_helpers.sql',
  'supabase/seed.sql',
]

await client.connect()
console.log('✓ Connected to Supabase Postgres\n')

for (const file of files) {
  const sql = await readFile(join(projectRoot, file), 'utf8')
  process.stdout.write(`→ Running ${file} ... `)
  try {
    await client.query(sql)
    console.log('✓')
  } catch (err) {
    console.log('✗')
    console.error(`\n  Error in ${file}:`)
    console.error(`  ${err.message}`)
    if (err.position) console.error(`  Position: ${err.position}`)
    if (err.hint) console.error(`  Hint: ${err.hint}`)
    process.exit(1)
  }
}

console.log('\n--- Verification ---')

const tables = await client.query(`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' ORDER BY table_name;
`)
console.log(`Tables (${tables.rows.length}):`)
for (const r of tables.rows) console.log(`  • ${r.table_name}`)

const actTypes = await client.query('SELECT COUNT(*)::int AS n FROM activity_types')
const expCats = await client.query('SELECT COUNT(*)::int AS n FROM expense_categories')
console.log(`\nSeed data:`)
console.log(`  • activity_types:     ${actTypes.rows[0].n} rows`)
console.log(`  • expense_categories: ${expCats.rows[0].n} rows`)

await client.end()
console.log('\n✓ All done.')
