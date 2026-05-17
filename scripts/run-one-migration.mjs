import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const { Client } = pg
const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, '..')

const file = process.argv[2]
if (!file) {
  console.error('Usage: node scripts/run-one-migration.mjs <path/to/file.sql>')
  process.exit(1)
}

const client = new Client({
  host: 'aws-1-ap-northeast-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.jtyiqxwsxxzidkulgkeg',
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
})

await client.connect()
const sql = await readFile(join(projectRoot, file), 'utf8')
process.stdout.write(`→ Running ${file} ... `)
try {
  await client.query(sql)
  console.log('✓')
} catch (err) {
  console.log('✗')
  console.error(err.message)
  process.exit(1)
}
await client.end()
