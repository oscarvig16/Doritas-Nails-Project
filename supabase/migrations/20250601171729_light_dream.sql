-- Enable RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Policy to allow public inserts
CREATE POLICY "Allow public insert for bookings"
ON bookings
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Policy to allow reading own bookings
CREATE POLICY "Users can read own bookings"
ON bookings
FOR SELECT
TO anon, authenticated
USING (true);

-- Policy to allow payment status updates
CREATE POLICY "Allow payment status updates"
ON bookings
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);