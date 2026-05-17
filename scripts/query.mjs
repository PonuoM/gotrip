import pg from 'pg'
const { Client } = pg

const client = new Client({
  host: 'aws-1-ap-northeast-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.jtyiqxwsxxzidkulgkeg',
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
})

await client.connect()

const sql = process.argv[2]
if (!sql) {
  console.error('Usage: node scripts/query.mjs "SELECT ..."')
  process.exit(1)
}

const res = await client.query(sql)
console.table(res.rows)
await client.end()
