# 🇯🇵 TripPal — Starter Kit

> **Trip Planning App** สำหรับกรุ๊ปทัวร์ · Mobile-first · Neo-Retro Design (60/30/10)

ทุกอย่างพร้อมรัน — แค่ทำตาม Setup ด้านล่าง

## 📦 Tech Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript
- **Styling:** Tailwind CSS + Custom Design System
- **Database:** Supabase (PostgreSQL + Auth + Storage)
- **Deploy:** Vercel (recommended)

## 🚀 Setup Guide (10 นาทีเสร็จ)

### Step 1: Clone & Install

```bash
# 1. Copy folder นี้ไปที่ workspace ของคุณ
# 2. cd เข้า folder
cd trippal-starter

# 3. Install dependencies
npm install
```

### Step 2: Setup Supabase

1. ไปที่ [https://supabase.com](https://supabase.com) → Sign in with GitHub
2. **New Project** → ตั้งชื่อ `trippal` → Region: **Southeast Asia (Singapore)**
3. รอ ~2 นาที database ขึ้น
4. ไปที่ **Settings → API** → copy:
   - `Project URL`
   - `anon public key`
5. สร้างไฟล์ `.env.local` (copy จาก `.env.local.example`):
   ```bash
   cp .env.local.example .env.local
   ```
6. แปะ keys ลงใน `.env.local`

### Step 3: Run SQL Migrations

ไปที่ **Supabase Dashboard → SQL Editor → New query**

รัน SQL ตามลำดับ (จาก folder `supabase/migrations/`):

1. `00001_initial_schema.sql` — สร้างตารางทั้งหมด
2. `00002_rls_policies.sql` — Row-Level Security
3. `00003_helpers.sql` — Functions & Triggers

จากนั้นรัน:

4. `supabase/seed.sql` — ใส่ activity_types + expense_categories เริ่มต้น

### Step 4: Setup Auth Providers

#### Google OAuth (ง่ายสุด)

1. ไปที่ **Supabase → Authentication → Providers → Google**
2. กด **Enable**
3. ไปที่ [Google Cloud Console](https://console.cloud.google.com) → สร้าง OAuth credentials
4. Copy `Client ID` + `Client Secret` แปะใน Supabase
5. Copy `Callback URL` ของ Supabase ไปแปะใน Google Cloud

> 📘 Detailed guide: https://supabase.com/docs/guides/auth/social-login/auth-google

#### LINE Login (Thai market)

1. ไปที่ [LINE Developers](https://developers.line.biz/console/) → Create Provider → New Channel (LINE Login)
2. Setup callback URL: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
3. Copy `Channel ID` + `Channel Secret`
4. ใน Supabase → **Authentication → Providers → Add OIDC Provider:**
   - Provider name: `line`
   - Client ID: (จาก LINE)
   - Client Secret: (จาก LINE)
   - Discovery URL: `https://access.line.me/.well-known/openid-configuration`

### Step 5: Run!

```bash
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000) → เห็นหน้า Login!

## 📁 Project Structure

```
trippal-starter/
├── README.md                          ← ไฟล์นี้
├── package.json
├── tsconfig.json
├── tailwind.config.ts                 ← brand colors (60/30/10)
├── next.config.js
├── .env.local.example
│
├── supabase/
│   ├── migrations/
│   │   ├── 00001_initial_schema.sql   ← 11 tables
│   │   ├── 00002_rls_policies.sql     ← security
│   │   └── 00003_helpers.sql          ← functions
│   └── seed.sql                       ← default data
│
└── src/
    ├── middleware.ts                  ← auth middleware
    ├── app/
    │   ├── layout.tsx                 ← root layout
    │   ├── page.tsx                   ← home (logged in)
    │   ├── globals.css                ← brand colors
    │   ├── login/page.tsx             ← LINE/Google login
    │   ├── auth/callback/route.ts     ← OAuth callback
    │   ├── join/[code]/page.tsx       ← invite link landing
    │   └── trips/                     ← (you build this)
    ├── lib/
    │   ├── supabase/
    │   │   ├── client.ts              ← browser client
    │   │   ├── server.ts              ← SSR client
    │   │   └── middleware.ts          ← auth helper
    │   ├── database.types.ts          ← TypeScript types
    │   ├── permissions.ts             ← role checks
    │   └── utils.ts
    ├── components/
    │   └── ui/
    │       ├── Button.tsx             ← Neo-Retro button
    │       └── Card.tsx
    └── types/
        └── index.ts
```

## 🎨 Design System Quick Reference

### Colors (60/30/10)
```css
--white:  #FFFFFF   /* 60% — backgrounds */
--red:    #E63946   /* 30% — CTAs, hero, accents */
--black:  #1A1A1A   /* 10% — text, borders, footer */
```

### Typography
- **Display:** 40-48px / weight 900 / `letter-spacing: -1px`
- **H1:** 32px / 900
- **Body:** 16px / 400
- **Meta:** 11px / 700 / UPPERCASE / `letter-spacing: 2px`

### Signature Elements
- Red underline 4px ใต้ heading
- ★ star mark
- "." period หลัง heading หลัก
- Cards เอียง `-1deg` หรือ `+0.5deg`
- Border ดำหนา 2px
- Bottom nav สีดำ

## 🛠️ Useful Commands

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Run production build
npm run lint         # Run ESLint
npm run type-check   # TypeScript check
```

## 🚀 Deploy to Vercel (Free)

1. Push code ไป GitHub
2. ไปที่ [vercel.com](https://vercel.com) → Import repo
3. Add Environment Variables (copy จาก `.env.local`)
4. Deploy!

## 📚 Resources

- [PRD ของโปรเจกต์](../PRD.md) — สเปกครบทุกอย่าง
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind Docs](https://tailwindcss.com/docs)

## 💡 Need Help?

ถ้าติดตรงไหน เปิด Claude ใหม่แล้วถามได้เลย — แชร์ error message + code ที่ติด

---

*สร้างเมื่อ 17 พ.ค. 2026 · Made with Claude*
