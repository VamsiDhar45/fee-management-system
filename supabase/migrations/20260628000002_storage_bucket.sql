-- Create receipts bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads to receipts" ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'receipts');

-- Policy to allow public read access (since receipts need to be viewable)
CREATE POLICY "Allow public read for receipts" ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'receipts');

-- Policy to allow authenticated users to update their files (optional)
CREATE POLICY "Allow authenticated updates to receipts" ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'receipts');

-- Policy to allow authenticated users to delete files
CREATE POLICY "Allow authenticated deletes for receipts" ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'receipts');
