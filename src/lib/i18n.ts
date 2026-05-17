// ==========================================================================
// Lightweight i18n — Thai + English
//
// This file is safe to import from both Client and Server components — it
// contains only pure translations. Server-only helpers (getLang) live in
// i18n.server.ts to avoid pulling next/headers into client bundles.
// ==========================================================================

export type Lang = 'th' | 'en'

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

  // Login page
  'login.hello':       { th: '★ สวัสดี นักเดินทาง', en: '★ HELLO TRAVELER' },
  'login.tagline1':    { th: 'วางแผนทริปกับเพื่อนๆ', en: 'Plan trips with your crew.' },
  'login.tagline2':    { th: 'หารค่าใช้จ่าย เก็บความทรงจำ', en: 'Split costs. Make memories.' },
  'login.with_google': { th: 'เข้าสู่ระบบด้วย GOOGLE', en: 'CONTINUE WITH GOOGLE' },
  'login.or':          { th: 'หรือ', en: 'OR' },
  'login.use_email':   { th: 'ใช้อีเมล →', en: 'USE EMAIL →' },
  'login.email_ph':    { th: 'your@email.com', en: 'your@email.com' },
  'login.magic_send':  { th: 'ส่งลิงก์เข้าระบบ →', en: 'SEND MAGIC LINK →' },
  'login.sending':     { th: 'กำลังส่ง...', en: 'SENDING...' },
  'login.magic_ok':    { th: '✓ เช็คอีเมลแล้วกดลิงก์', en: '✓ Check your email for login link!' },
  'login.agree':       { th: 'การใช้งานต่อ ถือว่ายอมรับ', en: 'By continuing you agree to' },
  'login.terms':       { th: 'เงื่อนไข', en: 'Terms' },
  'login.privacy':     { th: 'ความเป็นส่วนตัว', en: 'Privacy' },

  // Onboarding
  'onb.kicker':     { th: '★ อีกขั้นเดียว',          en: '★ ONE LAST THING' },
  'onb.heading1':   { th: 'อยากให้',                 en: 'WHAT SHOULD' },
  'onb.heading2':   { th: 'เรียกคุณว่า?',            en: 'WE CALL YOU?' },
  'onb.sub1':       { th: 'ชื่อเล่นสั้นๆ ที่ทีมจะเห็น', en: 'A short nickname your crew will see.' },
  'onb.sub2':       { th: 'แก้ทีหลังได้',            en: 'You can change it later.' },
  'onb.placeholder':{ th: 'เช่น ตูน, แนต, พลอย',    en: 'e.g. Tum, Nat, Ploy' },
  'onb.loading':    { th: 'กำลังโหลด...',           en: 'LOADING...' },
  'onb.saving':     { th: 'กำลังบันทึก...',          en: 'SAVING...' },
  'onb.err_required':{ th: 'ต้องระบุชื่อ',           en: 'Name is required' },
  'onb.err_long':    { th: 'ห้ามเกิน 20 ตัวอักษร',    en: 'Keep it under 20 characters' },

  // Trips list (PLAN page)
  'trips.kicker':    { th: '✈ ทริปทั้งหมด · ★ ★ ★', en: '✈ ALL TRIPS · ★ ★ ★' },
  'trips.upcoming':  { th: 'ที่จะไป',  en: 'UPCOMING' },
  'trips.past':      { th: 'ที่ไปแล้ว', en: 'PAST' },
  'trips.awaiting':  { th: 'รออนุมัติ', en: 'AWAITING APPROVAL' },
  'trips.no_upcoming':{ th: 'ยังไม่มีทริปที่จะไป สร้างเลย ↑', en: 'No upcoming trips. Plan one ↑' },
  'trips.waiting':   { th: '⏳ รออนุมัติ', en: '⏳ WAITING' },

  // New trip form
  'newtrip.kicker':  { th: '★ ทริปใหม่', en: '★ NEW ADVENTURE' },
  'newtrip.heading': { th: 'เริ่มทริป',  en: 'START A TRIP.' },
  'newtrip.name':    { th: 'ชื่อทริป *', en: 'TRIP NAME *' },
  'newtrip.name_ph': { th: 'เช่น ญี่ปุ่น 2026', en: 'Japan 2026' },
  'newtrip.dest':    { th: 'จุดหมาย',     en: 'DESTINATION' },
  'newtrip.dest_ph': { th: 'โอซาก้า, โตเกียว, เกียวโต', en: 'Tokyo, Osaka, Kyoto' },
  'newtrip.start':   { th: 'เริ่ม *',     en: 'START *' },
  'newtrip.end':     { th: 'จบ *',       en: 'END *' },
  'newtrip.curr':    { th: 'สกุลเงิน',    en: 'CURRENCY' },
  'newtrip.budget':  { th: 'งบ (ไม่จำเป็น)', en: 'BUDGET (optional)' },
  'newtrip.creating':{ th: 'กำลังสร้าง...',  en: 'CREATING...' },
  'newtrip.create':  { th: 'สร้างทริป →',    en: 'CREATE TRIP →' },
  'newtrip.err':     { th: 'ต้องระบุชื่อ วันที่เริ่ม และวันที่จบ', en: 'Name, start date, and end date are required' },
  'newtrip.err_dates':{ th: 'วันที่จบต้องไม่ก่อนวันที่เริ่ม',     en: 'End date must be on or after start date' },

  // Edit trip
  'edit.kicker':    { th: '✎ เจ้าของ', en: '✎ OWNER · ★ ★ ★' },
  'edit.heading':   { th: 'แก้ทริป',    en: 'EDIT TRIP.' },
  'edit.notes':     { th: 'หมายเหตุ',   en: 'DESCRIPTION / NOTES' },
  'edit.status':    { th: 'สถานะ',     en: 'STATUS' },
  'edit.danger':    { th: 'โซนอันตราย', en: 'DANGER ZONE' },
  'edit.archive':   { th: '📦 เก็บถาวร', en: '📦 ARCHIVE' },
  'edit.delete':    { th: '✗ ลบถาวร',  en: '✗ DELETE FOREVER' },
  'edit.deleting':  { th: 'กำลังลบ...', en: 'DELETING...' },
  'edit.save':      { th: 'บันทึก',     en: 'SAVE CHANGES' },
  'edit.saving':    { th: 'กำลังบันทึก...', en: 'SAVING...' },
  'edit.confirm_archive':{ th: 'เก็บทริปนี้เข้าคลัง? จะถูกซ่อนจากรายการ', en: 'Archive this trip? It will be hidden from your active list.' },

  // Top-level expenses page
  'pay.kicker':       { th: '฿ ค่าใช้จ่าย · ★ ★ ★', en: '฿ EXPENSES · ★ ★ ★' },
  'pay.total':        { th: 'จ่ายไปแล้ว (THB)',     en: 'TOTAL SPENT (THB)' },
  'pay.across':       { th: 'จากทั้งหมด',          en: 'Across' },
  'pay.trips':        { th: 'ทริป',                en: 'trips' },
  'pay.trip':         { th: 'ทริป',                en: 'trip' },
  'pay.by_trip':      { th: 'แยกตามทริป',          en: 'BY TRIP' },
  'pay.no_trips':     { th: 'ยังไม่มีทริปเลย',      en: 'No trips yet.' },
  'pay.start_one':    { th: 'เริ่มทริปแรก',         en: 'Start one' },
  'pay.budget_of':    { th: 'จากงบ',              en: 'of' },

  // Trip-level expenses
  'exp.kicker':      { th: '฿ หารบิล · ★ ★ ★',    en: '฿ SPLIT THE BILL · ★ ★ ★' },
  'exp.trip_total':  { th: 'รวมทั้งทริป',          en: 'TRIP TOTAL' },
  'exp.your_balance':{ th: 'ยอดของคุณ',            en: 'YOUR BALANCE' },
  'exp.youre_owed':  { th: 'มีคนเป็นหนี้คุณ',      en: 'You are owed' },
  'exp.you_owe':     { th: 'คุณเป็นหนี้',          en: 'You owe' },
  'exp.all_even':    { th: 'หายกันหมด',            en: 'All even' },
  'exp.settle_up':   { th: 'ใครต้องโอนใคร',        en: 'SETTLE UP' },
  'exp.new':         { th: '＋ เพิ่มค่าใช้จ่าย',   en: '＋ NEW EXPENSE' },
  'exp.edit':        { th: 'แก้ค่าใช้จ่าย',        en: 'EDIT EXPENSE' },
  'exp.add_new':     { th: '＋ ค่าใช้จ่ายใหม่',    en: '＋ NEW EXPENSE' },
  'exp.what':        { th: 'รายการ *',            en: 'WHAT *' },
  'exp.what_ph':     { th: 'เช่น ดินเนอร์ที่ Ichiran', en: 'e.g. Dinner at Ichiran' },
  'exp.amount':      { th: 'จำนวน *',             en: 'AMOUNT *' },
  'exp.category':    { th: 'หมวด',                en: 'CATEGORY' },
  'exp.paid_by':     { th: 'จ่ายโดย',             en: 'PAID BY' },
  'exp.date':        { th: 'วันที่',               en: 'DATE' },
  'exp.split_with':  { th: 'หารกับ',              en: 'SPLIT WITH' },
  'exp.all_btn':     { th: 'ทั้งหมด',             en: 'ALL' },
  'exp.notes':       { th: 'หมายเหตุ',            en: 'NOTES' },
  'exp.add':         { th: 'เพิ่มค่าใช้จ่าย',      en: 'ADD EXPENSE' },
  'exp.update':      { th: 'อัพเดท',              en: 'UPDATE' },
  'exp.all_expenses':{ th: 'ทั้งหมด',             en: 'ALL EXPENSES' },
  'exp.no_expenses': { th: '— ยังไม่มีค่าใช้จ่าย —', en: '— no expenses yet —' },
  'exp.paid_by_label':{ th: 'จ่ายโดย',            en: 'Paid by' },
  'exp.split_ways':  { th: 'หารกัน',              en: 'split' },
  'exp.ways':        { th: 'คน',                  en: 'ways' },
  'exp.all_settled': { th: 'จ่ายหมดแล้ว ✓',        en: 'all settled ✓' },
  'exp.settled':     { th: 'จ่ายแล้ว',             en: 'settled' },
  'exp.splits':      { th: 'รายการหาร — กดเพื่อบอกว่าจ่ายแล้ว', en: 'SPLITS — tap to mark settled' },
  'exp.paid_label':  { th: '(จ่าย)',              en: '(paid)' },
  'exp.each':        { th: 'หารคนละ',             en: 'each' },
  'exp.people':      { th: 'คน',                  en: 'people' },
  'exp.delete_confirm':{ th: 'ลบค่าใช้จ่ายนี้?',    en: 'Delete this expense?' },
  'exp.err_required':{ th: 'ต้องระบุรายการ และจำนวน > 0', en: 'Description and amount > 0 are required' },
  'exp.err_split':   { th: 'เลือกคนที่จะหารด้วยอย่างน้อย 1 คน', en: 'Select at least one person to split with' },

  // Checklist
  'cl.kicker':       { th: '✓ แพ็คของ & เตรียม · ★ ★ ★', en: '✓ PACK & PREP · ★ ★ ★' },
  'cl.new_title':    { th: 'ชื่อลิสต์ใหม่ (เช่น แพ็คของ)', en: 'New list title (e.g. Packing)' },
  'cl.no_lists':     { th: '— ยังไม่มีเช็คลิสต์ —', en: '— no checklists yet —' },
  'cl.create_above': { th: 'สร้างด้านบน ↑',         en: 'Create one above ↑' },
  'cl.done':         { th: 'ทำแล้ว',                en: 'done' },
  'cl.add_item':     { th: 'เพิ่มรายการ...',         en: 'Add item...' },
  'cl.all_chip':     { th: 'ทุกคน',                 en: 'All' },
  'cl.delete_list':  { th: 'ลบเช็คลิสต์ทั้งหมด?',     en: 'Delete this entire checklist?' },

  // Docs
  'docs.kicker':       { th: '📄 ตั๋ว & พาส · ★ ★ ★', en: '📄 TICKETS & PASSES · ★ ★ ★' },
  'docs.upload':       { th: '＋ อัพโหลดไฟล์',       en: '＋ UPLOAD FILE' },
  'docs.category':     { th: 'หมวด',                en: 'CATEGORY' },
  'docs.file':         { th: 'ไฟล์ (สูงสุด 10MB)',   en: 'FILE (max 10MB)' },
  'docs.uploading':    { th: 'กำลังอัพโหลด...',     en: 'Uploading...' },
  'docs.saving':       { th: 'กำลังบันทึก...',       en: 'Saving record...' },
  'docs.upload_btn':   { th: 'อัพโหลด',             en: 'UPLOAD' },
  'docs.all_files':    { th: 'ทั้งหมด',             en: 'ALL FILES' },
  'docs.no_files':     { th: '— ยังไม่มีไฟล์ —',     en: '— no files yet —' },
  'docs.open':         { th: 'เปิด ↗',              en: 'OPEN ↗' },
  'docs.pick_first':   { th: 'เลือกไฟล์ก่อน',        en: 'Pick a file first' },
  'docs.too_big':      { th: 'ไฟล์ใหญ่เกิน (สูงสุด 10MB)', en: 'File too big (max 10 MB)' },
  'docs.cat_ticket':   { th: 'ตั๋ว',                en: 'Ticket' },
  'docs.cat_hotel':    { th: 'โรงแรม',              en: 'Hotel' },
  'docs.cat_insurance':{ th: 'ประกัน',              en: 'Insurance' },
  'docs.cat_id':       { th: 'ID/วีซ่า',            en: 'ID/Visa' },
  'docs.cat_receipt':  { th: 'ใบเสร็จ',             en: 'Receipt' },
  'docs.cat_other':    { th: 'อื่นๆ',               en: 'Other' },

  // Members page
  'mem.kicker':      { th: '◉ ทีม · ★ ★ ★',        en: '◉ THE CREW · ★ ★ ★' },
  'mem.heading':     { th: 'สมาชิก',                en: 'MEMBERS.' },
  'mem.pending':     { th: 'รออนุมัติ',             en: 'PENDING' },
  'mem.approved':    { th: 'อนุมัติแล้ว',           en: 'APPROVED' },
  'mem.you':         { th: '(คุณ)',                 en: '(you)' },
  'mem.joined':      { th: 'เข้าร่วม',              en: 'joined' },
  'mem.wants_join':  { th: 'ขอเข้าทริป',           en: 'wants to join' },
  'mem.reject':      { th: 'ปฏิเสธคำขอนี้? เขาจะต้องขอลิงก์ใหม่', en: 'Reject this request? They will need a new invite to try again.' },
  'mem.confirm_remove':{ th: 'ลบคนนี้ออก? เขาจะสูญเสียสิทธิ์เข้าทริป', en: 'Remove from trip? They will lose access.' },
  'mem.remove':      { th: 'ลบ',                   en: 'REMOVE' },
  'mem.invite_links':{ th: '✉ ลิงก์เชิญ',           en: '✉ INVITE LINKS' },
  'mem.role':        { th: 'บทบาท',                en: 'ROLE' },
  'mem.max_uses':    { th: 'จำนวนสูงสุด',          en: 'MAX USES' },
  'mem.days':        { th: 'หมดอายุ (วัน)',         en: 'DAYS' },
  'mem.create_link': { th: '＋ สร้างลิงก์',          en: '＋ CREATE LINK' },
  'mem.creating':    { th: 'กำลังสร้าง...',         en: 'CREATING...' },
  'mem.link_created':{ th: '★ สร้างลิงก์แล้ว — copy ส่งให้เพื่อน', en: '★ LINK CREATED — copy & share' },
  'mem.copy':        { th: '📋 COPY ลิงก์',         en: '📋 COPY LINK' },
  'mem.copied':      { th: '✓ COPY แล้ว',          en: '✓ COPIED' },
  'mem.active_links':{ th: 'ลิงก์ที่ใช้งาน',         en: 'ACTIVE LINKS' },
  'mem.used':        { th: 'ใช้',                  en: 'used' },
  'mem.expired':     { th: 'หมดอายุ',              en: 'EXPIRED' },
  'mem.expires':     { th: 'หมดอายุ',              en: 'expires' },
  'mem.revoke':      { th: 'ยกเลิกลิงก์นี้?',        en: 'Revoke this invite link?' },
  'mem.copy_short':  { th: 'COPY',                 en: 'COPY' },

  // Settings page
  'set.kicker':      { th: '◉ บัญชีของคุณ · ★ ★ ★', en: '◉ YOUR CREW · ★ ★ ★' },
  'set.heading':     { th: 'บัญชี',                en: 'CREW.' },
  'set.display':     { th: 'ชื่อเล่น',              en: 'DISPLAY NAME' },
  'set.save_changes':{ th: 'บันทึก',               en: 'SAVE CHANGES' },
  'set.saving':      { th: 'กำลังบันทึก...',         en: 'SAVING...' },
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
