// ==========================================================================
// Lightweight i18n — Thai + English
// Server pages: call getLang() to read from user_profiles.preferred_lang
// Client components: receive lang as prop
// ==========================================================================

import { createClient } from '@/lib/supabase/server'

export type Lang = 'th' | 'en'

export async function getLang(): Promise<Lang> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'th'
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('preferred_lang')
    .eq('id', user.id)
    .single()
  return (profile?.preferred_lang === 'en' ? 'en' : 'th')
}

// ===== Translations =====

const translations = {
  // Bottom navigation
  'nav.home':      { th: 'หน้าหลัก', en: 'HOME' },
  'nav.plan':      { th: 'แผน',     en: 'PLAN' },
  'nav.pay':       { th: 'จ่าย',    en: 'PAY' },
  'nav.crew':      { th: 'ทีม',     en: 'CREW' },

  // Page titles
  'page.home':       { th: 'หน้าหลัก',       en: 'YOU.' },
  'page.plan':       { th: 'ทริปของคุณ',     en: 'PLAN.' },
  'page.pay':        { th: 'ค่าใช้จ่าย',    en: 'PAY.' },
  'page.crew':       { th: 'ทีม',           en: 'CREW.' },
  'page.itinerary':  { th: 'กำหนดการ',      en: 'ITINERARY.' },
  'page.expenses':   { th: 'ค่าใช้จ่าย',    en: 'EXPENSES.' },
  'page.checklist':  { th: 'เช็คลิสต์',     en: 'CHECKLIST.' },
  'page.docs':       { th: 'เอกสาร',        en: 'DOCS.' },
  'page.members':    { th: 'สมาชิก',        en: 'MEMBERS.' },
  'page.new_trip':   { th: 'สร้างทริปใหม่', en: 'START A TRIP.' },
  'page.edit_trip':  { th: 'แก้ไขทริป',     en: 'EDIT TRIP.' },
  'page.settings':   { th: 'การตั้งค่า',    en: 'CREW.' },

  // Action card labels (trip detail page)
  'card.itinerary':      { th: 'กำหนดการ',         en: 'ITINERARY' },
  'card.itinerary_sub':  { th: 'กิจกรรม & ตาราง',  en: 'Activities & schedule' },
  'card.expenses':       { th: 'ค่าใช้จ่าย',       en: 'EXPENSES' },
  'card.expenses_sub':   { th: 'หารค่าใช้จ่าย',    en: 'Split costs' },
  'card.checklist':      { th: 'เช็คลิสต์',         en: 'CHECKLIST' },
  'card.checklist_sub':  { th: 'แพ็คของ & เตรียม', en: 'Pack & prep' },
  'card.docs':           { th: 'เอกสาร',           en: 'DOCS' },
  'card.docs_sub':       { th: 'ตั๋ว & พาส',       en: 'Tickets & passes' },

  // Common buttons
  'btn.save':       { th: 'บันทึก',           en: 'SAVE' },
  'btn.cancel':     { th: 'ยกเลิก',           en: 'CANCEL' },
  'btn.delete':     { th: 'ลบ',              en: 'DELETE' },
  'btn.edit':       { th: 'แก้ไข',            en: 'EDIT' },
  'btn.create':     { th: 'สร้าง',            en: 'CREATE' },
  'btn.add':        { th: 'เพิ่ม',            en: 'ADD' },
  'btn.new_trip':   { th: '＋ ทริปใหม่',      en: '＋ NEW TRIP' },
  'btn.back':       { th: '← กลับ',          en: '← BACK' },
  'btn.signout':    { th: 'ออกจากระบบ →',   en: 'SIGN OUT →' },
  'btn.manage':     { th: 'จัดการ →',        en: 'MANAGE →' },
  'btn.continue':   { th: 'ถัดไป →',         en: 'CONTINUE →' },

  // Settings
  'settings.title':       { th: 'การตั้งค่า',         en: 'CREW.' },
  'settings.crew':        { th: '◉ บัญชีของคุณ',      en: '◉ YOUR CREW' },
  'settings.display_name':{ th: 'ชื่อเล่น',            en: 'DISPLAY NAME' },
  'settings.language':    { th: 'ภาษา',              en: 'LANGUAGE' },
  'settings.saved':       { th: '✓ บันทึกแล้ว',       en: '✓ Saved' },

  // Home
  'home.greet':        { th: 'สวัสดี ★ ★ ★',          en: 'YO! · ★ ★ ★' },
  'home.next_up':      { th: 'ทริปถัดไป ★',           en: 'NEXT UP ★' },
  'home.more_trips':   { th: 'ทริปอื่นๆ',             en: 'MORE TRIPS' },
  'home.see_all':      { th: 'ดูทั้งหมด →',           en: 'SEE ALL →' },
  'home.no_trips':     { th: 'ยังไม่มีทริป เริ่มเลย ↓', en: 'No trips yet. Start your first adventure ↓' },
  'home.start_new':    { th: '＋ เริ่มทริปใหม่',       en: '＋ START NEW ADVENTURE' },

  // Trip detail stats
  'trip.members':   { th: 'สมาชิก',  en: 'MEMBERS' },
  'trip.plans':     { th: 'แผน',     en: 'PLANS' },
  'trip.spent':     { th: 'จ่ายแล้ว', en: 'SPENT' },
  'trip.budget':    { th: 'งบ',      en: 'BUDGET' },
  'trip.crew':      { th: 'ทีม',     en: 'CREW' },
  'trip.notes':     { th: 'บันทึก',  en: 'NOTES' },
  'trip.all_trips': { th: '← ทริปทั้งหมด', en: '← ALL TRIPS' },

  // Trip statuses
  'status.planning':  { th: 'วางแผน',    en: 'PLANNING' },
  'status.active':    { th: 'กำลังเที่ยว', en: 'ACTIVE' },
  'status.completed': { th: 'จบแล้ว',     en: 'COMPLETED' },
  'status.archived':  { th: 'เก็บถาวร',   en: 'ARCHIVED' },

  // Itinerary
  'itin.day':            { th: 'วันที่',           en: 'DAY' },
  'itin.unscheduled':    { th: 'ยังไม่กำหนดเวลา',  en: 'UNSCHEDULED' },
  'itin.no_day':         { th: 'ไม่ได้ระบุวัน',    en: 'No day assigned' },
  'itin.nothing_yet':    { th: '— ยังไม่มี —',     en: '— nothing yet —' },
  'itin.add_unscheduled':{ th: '＋ เพิ่มไอเดียเก็บไว้', en: '＋ ADD UNSCHEDULED IDEA' },
} as const

export type TKey = keyof typeof translations

export function t(lang: Lang, key: TKey): string {
  return translations[key]?.[lang] || translations[key]?.en || key
}

// Pick label_th or label_en from a row (activity_types, expense_categories)
export function pickLabel<T extends { label_th: string; label_en: string }>(
  row: T | undefined | null,
  lang: Lang
): string {
  if (!row) return ''
  return lang === 'th' ? row.label_th : row.label_en
}
