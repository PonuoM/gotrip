import pg from 'pg'
const { Client } = pg

const TRIP_ID = '1af00b99-f1fb-4fb0-8509-4535f3fa653c'  // go go Japanese

// Trip starts 2026-06-07 (day 1) — times below are JST, converted to UTC (JST = UTC+9)
// To get UTC: subtract 9 hours from JST.
function jst(day, hhmm) {
  // day = 1..7 → 2026-06-07..2026-06-13
  const date = new Date(Date.UTC(2026, 5, 6 + day, 0, 0, 0))  // midnight UTC of trip day
  const [h, m] = hhmm.split(':').map(Number)
  date.setUTCHours(h - 9, m, 0, 0)
  return date.toISOString()
}

// type_id allowed: flight train bus car hotel food sightseeing shopping activity event meeting other
const activities = [
  // ============ DAY 1 — อา. 7 มิ.ย. ถึงโอซาก้า + ช้อป Shinsaibashi ============
  { day: 1, t: '03:00', type: 'flight',      title: 'XJ612 DMK → KIX',                   loc: 'Don Mueang Airport',           notes: 'Thai AirAsia X · Booking P9KLFF', cost: 0,     status: 'booked' },
  { day: 1, t: '10:55', type: 'sightseeing', title: 'Land KIX + immigration',             loc: 'Kansai International Airport', notes: 'เก็บกระเป๋า ออก ตม.', status: 'planned' },
  { day: 1, t: '12:30', type: 'train',       title: 'Nankai → Dobutsuen-mae',             loc: 'Nankai line',                  notes: '~50 นาที', cost: 1070, status: 'planned' },
  { day: 1, t: '13:30', type: 'hotel',       title: 'Check-in Aoyu',                      loc: 'Dobutsuen-mae, Osaka',         notes: 'คืนที่ 1/2', status: 'booked' },
  { day: 1, t: '14:30', type: 'train',       title: 'Midosuji line → Namba',              loc: 'Midosuji subway',              notes: '5 นาที', status: 'planned' },
  { day: 1, t: '15:00', type: 'food',        title: 'Lunch — Ichiran / 551 Horai',        loc: 'Namba',                        notes: 'ราเมน หรือ ซาลาเปา', status: 'planned' },
  { day: 1, t: '16:00', type: 'shopping',    title: '🛍️ Shinsaibashi-suji + On Cloud',    loc: 'Shinsaibashi Arcade',          notes: 'Hankyu Men\'s, XEBIO Namba, ABC-Mart', status: 'planned' },
  { day: 1, t: '18:30', type: 'sightseeing', title: 'Dotonbori + ป้าย Glico',             loc: 'Dotonbori',                    notes: 'ถ่ายรูปคลาสสิก', status: 'planned' },
  { day: 1, t: '19:30', type: 'food',        title: 'Dinner — Takoyaki + Kushikatsu Daruma', loc: 'Dotonbori',                 notes: 'ของขึ้นชื่อ Osaka', status: 'planned' },
  { day: 1, t: '21:30', type: 'train',       title: 'กลับ Aoyu',                          loc: 'Namba → Dobutsuen-mae',        status: 'planned' },

  // ============ DAY 2 — จ. 8 มิ.ย. USJ ทั้งวัน ============
  { day: 2, t: '06:30', type: 'food',        title: 'ตื่นเช้า + ข้าวเช้าด่วน',           loc: 'Aoyu',                         notes: 'ไม่มี Express ต้องไปเร็ว', status: 'planned' },
  { day: 2, t: '07:00', type: 'train',       title: 'JR Loop → Universal City',           loc: 'Dobutsuen-mae → Shin-Imamiya → JR Loop', notes: '~25 นาที', status: 'planned' },
  { day: 2, t: '07:45', type: 'sightseeing', title: 'ถึง USJ ก่อนเปิด เข้าแถว',           loc: 'Universal Studios Japan',      status: 'planned' },
  { day: 2, t: '08:30', type: 'activity',    title: '🍄 รับ Timed Entry Nintendo World',  loc: 'USJ App',                      notes: 'ฟรี แต่อาจหมดเที่ยง รีบ!', status: 'planned' },
  { day: 2, t: '09:00', type: 'activity',    title: '🧙 Harry Potter Forbidden Journey',  loc: 'Hogwarts USJ',                 notes: 'แถวยาวสุด ไปก่อน', cost: 9800, status: 'booked' },
  { day: 2, t: '10:30', type: 'activity',    title: '🦖 Jurassic Park / 🕷️ Spider-Man',  loc: 'USJ',                          notes: 'ใช้ Single Rider ได้', status: 'planned' },
  { day: 2, t: '12:00', type: 'food',        title: 'Lunch in USJ',                       loc: 'USJ Food Court',               status: 'planned' },
  { day: 2, t: '13:30', type: 'activity',    title: '🏎️ Super Nintendo World (Timed)',   loc: 'USJ',                          notes: 'ตาม Timed Entry Ticket', status: 'planned' },
  { day: 2, t: '16:00', type: 'activity',    title: 'Hollywood Dream / Minion Park',      loc: 'USJ',                          status: 'planned' },
  { day: 2, t: '18:00', type: 'event',       title: '🍿 USJ Parade',                      loc: 'USJ',                          status: 'planned' },
  { day: 2, t: '19:00', type: 'train',       title: 'USJ → Namba',                        loc: 'JR Loop',                      notes: '~25 นาที', status: 'planned' },
  { day: 2, t: '20:00', type: 'shopping',    title: '🛍️ Namba ตอนเย็น',                  loc: 'Don Quijote Dotonbori',        notes: '24 ชม.', status: 'planned' },
  { day: 2, t: '21:00', type: 'food',        title: 'Dinner — Ichiran / Yakiniku',        loc: 'Namba',                        status: 'planned' },
  { day: 2, t: '22:30', type: 'train',       title: 'กลับ Aoyu',                          loc: 'Namba → Dobutsuen-mae',        status: 'planned' },

  // ============ DAY 3 — อ. 9 มิ.ย. Osaka เบาๆ + บัสกลางคืน ============
  { day: 3, t: '08:00', type: 'food',        title: 'ตื่นสบาย + ข้าวเช้า',               loc: 'Aoyu',                         status: 'planned' },
  { day: 3, t: '09:30', type: 'sightseeing', title: '🏯 Osaka Castle / Umeda Sky',        loc: 'Osaka',                        notes: 'เลือก 1', status: 'planned' },
  { day: 3, t: '12:00', type: 'hotel',       title: 'Check-out Aoyu + ฝากกระเป๋า',        loc: 'Aoyu → Namba coin locker',     status: 'planned' },
  { day: 3, t: '13:00', type: 'train',       title: '→ Namba',                            loc: 'Subway',                       status: 'planned' },
  { day: 3, t: '13:30', type: 'food',        title: 'Lunch — Okonomiyaki Mizuno ⭐',      loc: 'Namba',                        notes: 'Bib Gourmand', status: 'planned' },
  { day: 3, t: '15:00', type: 'shopping',    title: '🛍️ ช้อปสุดท้าย Namba',              loc: 'Don Quijote, Daimaru, 551 Horai', notes: 'ของฝาก', status: 'planned' },
  { day: 3, t: '17:30', type: 'food',        title: 'Dinner — Yakiniku Toraji',           loc: 'Dotonbori',                    notes: 'หรือ 551 Horai', status: 'planned' },
  { day: 3, t: '19:30', type: 'other',       title: 'Body sheet เช็ดตัว + เปลี่ยนชุด',    loc: 'ห้องน้ำสาธารณะ',                status: 'planned' },
  { day: 3, t: '20:30', type: 'other',       title: 'เดินไปสถานีบัส Namba',               loc: 'Namba bus terminal',           status: 'planned' },
  { day: 3, t: '22:00', type: 'bus',         title: '🚌 SA48 Night Bus → Tokyo',          loc: 'Namba → Tokyo Station',        notes: 'นอนบนบัส ประหยัดที่พัก ✅ จองแล้ว', status: 'booked' },

  // ============ DAY 4 — พ. 10 มิ.ย. ถึง Tokyo + พักผ่อน ============
  { day: 4, t: '07:00', type: 'sightseeing', title: 'ถึง Tokyo Station',                  loc: 'Tokyo Station',                notes: 'เวลาขึ้นกับจราจร', status: 'planned' },
  { day: 4, t: '07:30', type: 'other',       title: 'ฝากกระเป๋า coin locker',             loc: 'Tokyo Station',                notes: '~700¥/ใบ', cost: 700, status: 'planned' },
  { day: 4, t: '08:00', type: 'food',        title: '☕ Breakfast — Tokyo Banana Cafe',   loc: 'Tokyo Station',                status: 'planned' },
  { day: 4, t: '09:30', type: 'sightseeing', title: '🛕 Asakusa เช้าๆ — Sensoji',         loc: 'Asakusa',                      notes: 'Tokyo Station → Asakusa Line ~12 นาที', status: 'planned' },
  { day: 4, t: '12:00', type: 'food',        title: 'Lunch — Tempura Hisago',             loc: 'Asakusa',                      notes: 'หรือ Asakusa Imahan', status: 'planned' },
  { day: 4, t: '13:30', type: 'train',       title: 'Tobu Skytree → Yahiro',              loc: 'Asakusa → Yahiro',             notes: '5 นาที!', status: 'planned' },
  { day: 4, t: '14:00', type: 'hotel',       title: 'Check-in Yahiro (early ck-in)',      loc: 'Yahiro · บ้านวิว Skytree',     notes: 'คืนที่ 1/3', status: 'booked' },
  { day: 4, t: '14:30', type: 'other',       title: '💤 พักผ่อน นอนเอน อาบน้ำ ~3 ชม.',   loc: 'ที่พัก',                       notes: 'เตรียมพรุ่งนี้ Disney', status: 'planned' },
  { day: 4, t: '17:30', type: 'food',        title: 'Dinner — ร้านท้องถิ่น Yahiro',      loc: 'Yahiro / Asakusa',             status: 'planned' },
  { day: 4, t: '21:00', type: 'other',       title: 'นอนเร็ว เตรียม Disney',              loc: 'ที่พัก',                       status: 'planned' },

  // ============ DAY 5 — พฤ. 11 มิ.ย. Disneyland ============
  { day: 5, t: '06:30', type: 'food',        title: 'ตื่น + ข้าวเช้าด่วน',               loc: 'ที่พัก',                       status: 'planned' },
  { day: 5, t: '07:30', type: 'train',       title: 'JR Yamanote → Maihama',              loc: 'Yahiro → Tokyo → Maihama',     notes: '~45 นาที', status: 'planned' },
  { day: 5, t: '08:30', type: 'sightseeing', title: 'ถึงประตู Disneyland',                loc: 'Tokyo Disneyland',             notes: 'รอเปิดประตู', status: 'planned' },
  { day: 5, t: '09:00', type: 'activity',    title: '🏰 Beauty & Beast / Splash Mountain', loc: 'Disneyland',                  notes: 'เครื่องเล่นยอดฮิตก่อน', cost: 9400, status: 'booked' },
  { day: 5, t: '12:00', type: 'food',        title: 'Lunch ในสวน',                        loc: 'Disneyland',                   status: 'planned' },
  { day: 5, t: '13:00', type: 'activity',    title: 'Fantasyland + Tomorrowland',         loc: 'Disneyland',                   status: 'planned' },
  { day: 5, t: '17:00', type: 'food',        title: 'Dinner ในสวน',                       loc: 'Disneyland',                   status: 'planned' },
  { day: 5, t: '19:00', type: 'event',       title: '⭐ Electrical Parade Dreamlights',    loc: 'Disneyland',                   notes: 'พลาดไม่ได้!', status: 'planned' },
  { day: 5, t: '20:30', type: 'event',       title: '🎆 Sky Full of Colors (พลุ)',        loc: 'Disneyland',                   status: 'planned' },
  { day: 5, t: '21:00', type: 'train',       title: 'ปิดสวน → กลับ Yahiro',               loc: 'Maihama → Tokyo → Yahiro',     status: 'planned' },

  // ============ DAY 6 — ศ. 12 มิ.ย. ฟรีสไตล์ + การ์ดเกม ============
  { day: 6, t: '09:00', type: 'food',        title: 'ตื่นสบาย + ข้าวเช้า',               loc: 'ที่พัก',                       status: 'planned' },
  { day: 6, t: '10:30', type: 'train',       title: 'JR Yamanote → Akihabara',            loc: 'Yahiro → Akihabara',           status: 'planned' },
  { day: 6, t: '11:00', type: 'shopping',    title: '🃏 Hareruya Akihabara',              loc: 'Akihabara',                    notes: 'ร้านการ์ดใหญ่สุด', status: 'planned' },
  { day: 6, t: '12:30', type: 'food',        title: 'Lunch — Coco Ichibanya',             loc: 'Akihabara',                    notes: 'หรือ Gyukatsu Motomura', status: 'planned' },
  { day: 6, t: '14:00', type: 'shopping',    title: 'Yellow Submarine + Card Rush',       loc: 'Akihabara',                    status: 'planned' },
  { day: 6, t: '15:30', type: 'shopping',    title: 'Card Kingdom + Amenity Dream',       loc: 'Akihabara',                    notes: 'Pokemon', status: 'planned' },
  { day: 6, t: '17:00', type: 'shopping',    title: 'Mandarake Complex (vintage)',        loc: 'Akihabara',                    status: 'planned' },
  { day: 6, t: '18:30', type: 'train',       title: 'กลับ Ikebukuro / นัดเจอเพื่อน',     loc: 'Akihabara → Ikebukuro',        status: 'planned' },
  { day: 6, t: '19:30', type: 'food',        title: '🥩 Dinner รวมกลุ่ม — Yakiniku',      loc: 'Yoroniku / Han no Daidokoro',  notes: 'จองล่วงหน้า', status: 'planned' },

  // ============ DAY 7 — ส. 13 มิ.ย. กลับบ้าน ============
  { day: 7, t: '08:00', type: 'shopping',    title: 'ของฝากด่วน',                         loc: 'Don Quijote, Tokyo Banana',    status: 'planned' },
  { day: 7, t: '10:30', type: 'hotel',       title: 'Check-out Yahiro',                   loc: 'Yahiro',                       status: 'planned' },
  { day: 7, t: '11:30', type: 'train',       title: 'Skyliner / Narita Express → NRT',    loc: 'Tokyo → NRT',                  status: 'planned' },
  { day: 7, t: '13:30', type: 'sightseeing', title: 'ถึง NRT',                            loc: 'Narita Airport',               status: 'planned' },
  { day: 7, t: '14:30', type: 'other',       title: 'เช็คอิน + ผ่าน ตม.',                 loc: 'NRT',                          status: 'planned' },
  { day: 7, t: '17:00', type: 'flight',      title: 'ZIPAIR ZG051 NRT → BKK',             loc: 'Narita Airport',               notes: 'Booking 1622927166765361', cost: 0, status: 'booked' },
  { day: 7, t: '21:40', type: 'sightseeing', title: 'ถึง BKK 🇹🇭',                        loc: 'Suvarnabhumi Airport',         status: 'planned' },
]

const client = new Client({
  host: 'aws-1-ap-northeast-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.jtyiqxwsxxzidkulgkeg',
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
})

await client.connect()
console.log(`Inserting ${activities.length} activities into trip ${TRIP_ID}\n`)

let inserted = 0
for (const [i, a] of activities.entries()) {
  const startAt = jst(a.day, a.t)
  await client.query(
    `INSERT INTO activities
       (trip_id, type_id, title, day_number, start_at, location_name, notes, cost_amount, cost_currency, status, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'JPY',$9,$10)`,
    [
      TRIP_ID,
      a.type,
      a.title,
      a.day,
      startAt,
      a.loc || null,
      a.notes || null,
      a.cost ?? null,
      a.status,
      i,
    ]
  )
  inserted++
}

console.log(`✓ Inserted ${inserted} activities`)

// Verify
const summary = await client.query(`
  SELECT day_number, COUNT(*)::int AS count
  FROM activities
  WHERE trip_id = $1
  GROUP BY day_number
  ORDER BY day_number;
`, [TRIP_ID])
console.log('\nPer day:')
console.table(summary.rows)

await client.end()
