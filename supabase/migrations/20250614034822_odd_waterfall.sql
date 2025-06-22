/*
  # Clean up legacy status logic and finalize dual status system

  1. Remove any remaining legacy status references
  2. Ensure only appointment_status and payment_status exist
  3. Clean up any obsolete functions or triggers
  4. Verify dual status system integrity
*/

-- Set timezone to America/Los_Angeles for all operations
SET timezone = 'America/Los_Angeles';

-- Step 1: Remove any legacy status columns that might still exist
DO $$
BEGIN
  -- Drop old status column if it still exists anywhere
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'status'
  ) THEN
    ALTER TABLE bookings DROP COLUMN status;
    RAISE NOTICE 'Removed legacy status column from bookings';
  END IF;

  -- Check booking_updates table for legacy status column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'booking_updates' AND column_name = 'status'
  ) THEN
    ALTER TABLE booking_updates DROP COLUMN status;
    RAISE NOTICE 'Removed legacy status column from booking_updates';
  END IF;
END $$;

-- Step 2: Clean up any obsolete functions
DROP FUNCTION IF EXISTS update_booking_dual_status(uuid, uuid, text, text, text);

-- Step 3: Create streamlined payment update function for webhook
CREATE OR REPLACE FUNCTION update_booking_payment_status(
  p_booking_id uuid,
  p_stripe_session_id text,
  p_payment_status text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update booking with payment status only (keep appointment status independent)
  UPDATE bookings 
  SET 
    payment_status = p_payment_status,
    stripe_session_id = p_stripe_session_id,
    updated_at = now()
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found: %', p_booking_id;
  END IF;

  RETURN true;
END;
$$;

-- Step 4: Ensure all constraints are properly set for dual status system
DO $$
BEGIN
  -- Drop existing constraints if they exist
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'bookings' AND constraint_name = 'valid_payment_status'
  ) THEN
    ALTER TABLE bookings DROP CONSTRAINT valid_payment_status;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'bookings' AND constraint_name = 'valid_appointment_status'
  ) THEN
    ALTER TABLE bookings DROP CONSTRAINT valid_appointment_status;
  END IF;
END $$;

-- Add final constraints for dual status system
ALTER TABLE bookings
  ADD CONSTRAINT valid_payment_status 
  CHECK (payment_status IN ('pending', 'paid', 'failed'));

ALTER TABLE bookings
  ADD CONSTRAINT valid_appointment_status 
  CHECK (appointment_status IN ('pending', 'completed', 'cancelled', 'no_show'));

-- Step 5: Clean up booking_updates constraints
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'booking_updates' AND constraint_name = 'valid_status_change'
  ) THEN
    ALTER TABLE booking_updates DROP CONSTRAINT valid_status_change;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'booking_updates' AND constraint_name = 'valid_status_type'
  ) THEN
    ALTER TABLE booking_updates DROP CONSTRAINT valid_status_type;
  END IF;
END $$;

-- Add cleaned up booking_updates constraints
ALTER TABLE booking_updates
  ADD CONSTRAINT valid_status_change 
  CHECK (new_status IN ('pending', 'completed', 'cancelled', 'no_show'));

ALTER TABLE booking_updates
  ADD CONSTRAINT valid_status_type 
  CHECK (status_type IN ('appointment', 'payment', 'both'));

-- Step 6: Remove any unused environment variables or obsolete RLS policies
-- (This is handled in the application code cleanup)

-- Step 7: Final verification
DO $$
DECLARE
    verification_record RECORD;
    total_bookings integer;
    status_distribution RECORD;
    column_check RECORD;
BEGIN
    RAISE NOTICE '=== LEGACY STATUS CLEANUP VERIFICATION ===';
    
    -- Verify no legacy columns exist
    RAISE NOTICE 'Checking for legacy columns:';
    FOR column_check IN
        SELECT table_name, column_name
        FROM information_schema.columns 
        WHERE table_name IN ('bookings', 'booking_updates') 
        AND column_name = 'status'
    LOOP
        RAISE NOTICE 'WARNING: Legacy status column found in %', column_check.table_name;
    END LOOP;
    
    -- Count bookings and verify dual status system
    SELECT COUNT(*) INTO total_bookings FROM bookings;
    
    RAISE NOTICE 'Dual status system verification:';
    RAISE NOTICE '  Total bookings: %', total_bookings;
    
    -- Check appointment status distribution
    RAISE NOTICE 'Appointment status distribution:';
    FOR status_distribution IN
        SELECT 
            appointment_status,
            COUNT(*) as count,
            ROUND(COUNT(*) * 100.0 / total_bookings, 1) as percentage
        FROM bookings 
        GROUP BY appointment_status
        ORDER BY count DESC
    LOOP
        RAISE NOTICE '  %: % (%.1%%)', 
            status_distribution.appointment_status, 
            status_distribution.count, 
            status_distribution.percentage;
    END LOOP;
    
    -- Check payment status distribution
    RAISE NOTICE 'Payment status distribution:';
    FOR status_distribution IN
        SELECT 
            payment_status,
            COUNT(*) as count,
            ROUND(COUNT(*) * 100.0 / total_bookings, 1) as percentage
        FROM bookings 
        GROUP BY payment_status
        ORDER BY count DESC
    LOOP
        RAISE NOTICE '  %: % (%.1%%)', 
            status_distribution.payment_status, 
            status_distribution.count, 
            status_distribution.percentage;
    END LOOP;
    
    -- Check payment method distribution
    RAISE NOTICE 'Payment method distribution:';
    FOR status_distribution IN
        SELECT 
            payment_method,
            COUNT(*) as count,
            ROUND(COUNT(*) * 100.0 / total_bookings, 1) as percentage
        FROM bookings 
        GROUP BY payment_method
        ORDER BY count DESC
    LOOP
        RAISE NOTICE '  %: % (%.1%%)', 
            status_distribution.payment_method, 
            status_distribution.count, 
            status_distribution.percentage;
    END LOOP;
    
    -- Check for any invalid statuses
    FOR verification_record IN
        SELECT appointment_status, payment_status, COUNT(*) as count
        FROM bookings 
        WHERE appointment_status NOT IN ('pending', 'completed', 'cancelled', 'no_show')
           OR payment_status NOT IN ('pending', 'paid', 'failed')
        GROUP BY appointment_status, payment_status
    LOOP
        RAISE NOTICE 'WARNING: Invalid status combination found: appointment=%, payment=% (% records)', 
            verification_record.appointment_status, 
            verification_record.payment_status,
            verification_record.count;
    END LOOP;
    
    RAISE NOTICE '✅ Legacy status cleanup completed successfully';
    RAISE NOTICE '✅ Dual status system is now fully implemented';
    RAISE NOTICE '✅ Valid appointment statuses: pending, completed, cancelled, no_show';
    RAISE NOTICE '✅ Valid payment statuses: pending, paid, failed';
    
END $$;