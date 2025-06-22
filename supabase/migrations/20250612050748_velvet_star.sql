/*
  # Clean up appointment status logic

  1. Status Cleanup
    - Remove "in_progress" and "confirmed" from valid appointment statuses
    - Update constraint to only allow: pending, completed, cancelled, no_show
    - Migrate existing "confirmed" and "in_progress" records to "pending"

  2. Data Migration
    - Safely migrate existing records with removed statuses
    - Update booking_updates table constraints
    - Ensure no data loss during migration

  3. Verification
    - Verify all records have valid statuses
    - Check constraint enforcement
*/

-- Set timezone to America/Los_Angeles for all operations
SET timezone = 'America/Los_Angeles';

-- Step 1: Migrate existing records with removed statuses
DO $$
DECLARE
    confirmed_count integer;
    in_progress_count integer;
    total_migrated integer := 0;
BEGIN
    RAISE NOTICE '=== CLEANING UP APPOINTMENT STATUS LOGIC ===';
    
    -- Count existing records with statuses to be removed
    SELECT COUNT(*) INTO confirmed_count FROM bookings WHERE appointment_status = 'confirmed';
    SELECT COUNT(*) INTO in_progress_count FROM bookings WHERE appointment_status = 'in_progress';
    
    RAISE NOTICE 'Records to migrate:';
    RAISE NOTICE '  Confirmed appointments: %', confirmed_count;
    RAISE NOTICE '  In-progress appointments: %', in_progress_count;
    
    -- Migrate "confirmed" appointments to "pending"
    IF confirmed_count > 0 THEN
        UPDATE bookings 
        SET appointment_status = 'pending',
            updated_at = now()
        WHERE appointment_status = 'confirmed';
        
        total_migrated := total_migrated + confirmed_count;
        RAISE NOTICE 'Migrated % confirmed appointments to pending', confirmed_count;
    END IF;
    
    -- Migrate "in_progress" appointments to "pending"
    IF in_progress_count > 0 THEN
        UPDATE bookings 
        SET appointment_status = 'pending',
            updated_at = now()
        WHERE appointment_status = 'in_progress';
        
        total_migrated := total_migrated + in_progress_count;
        RAISE NOTICE 'Migrated % in-progress appointments to pending', in_progress_count;
    END IF;
    
    RAISE NOTICE 'Total records migrated: %', total_migrated;
END $$;

-- Step 2: Update booking_updates table to remove invalid statuses
UPDATE booking_updates 
SET new_status = 'pending',
    notes = COALESCE(notes, '') || ' [Status cleaned up from ' || new_status || ']'
WHERE new_status IN ('confirmed', 'in_progress');

UPDATE booking_updates 
SET previous_status = 'pending'
WHERE previous_status IN ('confirmed', 'in_progress');

-- Step 3: Drop and recreate the appointment status constraint
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS valid_appointment_status;

-- Add the cleaned up constraint
ALTER TABLE bookings
  ADD CONSTRAINT valid_appointment_status 
  CHECK (appointment_status IN ('pending', 'completed', 'cancelled', 'no_show'));

-- Step 4: Update booking_updates constraint for new_status
ALTER TABLE booking_updates DROP CONSTRAINT IF EXISTS valid_status_change;

ALTER TABLE booking_updates
  ADD CONSTRAINT valid_status_change 
  CHECK (new_status IN ('pending', 'completed', 'cancelled', 'no_show'));

-- Step 5: Update the auto-assignment function to use cleaned statuses
CREATE OR REPLACE FUNCTION auto_assign_employee()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  target_employee_id uuid;
  technician_name text;
  dora_employee_id uuid;
  aracely_employee_id uuid;
