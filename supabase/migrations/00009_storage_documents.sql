-- ==========================================================================
-- Storage bucket for trip documents (tickets, hotel confirmations, etc.)
--
-- Path convention: <trip_id>/<random>.<ext>
-- Reading: any approved trip member can download via signed URL.
-- Writing: editors+ only.
-- ==========================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('trip-documents', 'trip-documents', false)
ON CONFLICT (id) DO NOTHING;


-- Drop any previous policies (safe re-run)
DROP POLICY IF EXISTS "trip_docs_read"   ON storage.objects;
DROP POLICY IF EXISTS "trip_docs_insert" ON storage.objects;
DROP POLICY IF EXISTS "trip_docs_delete" ON storage.objects;


-- READ: approved members of the trip
CREATE POLICY "trip_docs_read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'trip-documents'
    AND public.is_trip_member((string_to_array(name, '/'))[1]::uuid)
  );

-- WRITE: editors+ of the trip
CREATE POLICY "trip_docs_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'trip-documents'
    AND public.is_trip_editor((string_to_array(name, '/'))[1]::uuid)
  );

-- DELETE: editors+ of the trip
CREATE POLICY "trip_docs_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'trip-documents'
    AND public.is_trip_editor((string_to_array(name, '/'))[1]::uuid)
  );
