-- ==========================================================================
-- TripPal — Seed Data
-- Run this after migrations are complete
-- ==========================================================================


-- ==========================================================================
-- Activity Types (configurable from DB · เพิ่ม/ลบได้ตลอด)
-- ==========================================================================
INSERT INTO public.activity_types (id, label_th, label_en, icon, color, sort_order) VALUES
  ('flight',       'เที่ยวบิน',       'Flight',       '✈️', '#185FA5', 1),
  ('train',        'รถไฟ',            'Train',        '🚄', '#0F6E56', 2),
  ('bus',          'รถบัส',           'Bus',          '🚌', '#854F0B', 3),
  ('car',          'รถยนต์',          'Car',          '🚗', '#5F5E5A', 4),
  ('hotel',        'ที่พัก',          'Hotel',        '🏨', '#0F6E56', 5),
  ('food',         'อาหาร',           'Food & Drink', '🍴', '#993C1D', 6),
  ('sightseeing',  'เที่ยวชม',        'Sightseeing',  '📸', '#534AB7', 7),
  ('shopping',     'ช้อปปิ้ง',        'Shopping',     '🛍️', '#993556', 8),
  ('activity',     'กิจกรรม',         'Activity',     '🎢', '#E63946', 9),
  ('event',        'อีเวนต์/คอนเสิร์ต', 'Event',      '🎫', '#5DCAA5', 10),
  ('meeting',      'นัดเจอ',          'Meeting',      '👥', '#444441', 11),
  ('other',        'อื่นๆ',           'Other',        '📌', '#888780', 99);


-- ==========================================================================
-- Expense Categories
-- ==========================================================================
INSERT INTO public.expense_categories (id, label_th, label_en, icon, color, sort_order) VALUES
  ('food',         'อาหาร',           'Food & Drink', '🍴', '#993C1D', 1),
  ('transport',    'การเดินทาง',      'Transport',    '🚇', '#185FA5', 2),
  ('accommodation','ที่พัก',          'Accommodation','🏨', '#0F6E56', 3),
  ('shopping',     'ช้อปปิ้ง',        'Shopping',     '🛍️', '#993556', 4),
  ('entertainment','ความบันเทิง',     'Entertainment','🎢', '#E63946', 5),
  ('tickets',      'ตั๋วต่างๆ',       'Tickets',      '🎫', '#534AB7', 6),
  ('groceries',    'ของกินใช้',       'Groceries',    '🛒', '#5DCAA5', 7),
  ('souvenirs',    'ของฝาก',          'Souvenirs',    '🎁', '#D85A30', 8),
  ('insurance',    'ประกัน',          'Insurance',    '🛡️', '#888780', 9),
  ('sim',          'ซิม/อินเทอร์เน็ต', 'SIM/Internet','📱', '#444441', 10),
  ('other',        'อื่นๆ',           'Other',        '💰', '#888780', 99);


-- ==========================================================================
-- (Optional) Demo trip for testing
-- Uncomment after you have a user account
-- ==========================================================================
-- INSERT INTO public.trips (name, destination, start_date, end_date, budget_amount, default_currency, owner_id)
-- VALUES ('ญี่ปุ่น 7 วัน', 'Osaka & Tokyo', '2026-06-07', '2026-06-13', 30000, 'THB',
--   'YOUR-USER-UUID-HERE');  -- ← replace with your user ID from auth.users


-- ==========================================================================
-- DONE! All seed data loaded.
-- เริ่มใช้งานได้แล้ว · npm run dev
-- ==========================================================================
