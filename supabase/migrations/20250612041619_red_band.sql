/*
  # Dual Status System Implementation

  1. Database Changes
    - Rename status field to appointment_status for clarity
    - Ensure both payment_status and appointment_status are separate fields
    - Update constraints and triggers

  2. Booking Updates Table
    - Add support for tracking both status types
    - Enhanced audit logging

  3. Functions
    - Update status management functions
    - Improve dual status tracking
*/

-- Set timezone to America/Los_Angeles for all operations
SET timezone = 'America/Los_Angeles';

-- Step 1: Ensure appointment_status column exists and is properly configured
DO $$
BEGIN
  -- Add appointment_status if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'appointment_status'
  ) THEN
    ALTER TABLE bookings ADD COLUMN appointment_status text NOT NULL DEFAULT 'pending';
    RAISE NOTICE 'Added appointment_status column';
  END IF;

  -- Migrate data from old status column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'status'
  ) THEN
    -- Migrate existing status data to appointment_status
    UPDATE bookings 
    SET appointment_status = CASE 
      WHEN status = 'paid' THEN 'confirmed'
      WHEN status = 'pending' THEN 'pending'
      WHEN status = 'completed' THEN 'completed'
      WHEN status = 'cancelled' THEN 'cancelled'
      WHEN status = 'no_show' THEN 'no_show'
      ELSE 'pending'
    END
    WHERE appointment_status = 'pending';
    
    RAISE NOTICE 'Migrated status data to appointment_status';
    
    -- Drop old status column constraints
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_name = 'bookings' AND constraint_name = 'valid_status'
    ) THEN
      ALTER TABLE bookings DROP CONSTRAINT valid_status;
    END IF;
    
    -- Drop the old status column
    ALTER TABLE bookings DROP COLUMN status;
    RAISE NOTICE 'Dropped old status column';
  END IF;
END $$;

-- Step 2: Update constraints for both status fields
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

-- Add new constraints
ALTER TABLE bookings
  ADD CONSTRAINT valid_payment_status 
  CHECK (payment_status IN ('pending', 'paid', 'failed'));

ALTER TABLE bookings
  ADD CONSTRAINT valid_appointment_status 
  CHECK (appointment_status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'));

-- Step 3: Update booking_updates table for dual status tracking
DO $$
BEGIN
  -- Add status_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'booking_updates' AND column_name = 'status_type'
  ) THEN
    ALTER TABLE booking_updates ADD COLUMN status_type text NOT NULL DEFAULT 'appointment';
  END IF;

  -- Add payment status tracking columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'booking_updates' AND column_name = 'payment_previous_status'
  ) THEN
    ALTER TABLE booking_updates ADD COLUMN payment_previous_status text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'booking_updates' AND column_name = 'payment_new_status'
  ) THEN
    ALTER TABLE booking_updates ADD COLUMN payment_new_status text;
  END IF;
END $$;

-- Add constraint for status_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'booking_updates' AND constraint_name = 'valid_status_type'
  ) THEN
    ALTER TABLE booking_updates
      ADD CONSTRAINT valid_status_type 
      CHECK (status_type IN ('appointment', 'payment', 'both'));
  END IF;
END $$;

-- Step 4: Update the auto-assignment trigger
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
  
  -- Ensure appointment_status is set to pending for new bookings
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

-- Step 5: Create function for dual status updates
CREATE OR REPLACE FUNCTION update_booking_dual_status(
  p_booking_id uuid,
  p_employee_id uuid,
  p_appointment_status text DEFAULT NULL,
  p_payment_status text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_appointment_status text;
  current_payment_status text;
  status_type text;
BEGIN
  -- Get current statuses
  SELECT appointment_status, payment_status 
  INTO current_appointment_status, current_payment_status
  FROM bookings 
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  -- Determine what type of update this is
  IF p_appointment_status IS NOT NULL AND p_payment_status IS NOT NULL THEN
    status_type := 'both';
  ELSIF p_appointment_status IS NOT NULL THEN
    status_type := 'appointment';
  ELSIF p_payment_status IS NOT NULL THEN
    status_type := 'payment';
  ELSE
    RAISE EXCEPTION 'At least one status must be provided';
  END IF;

  -- Update the booking
  UPDATE bookings 
  SET 
    appointment_status = COALESCE(p_appointment_status, appointment_status),
    payment_status = COALESCE(p_payment_status, payment_status),
    last_updated_by = p_employee_id,
    updated_at = now()
  WHERE id = p_booking_id;

  -- Create audit log entry
  INSERT INTO booking_updates (
    booking_id,
    employee_id,
    status_type,
    previous_status,
    new_status,
    payment_previous_status,
    payment_new_status,
    notes
  ) VALUES (
    p_booking_id,
    p_employee_id,
    status_type,
    CASE WHEN p_appointment_status IS NOT NULL THEN current_appointment_status ELSE NULL END,
    p_appointment_status,
    CASE WHEN p_payment_status IS NOT NULL THEN current_payment_status ELSE NULL END,
    p_payment_status,
    p_notes
  );

  RETURN true;
END;
$$;

-- Step 6: Verification
DO $$
DECLARE
    verification_record RECORD;
    total_bookings integer;
    pending_appointments integer;
    pending_payments integer;
    confirmed_appointments integer;
    paid_payments integer;
BEGIN
    RAISE NOTICE '=== DUAL STATUS SYSTEM MIGRATION VERIFICATION ===';
    
    -- Count bookings by status
    SELECT COUNT(*) INTO total_bookings FROM bookings;
    SELECT COUNT(*) INTO pending_appointments FROM bookings WHERE appointment_status = 'pending';
    SELECT COUNT(*) INTO pending_payments FROM bookings WHERE payment_status = 'pending';
    SELECT COUNT(*) INTO confirmed_appointments FROM bookings WHERE appointment_status = 'confirmed';
    SELECT COUNT(*) INTO paid_payments FROM bookings WHERE payment_status = 'paid';
    
    RAISE NOTICE 'Migration summary:';
    RAISE NOTICE '  Total bookings: %', total_bookings;
    RAISE NOTICE '  Pending appointments: %', pending_appointments;
    RAISE NOTICE '  Confirmed appointments: %', confirmed_appointments;
    RAISE NOTICE '  Pending payments: %', pending_payments;
    RAISE NOTICE '  Paid payments: %', paid_payments;
    
    -- Show sample bookings with dual status
    RAISE NOTICE 'Sample bookings with dual status:';
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
    
    RAISE NOTICE '✅ Dual status system migration completed successfully';
    RAISE NOTICE '✅ Payment statuses: pending, paid, failed';
    RAISE NOTICE '✅ Appointment statuses: pending, confirmed, in_progress, completed, cancelled, no_show';
    
END $$;