BEGIN
  -- Only process if employee_id is not already set
  IF NEW.employee_id IS NULL AND NEW.technicians IS NOT NULL AND NEW.technicians->>'type' != 'auto' THEN
    
    -- Get current employee IDs for direct matching
    SELECT id INTO dora_employee_id 
    FROM employees 
    WHERE name = 'Dora Alviter'
    LIMIT 1;
    
    SELECT id INTO aracely_employee_id 
    FROM employees 
    WHERE name = 'Aracely Orozco'
    LIMIT 1;
    
    -- Extract technician name with comprehensive logic
    IF NEW.technicians->>'type' = 'single' THEN
      -- Single technician for all services
      IF NEW.technicians->'manicureTech'->>'name' IS NOT NULL THEN
        technician_name := TRIM(NEW.technicians->'manicureTech'->>'name');
      END IF;
      
    ELSIF NEW.technicians->>'type' = 'split' THEN
      -- Split technicians - prioritize manicure tech, fallback to pedicure tech
      IF NEW.technicians->'manicureTech'->>'name' IS NOT NULL THEN
        technician_name := TRIM(NEW.technicians->'manicureTech'->>'name');
      ELSIF NEW.technicians->'pedicureTech'->>'name' IS NOT NULL THEN
        technician_name := TRIM(NEW.technicians->'pedicureTech'->>'name');
      END IF;
    END IF;
    
    -- Find matching employee using multiple strategies
    IF technician_name IS NOT NULL THEN
      -- Strategy 1: Exact match
      IF technician_name = 'Dora Alviter' THEN
        target_employee_id := dora_employee_id;
      ELSIF technician_name = 'Aracely Orozco' THEN
        target_employee_id := aracely_employee_id;
      
      -- Strategy 2: Case-insensitive exact match
      ELSIF LOWER(technician_name) = 'dora alviter' THEN
        target_employee_id := dora_employee_id;
      ELSIF LOWER(technician_name) = 'aracely orozco' THEN
        target_employee_id := aracely_employee_id;
      
      -- Strategy 3: Partial matching for variations
      ELSIF LOWER(technician_name) LIKE '%dora%' OR LOWER(technician_name) LIKE '%alviter%' THEN
        target_employee_id := dora_employee_id;
      ELSIF LOWER(technician_name) LIKE '%aracely%' OR LOWER(technician_name) LIKE '%orozco%' THEN
        target_employee_id := aracely_employee_id;
      END IF;
      
      -- Set the employee_id in the NEW record
      IF target_employee_id IS NOT NULL THEN
        NEW.employee_id := target_employee_id;
      END IF;
    END IF;
  END IF;
  
  -- Ensure appointment_status is set to pending for new bookings (cleaned up status)
  IF NEW.appointment_status IS NULL THEN
    NEW.appointment_status := 'pending';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS auto_assign_employee_trigger ON bookings;
CREATE TRIGGER auto_assign_employee_trigger
  BEFORE INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_employee();

-- Step 6: Update the payment update function to use cleaned statuses
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
  -- Update booking with payment status only (no automatic appointment status change)
  UPDATE bookings 
  SET 
    payment_status = p_payment_status,
    stripe_session_id = p_stripe_session_id,
    updated_at = now()
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  RETURN true;
END;
$$;

-- Step 7: Verification
DO $$
DECLARE
    verification_record RECORD;
    total_bookings integer;
    status_counts RECORD;
BEGIN
    RAISE NOTICE '=== APPOINTMENT STATUS CLEANUP VERIFICATION ===';
    
    -- Count bookings by status
    SELECT COUNT(*) INTO total_bookings FROM bookings;
    
    RAISE NOTICE 'Total bookings: %', total_bookings;
    RAISE NOTICE 'Appointment status distribution:';
    
    FOR status_counts IN
        SELECT 
            appointment_status,
            COUNT(*) as count,
            ROUND(COUNT(*) * 100.0 / total_bookings, 1) as percentage
        FROM bookings 
        GROUP BY appointment_status
        ORDER BY count DESC
    LOOP
        RAISE NOTICE '  %: % (%.1%%)', 
            status_counts.appointment_status, 
            status_counts.count, 
            status_counts.percentage;
    END LOOP;
    
    -- Verify no invalid statuses remain
    FOR verification_record IN
        SELECT appointment_status, COUNT(*) as count
        FROM bookings 
        WHERE appointment_status NOT IN ('pending', 'completed', 'cancelled', 'no_show')
        GROUP BY appointment_status
    LOOP
        RAISE NOTICE 'WARNING: Invalid status found: % (% records)', 
            verification_record.appointment_status, 
            verification_record.count;
    END LOOP;
    
    -- Show sample bookings with cleaned statuses
    RAISE NOTICE 'Sample bookings with cleaned appointment statuses:';
    FOR verification_record IN
        SELECT 
            id,
            customer_first_name || ' ' || customer_last_name as customer_name,
            appointment_date,
            payment_status,
            appointment_status,
            payment_method
        FROM bookings 
        ORDER BY appointment_date DESC
        LIMIT 5
    LOOP
        RAISE NOTICE '  % | % | % | Payment: % | Appointment: % | Method: %',
            verification_record.id,
            verification_record.customer_name,
            verification_record.appointment_date,
            verification_record.payment_status,
            verification_record.appointment_status,
            verification_record.payment_method;
    END LOOP;
    
    RAISE NOTICE '✅ Appointment status cleanup completed successfully';
    RAISE NOTICE '✅ Valid appointment statuses: pending, completed, cancelled, no_show';
    RAISE NOTICE '✅ Removed statuses: confirmed, in_progress';
    
END $$;