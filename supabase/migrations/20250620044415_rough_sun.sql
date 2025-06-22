-- Drop policy if it exists to avoid the error
DROP POLICY IF EXISTS "Admins can view all email logs" ON email_logs;

-- Create email_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  recipient text NOT NULL,
  subject text NOT NULL,
  email_type text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create index on booking_id for faster lookups
CREATE INDEX IF NOT EXISTS email_logs_booking_id_idx ON email_logs(booking_id);

-- Create index on email_type for faster filtering
CREATE INDEX IF NOT EXISTS email_logs_email_type_idx ON email_logs(email_type);

-- Enable RLS
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admins can view all email logs"
  ON email_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE employees.auth_user_id = auth.uid() 
      AND employees.role = 'admin'
    )
  );

-- Create function to create email_logs table if it doesn't exist
CREATE OR REPLACE FUNCTION create_email_logs_table()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  policy_exists boolean;
BEGIN
  -- Check if table exists
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'email_logs'
  ) THEN
    -- Create the table with IF NOT EXISTS for all objects
    CREATE TABLE IF NOT EXISTS email_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
      recipient text NOT NULL,
      subject text NOT NULL,
      email_type text NOT NULL,
      sent_at timestamptz NOT NULL DEFAULT now(),
      status text NOT NULL,
      error_message text,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    
    CREATE INDEX IF NOT EXISTS email_logs_booking_id_idx ON email_logs(booking_id);
    CREATE INDEX IF NOT EXISTS email_logs_email_type_idx ON email_logs(email_type);
    
    ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
    
    -- Check if policy exists
    SELECT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'email_logs' 
      AND policyname = 'Admins can view all email logs'
    ) INTO policy_exists;
    
    -- Create policy if it doesn't exist
    IF NOT policy_exists THEN
      CREATE POLICY "Admins can view all email logs"
        ON email_logs
        FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM employees 
            WHERE employees.auth_user_id = auth.uid() 
            AND employees.role = 'admin'
          )
        );
    END IF;
    
    RAISE NOTICE 'Created email_logs table';
  ELSE
    RAISE NOTICE 'email_logs table already exists';
  END IF;
END;
$$;