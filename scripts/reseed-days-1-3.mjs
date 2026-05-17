// Wipe Day 1-3 of "go go Japanese" and re-insert from the updated plan
// (japan_trip_summary.md @ 21:22). Geocodes every place via Nominatim.
//
// Convention:
// - Activity that is a SPECIFIC place → set `loc` + `query` for geocoding
// - Pure event (wake up, rest, prep, ...) → leave `loc` and `query` empty

import pg from 'pg'
const { Client } = pg

const TRIP_ID = '1af00b99-f1fb-4fb0-8509-4535f3fa653c'
const UA = 'GoTrip/1.0 (https://gotrip-tan.vercel.app)'

function jst(day, hhmm) {
  const date = new Date(Date.UTC(2026, 5, 6 + day, 0, 0, 0))
  const [h, m] = hhmm.split(':').map(Number)
  date.setUTCHours(h - 9, m, 0, 0)
  return date.toISOString()
}

// status: booked = confirmed, planned = default, idea = optional
const activities = [
  // ============ DAY 1 — อา. 7 มิ.ย. ============
  { day: 1, t: '03:00', type: 'flight',      title: 'XJ612 DMK → KIX',                       loc: 'Don Mueang Airport',           query: 'Don Mueang International Airport, Bangkok', notes: 'Thai AirAsia X · P9KLFF', status: 'booked' },
  { day: 1, t: '10:55', type: 'sightseeing', title: 'ถึง KIX + ผ่าน ตม.',                     loc: 'Kansai International Airport', query: 'Kansai International Airport, Osaka',       notes: 'เก็บกระเป๋า ออก ตม.', status: 'planned' },
  { day: 1, t: '12:30', type: 'train',       title: 'Nankai → Dobutsuen-mae',                 loc: 'Nankai Line · Namba',          query: 'Nankai Namba Station, Osaka',               notes: '~50 นาที, 1,070¥',     cost: 1070, status: 'planned' },
  { day: 1, t: '13:30', type: 'hotel',       title: 'Check-in Aoyu',                          loc: 'Aoyu · Dobutsuen-mae',         query: 'Dobutsuen-mae Station, Osaka',              notes: 'คืนที่ 1/2',           status: 'booked' },
  { day: 1, t: '14:30', type: 'train',       title: 'Midosuji → Namba',                       loc: 'Midosuji Line',                query: 'Namba Station, Osaka',                      notes: '5 นาที',               status: 'planned' },
  { day: 1, t: '15:00', type: 'food',        title: 'Lunch — Ichiran / 551 Horai',            loc: 'Namba',                        query: 'Ichiran Namba, Osaka',                      notes: 'ราเมน / ซาลาเปา',     status: 'planned' },
  { day: 1, t: '16:00', type: 'shopping',    title: '👟 Sports DEPO Namba Parks',             loc: 'Sports DEPO · Namba Parks 8F', query: 'Namba Parks, Osaka',                        notes: 'On Cloud, Cloudmonster · เก็บภาษีคืนได้', status: 'planned' },
  { day: 1, t: '17:00', type: 'sightseeing', title: '⛩️ Namba Yasaka Shrine',                 loc: 'Namba Yasaka Shrine',          query: 'Namba Yasaka Shrine, Osaka',                notes: 'หัวสิงโตยักษ์ 12 ม. · ฟรี', status: 'planned' },
  { day: 1, t: '18:00', type: 'shopping',    title: '🛍️ Shinsaibashi + Don Quijote',         loc: 'Shinsaibashi Arcade',          query: 'Shinsaibashi-suji Shopping Street, Osaka',  notes: 'อาเขดยาว 600ม. กันฝน',  status: 'planned' },
  { day: 1, t: '19:30', type: 'food',        title: 'Dinner — Takoyaki + Kushikatsu Daruma', loc: 'Dotonbori',                    query: 'Kushikatsu Daruma Dotonbori, Osaka',        notes: 'ของขึ้นชื่อ Osaka',    status: 'planned' },
  { day: 1, t: '21:00', type: 'sightseeing', title: '📸 ป้าย Glico + Dotonbori',              loc: 'Glico Sign · Dotonbori',       query: 'Glico Sign Dotonbori, Osaka',               notes: 'ถ่ายรูปคลาสสิก',       status: 'planned' },
  { day: 1, t: '22:00', type: 'train',       title: 'กลับ Aoyu',                              loc: 'Namba → Dobutsuen-mae',        query: 'Dobutsuen-mae Station, Osaka',              status: 'planned' },

  // ============ DAY 2 — จ. 8 มิ.ย. USJ ============
  { day: 2, t: '06:30', type: 'other',       title: '⏰ ตื่นเช้า + ข้าวเช้าด่วน',                                            notes: 'ไม่มี Express ต้องไปเร็ว', status: 'planned' },
  { day: 2, t: '07:00', type: 'train',       title: 'JR Loop → Universal City',               loc: 'Shin-Imamiya → JR Loop',       query: 'Shin-Imamiya Station, Osaka',               notes: '~25 นาที',             status: 'planned' },
  { day: 2, t: '07:45', type: 'sightseeing', title: 'ถึง USJ ก่อนเปิด เข้าแถว',                loc: 'Universal Studios Japan',      query: 'Universal Studios Japan, Osaka',            status: 'planned' },
  { day: 2, t: '08:30', type: 'activity',    title: '🍄 รับ Timed Entry Nintendo World',      loc: 'USJ — Super Nintendo World',   query: 'Super Nintendo World, Universal Studios Japan', notes: 'ฟรี แต่อาจหมดเที่ยง รีบ!', status: 'planned' },
  { day: 2, t: '09:00', type: 'activity',    title: '🧙 Harry Potter Forbidden Journey',      loc: 'USJ — Hogwarts',               query: 'The Wizarding World of Harry Potter, Universal Studios Japan', notes: 'แถวยาวสุด ไปก่อน', cost: 9800, status: 'booked' },
  { day: 2, t: '10:30', type: 'activity',    title: '🦖 Jurassic Park / 🕷️ Spider-Man',      loc: 'USJ',                          query: 'Universal Studios Japan, Osaka',            notes: 'ใช้ Single Rider ได้', status: 'planned' },
  { day: 2, t: '12:00', type: 'food',        title: 'Lunch in USJ',                           loc: 'USJ Food Court',               query: 'Universal Studios Japan, Osaka',            status: 'planned' },
  { day: 2, t: '13:30', type: 'activity',    title: '🏎️ Super Nintendo World (Timed)',       loc: 'USJ — Super Nintendo World',   query: 'Super Nintendo World, Universal Studios Japan', notes: 'ตาม Timed Entry', status: 'planned' },
  { day: 2, t: '16:00', type: 'activity',    title: 'Hollywood Dream / Minion Park',          loc: 'USJ',                          query: 'Universal Studios Japan, Osaka',            status: 'planned' },
  { day: 2, t: '18:00', type: 'event',       title: '🍿 USJ Parade',                          loc: 'USJ',                          query: 'Universal Studios Japan, Osaka',            status: 'planned' },
  { day: 2, t: '19:00', type: 'train',       title: 'USJ → Namba',                            loc: 'JR Loop → Namba',              query: 'Namba Station, Osaka',                      notes: '~25 นาที',             status: 'planned' },
  { day: 2, t: '20:00', type: 'food',        title: '🥩 Yakiniku Toraji Dotonbori',           loc: 'Yakiniku Toraji · Dotonbori',  query: 'Yakiniku Toraji Dotonbori, Osaka',          notes: 'วิวแม่น้ำ · A5 Wagyu',  cost: 5500, status: 'planned' },
  { day: 2, t: '22:00', type: 'shopping',    title: '🛍️ Don Quijote · Dotonbori',            loc: 'Don Quijote Dotonbori',        query: 'Don Quijote Dotonbori, Osaka',              notes: '24 ชม.',               status: 'planned' },
  { day: 2, t: '22:30', type: 'train',       title: 'กลับ Aoyu',                              loc: 'Namba → Dobutsuen-mae',        query: 'Dobutsuen-mae Station, Osaka',              status: 'planned' },

  // ============ DAY 3 — อ. 9 มิ.ย. ============
  { day: 3, t: '06:30', type: 'other',       title: '🌅 ตื่นเช้า',                                                            notes: 'option: ไปตลาดปลาเช้า', status: 'planned' },
  { day: 3, t: '07:00', type: 'food',        title: '🐟 Kizu Market หรือ Kuromon',            loc: 'Kizu Ichiba Market',           query: 'Kizu Ichiba Market, Osaka',                 notes: 'Kizu: 5:00-11:00 · Kuromon: 9:00-18:00', status: 'planned' },
  { day: 3, t: '09:30', type: 'other',       title: 'กลับที่พัก · พักเล็กน้อย',                                                  status: 'planned' },
  { day: 3, t: '10:00', type: 'shopping',    title: '🏬 Abeno Harukas + Q\'s Mall',          loc: 'Abeno Harukas · Tennoji',      query: 'Abeno Harukas, Osaka',                      notes: 'Tennoji 1 สถานี · ตึกสูงสุด Osaka', status: 'planned' },
  { day: 3, t: '12:00', type: 'food',        title: 'Lunch ที่ Abeno Harukas ชั้น 12-14',     loc: 'Abeno Harukas Dining',         query: 'Abeno Harukas, Osaka',                      status: 'planned' },
  { day: 3, t: '13:30', type: 'hotel',       title: 'Check-out Aoyu + ฝากกระเป๋า',            loc: 'Aoyu → Namba coin locker',     query: 'Namba Station, Osaka',                      status: 'planned' },
  { day: 3, t: '14:30', type: 'train',       title: '→ Namba ครั้งสุดท้าย',                    loc: 'Namba',                        query: 'Namba, Osaka',                              status: 'planned' },
  { day: 3, t: '15:00', type: 'food',        title: '🐟 Kuromon Ichiba Market',               loc: 'Kuromon Ichiba Market',        query: 'Kuromon Ichiba Market, Osaka',              notes: 'ถ้ายังไม่ไปเช้า · เดิน 5 นาทีจาก Namba', status: 'planned' },
  { day: 3, t: '17:00', type: 'shopping',    title: '🛍️ Don Quijote · Daimaru',              loc: 'Daimaru Shinsaibashi',         query: 'Daimaru Shinsaibashi, Osaka',               notes: 'ของฝาก',               status: 'planned' },
  { day: 3, t: '18:00', type: 'food',        title: '🥩 Dinner Yakiniku Toraji / Matsusakagyu M', loc: 'Matsusakagyu M Namba',     query: 'Matsusakagyu Yakiniku M, Namba, Osaka',     notes: 'Toraji 4.5-7K¥ · M 6-10K¥', cost: 7000, status: 'planned' },
  { day: 3, t: '20:00', type: 'other',       title: '🧼 Body sheet เช็ดตัว + เปลี่ยนชุด',                                        status: 'planned' },
  { day: 3, t: '21:00', type: 'other',       title: 'เดินไปสถานีบัส Namba',                    loc: 'OCAT · Namba Bus Terminal',    query: 'OCAT, Namba, Osaka',                        status: 'planned' },
  { day: 3, t: '21:30', type: 'other',       title: 'เช็คอินกับเจ้าหน้าที่',                                                     status: 'planned' },
  { day: 3, t: '22:00', type: 'bus',         title: '🚌 SA48 Night Bus → Tokyo',              loc: 'Namba → Tokyo Station',        query: 'OCAT, Namba, Osaka',                        notes: 'นอนบนบัส ประหยัดที่พัก ✅', status: 'booked' },
]

