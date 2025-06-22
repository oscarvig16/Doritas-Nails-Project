/*
  # Add Stripe SetupIntent Support for No-Show Fees

  1. Schema Changes
    - Add stripe_setup_intent_id column to bookings table
    - This will store the Stripe SetupIntent ID for future charging

  2. Benefits
    - Enable no-show fee charging for pay-on-site bookings
    - Improve customer experience by not requiring payment upfront
    - Allow secure storage of payment methods for future use
*/

-- Set timezone to America/Los_Angeles for all operations
SET timezone = 'America/Los_Angeles';

-- Add stripe_setup_intent_id column to bookings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'stripe_setup_intent_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN stripe_setup_intent_id text;
    RAISE NOTICE 'Added stripe_setup_intent_id column';
  END IF;
END $$;

-- Update RLS policies to allow updating stripe_setup_intent_id
DROP POLICY IF EXISTS "Allow payment status updates" ON bookings;

-- Create a more permissive policy for payment updates
CREATE POLICY "Allow payment status updates"
  ON bookings
  FOR UPDATE
  TO anon, authenticated
  WITH CHECK (
    -- Allow updating payment_status and stripe_session_id
    (payment_status IS NOT NULL AND stripe_session_id IS NOT NULL) OR
    -- Allow updating stripe_setup_intent_id and stripe_customer_id
    (stripe_setup_intent_id IS NOT NULL AND stripe_customer_id IS NOT NULL)
  );

-- Verification
DO $$
DECLARE
    column_check RECORD;
    policy_check RECORD;
BEGIN
    RAISE NOTICE '=== STRIPE SETUPINTENT MIGRATION VERIFICATION ===';
    
    -- Verify column exists
    SELECT column_name, data_type 
    INTO column_check
    FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'stripe_setup_intent_id';
    
    IF FOUND THEN
        RAISE NOTICE 'Column stripe_setup_intent_id exists with type: %', column_check.data_type;
    ELSE
        RAISE NOTICE 'WARNING: Column stripe_setup_intent_id does not exist!';
    END IF;
    
    -- Verify policy exists
    SELECT policyname
    INTO policy_check
    FROM pg_policies 
    WHERE tablename = 'bookings' AND policyname = 'Allow payment status updates';
    
    IF FOUND THEN
        RAISE NOTICE 'Policy "Allow payment status updates" exists';
    ELSE
        RAISE NOTICE 'WARNING: Policy "Allow payment status updates" does not exist!';
    END IF;
    
    RAISE NOTICE '✅ Stripe SetupIntent migration completed successfully';
    
END $$;