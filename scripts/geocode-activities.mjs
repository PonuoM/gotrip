// Batch-geocode all activities of "go go Japanese" via Nominatim.
// Strategy: a curated lookup table for known places, fall back to the raw
// location_name + ", Japan" suffix. Rate-limited to 1.1 req/s.

import pg from 'pg'
const { Client } = pg

const TRIP_ID = '1af00b99-f1fb-4fb0-8509-4535f3fa653c'
const UA = 'GoTrip/1.0 (https://gotrip-tan.vercel.app)'

// Manual mapping: location_name (as stored) → query to send to Nominatim
// Use a specific landmark/POI/address; "" means skip.
const QUERIES = {
  // Airports
  'Don Mueang Airport':            'Don Mueang International Airport, Bangkok',
  'Suvarnabhumi Airport':          'Suvarnabhumi Airport, Bangkok',
  'Kansai International Airport':  'Kansai International Airport, Osaka',
  'Narita Airport':                'Narita International Airport, Japan',
  'NRT':                           'Narita International Airport, Japan',
  'Tokyo → NRT':                   'Narita International Airport, Japan',

  // Osaka transit + areas
  'Nankai line':                   'Nankai Namba Station, Osaka',
  'Midosuji subway':               'Namba Station, Osaka',
  'Dobutsuen-mae → Shin-Imamiya → JR Loop': 'Dobutsuen-mae Station, Osaka',
  'Namba → Dobutsuen-mae':         'Namba Station, Osaka',
  'JR Loop':                       'Osaka Station',
  'Namba bus terminal':            'OCAT Namba, Osaka',
  'Namba → Tokyo Station':         'OCAT Namba, Osaka',
  'Subway':                        'Namba Station, Osaka',
  'Aoyu':                          'Dobutsuen-mae Station, Osaka',
  'Aoyu → Namba coin locker':      'Namba Station, Osaka',

  // Osaka spots
  'Namba':                         'Namba, Osaka',
  'Dobutsuen-mae, Osaka':          'Dobutsuen-mae Station, Osaka',
  'Osaka':                         'Osaka Castle',
  'Shinsaibashi Arcade':           'Shinsaibashi-suji Shopping Street, Osaka',
  'Dotonbori':                     'Dotonbori, Osaka',
  'Don Quijote Dotonbori':         'Don Quijote Dotonbori, Osaka',
  'Don Quijote, Daimaru, 551 Horai': 'Daimaru Shinsaibashi, Osaka',

  // USJ
  'Universal Studios Japan':       'Universal Studios Japan, Osaka',
  'USJ':                           'Universal Studios Japan, Osaka',
  'USJ App':                       'Universal Studios Japan, Osaka',
  'USJ Food Court':                'Universal Studios Japan, Osaka',
  'Hogwarts USJ':                  'The Wizarding World of Harry Potter, Universal Studios Japan',

  // Tokyo
  'Tokyo Station':                 'Tokyo Station',
  'Asakusa':                       'Sensoji Temple, Asakusa, Tokyo',
  'Asakusa → Yahiro':              'Yahiro Station, Tokyo',
  'Yahiro':                        'Yahiro Station, Sumida, Tokyo',
  'Yahiro · บ้านวิว Skytree':       'Tokyo Skytree, Sumida',
  'Yahiro / Asakusa':              'Yahiro Station, Sumida, Tokyo',

  // Disneyland
  'Disneyland':                    'Tokyo Disneyland, Maihama',
  'Tokyo Disneyland':              'Tokyo Disneyland, Maihama',
  'Maihama → Tokyo → Yahiro':      'Maihama Station, Tokyo',
  'Yahiro → Tokyo → Maihama':      'Yahiro Station, Sumida, Tokyo',

  // Akihabara
  'Akihabara':                     'Akihabara Station, Tokyo',
  'Akihabara → Ikebukuro':         'Akihabara Station, Tokyo',
  'Yahiro → Akihabara':            'Yahiro Station, Sumida, Tokyo',
  'Yoroniku / Han no Daidokoro':   'Yoroniku Omotesando, Tokyo',

  // Generic — skip
  'ที่พัก':                          '',
  'ห้องน้ำสาธารณะ':                  '',
  'Don Quijote, Tokyo Banana':     'Tokyo Banana flagship Tokyo Station',
}

async function geocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'application/json' } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  if (!data || data.length === 0) return null
  return { lat: Number(data[0].lat), lng: Number(data[0].lon), display: data[0].display_name }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

const client = new Client({
  host: 'aws-1-ap-northeast-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.jtyiqxwsxxzidkulgkeg',
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
})

await client.connect()
console.log('Connected.\n')

const { rows } = await client.query(
  `SELECT DISTINCT location_name FROM activities
   WHERE trip_id = $1 AND location_name IS NOT NULL
     AND (latitude IS NULL OR longitude IS NULL)`,
  [TRIP_ID]
)

console.log(`Geocoding ${rows.length} unique locations...\n`)

let ok = 0, skipped = 0, failed = 0

for (const [i, row] of rows.entries()) {
  const loc = row.location_name
  const query = (QUERIES[loc] !== undefined) ? QUERIES[loc] : `${loc}, Japan`

  if (!query) {
    console.log(`[${i + 1}/${rows.length}] SKIP   "${loc}"`)
    skipped++
    continue
  }

  try {
    const result = await geocode(query)
    if (!result) {
      console.log(`[${i + 1}/${rows.length}] MISS   "${loc}" (query: ${query})`)
      failed++
    } else {
      const upd = await client.query(
        `UPDATE activities SET latitude = $1, longitude = $2
         WHERE trip_id = $3 AND location_name = $4`,
        [result.lat, result.lng, TRIP_ID, loc]
      )
      console.log(`[${i + 1}/${rows.length}] OK     "${loc}" → ${result.lat.toFixed(4)}, ${result.lng.toFixed(4)} (${upd.rowCount} rows)`)
      ok++
    }
  } catch (err) {
    console.log(`[${i + 1}/${rows.length}] ERROR  "${loc}" — ${err.message}`)
    failed++
  }

  // Nominatim rate limit: ≤ 1 req/s
  await sleep(1100)
}

console.log(`\nDone. OK: ${ok}, skipped: ${skipped}, failed: ${failed}`)

const { rows: stats } = await client.query(
  `SELECT
     COUNT(*) AS total,
     COUNT(latitude) AS with_coords
   FROM activities WHERE trip_id = $1`,
  [TRIP_ID]
)
console.log(`Coverage: ${stats[0].with_coords}/${stats[0].total} activities have GPS.`)

await client.end()