async function geocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'application/json' } })
  if (!res.ok) return null
  const data = await res.json()
  return data?.[0] ? { lat: Number(data[0].lat), lng: Number(data[0].lon) } : null
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

const client = new Client({
  host: 'aws-1-ap-northeast-1.pooler.supabase.com',
  port: 5432, database: 'postgres',
  user: 'postgres.jtyiqxwsxxzidkulgkeg',
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
})

await client.connect()
console.log('Connected.\n')

// 1. Wipe Day 1-3
const del = await client.query(
  `DELETE FROM activities WHERE trip_id = $1 AND day_number IN (1,2,3)`,
  [TRIP_ID]
)
console.log(`🗑  Deleted ${del.rowCount} old activities (Day 1-3)\n`)

// 2. Pre-geocode unique queries
const queryToCoords = new Map()
const uniqueQueries = Array.from(new Set(activities.map(a => a.query).filter(Boolean)))
console.log(`Geocoding ${uniqueQueries.length} unique queries...\n`)

for (const [i, q] of uniqueQueries.entries()) {
  try {
    const coords = await geocode(q)
    if (coords) {
      queryToCoords.set(q, coords)
      console.log(`  [${i + 1}/${uniqueQueries.length}] ✓ ${q} → ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`)
    } else {
      console.log(`  [${i + 1}/${uniqueQueries.length}] ✗ ${q} (no result)`)
    }
  } catch (err) {
    console.log(`  [${i + 1}/${uniqueQueries.length}] ! ${q} — ${err.message}`)
  }
  await sleep(1100)
}

// 3. Insert new activities
console.log(`\nInserting ${activities.length} new activities...`)
let inserted = 0
for (const [i, a] of activities.entries()) {
  const coords = a.query ? queryToCoords.get(a.query) : null
  await client.query(
    `INSERT INTO activities
       (trip_id, type_id, title, day_number, start_at, location_name, latitude, longitude, notes, cost_amount, cost_currency, status, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'JPY',$11,$12)`,
    [
      TRIP_ID, a.type, a.title, a.day, jst(a.day, a.t),
      a.loc || null,
      coords?.lat ?? null,
      coords?.lng ?? null,
      a.notes || null,
      a.cost ?? null,
      a.status,
      i,
    ]
  )
  inserted++
}
console.log(`✓ Inserted ${inserted} activities`)

// 4. Verify
const stats = await client.query(`
  SELECT day_number, COUNT(*)::int AS total, COUNT(latitude)::int AS with_gps
  FROM activities WHERE trip_id = $1
  GROUP BY day_number ORDER BY day_number;
`, [TRIP_ID])
console.log('\n--- Coverage by day ---')
console.table(stats.rows)

await client.end()
