# ✅ TripPal — Setup Checklist

Print หรือ keep this open — ติ๊กตามที่ทำเสร็จไปเรื่อยๆ

## 🎯 Phase 1: Local Setup (10 นาที)

- [ ] **1.1** เปิด Terminal/PowerShell ใน folder `trippal-starter`
- [ ] **1.2** รัน `npm install` — รอ ~2 นาที
- [ ] **1.3** Copy `.env.local.example` เป็น `.env.local`
  ```bash
  cp .env.local.example .env.local      # Mac/Linux
  copy .env.local.example .env.local    # Windows
  ```

## 🗄️ Phase 2: Supabase Setup (15 นาที)

- [ ] **2.1** ไปที่ https://supabase.com → Sign in with GitHub
- [ ] **2.2** กด **New Project**
  - Name: `trippal`
  - Database Password: (generate · copy เก็บไว้!)
  - Region: **Southeast Asia (Singapore)**
- [ ] **2.3** รอ database ~2 นาที
- [ ] **2.4** ไปที่ **Settings → API** → copy:
  - `Project URL` → แปะใน `.env.local` ที่ `NEXT_PUBLIC_SUPABASE_URL=`
  - `anon public` key → แปะที่ `NEXT_PUBLIC_SUPABASE_ANON_KEY=`
  - `service_role` key → แปะที่ `SUPABASE_SERVICE_ROLE_KEY=`

## 📊 Phase 3: Run Migrations (5 นาที)

ไปที่ **Supabase Dashboard → SQL Editor → New query**

- [ ] **3.1** Copy contents of `supabase/migrations/00001_initial_schema.sql` → paste → **Run** ✅
- [ ] **3.2** Copy contents of `supabase/migrations/00002_rls_policies.sql` → paste → **Run** ✅
- [ ] **3.3** Copy contents of `supabase/migrations/00003_helpers.sql` → paste → **Run** ✅
- [ ] **3.4** Copy contents of `supabase/seed.sql` → paste → **Run** ✅

✓ Check: ไปที่ **Table Editor** ควรเห็น 11 ตาราง · `activity_types` มี 12 rows · `expense_categories` มี 11 rows

## 🔐 Phase 4: Setup Google OAuth (10 นาที)

- [ ] **4.1** ไปที่ https://console.cloud.google.com → New Project: `trippal`
- [ ] **4.2** **APIs & Services → OAuth consent screen**
  - User type: External
  - App name: TripPal
  - Add scopes: email, profile, openid
- [ ] **4.3** **Credentials → Create OAuth Client ID**
  - Application type: Web
  - Authorized redirect URIs:
    `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
- [ ] **4.4** Copy `Client ID` + `Client Secret`
- [ ] **4.5** ใน Supabase → **Authentication → Providers → Google**
  - Enabled: ✓
  - แปะ Client ID + Secret → Save

## 💬 Phase 5: Setup LINE Login (15 นาที · Optional แต่แนะนำ)

- [ ] **5.1** ไปที่ https://developers.line.biz/console/
- [ ] **5.2** Create Provider → New Channel → **LINE Login**
- [ ] **5.3** Channel name: TripPal · App types: **Web app**
- [ ] **5.4** **LINE Login → OpenID Connect** → enable
- [ ] **5.5** Callback URL: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
- [ ] **5.6** Copy `Channel ID` + `Channel Secret`
- [ ] **5.7** ใน Supabase → **Authentication → Providers → "+ Add provider"**
  - Use OIDC
  - Provider name: `line`
  - Client ID: (Channel ID จาก LINE)
  - Client Secret: (จาก LINE)
  - Discovery URL: `https://access.line.me/.well-known/openid-configuration`
  - Skip nonce check: ✓ (LINE บางครั้งไม่ส่ง)

## 🚀 Phase 6: Run the App!

- [ ] **6.1** ใน Terminal:
  ```bash
  npm run dev
  ```
- [ ] **6.2** เปิด http://localhost:3000
- [ ] **6.3** ควรเห็นหน้า **Login** สวยๆ
- [ ] **6.4** ลอง **LINE Login** หรือ **Google Login**
- [ ] **6.5** ✓ ถ้าเข้าได้ → เห็นหน้า Home (ยังไม่มี trip)

## 🎉 You're Live!

ตอนนี้พร้อมเริ่ม coding feature เพิ่ม:
- [ ] สร้างหน้า `/trips/new` สำหรับสร้างทริปใหม่
- [ ] สร้างหน้า `/trips/[id]` สำหรับดูทริป
- [ ] สร้างหน้า `/trips/[id]/itinerary` สำหรับ activity
- [ ] สร้างหน้า `/trips/[id]/expenses` สำหรับค่าใช้จ่าย

ดู PRD.md สำหรับ feature ทั้งหมดและ priority

## 🆘 Troubleshooting

**Error: "Invalid API key"**
→ เช็ค `.env.local` ว่า paste keys ถูกต้อง · restart `npm run dev`

**Error: "Failed to fetch user_profiles"**
→ Migration ยังไม่ได้รัน · ไปรัน `00003_helpers.sql` (มี trigger สร้าง profile)

**LINE Login กดแล้วไม่ทำงาน**
→ เช็คว่า OpenID Connect enabled แล้ว · เช็ค callback URL ตรง

**Browser console error: "createBrowserClient is not a function"**
→ รัน `npm install @supabase/ssr@latest`

---

ติดอะไรเปิด Claude แชทใหม่ + แชร์ error message ได้เลย
