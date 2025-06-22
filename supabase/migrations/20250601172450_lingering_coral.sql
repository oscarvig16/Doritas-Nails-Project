-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public insert for bookings" ON bookings;
DROP POLICY IF EXISTS "Users can read own bookings" ON bookings;
DROP POLICY IF EXISTS "Allow payment status updates" ON bookings;

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
WITH CHECK (
  -- Only allow updating payment_status and stripe_session_id
  payment_status IS NOT NULL AND
  stripe_session_id IS NOT NULL
);