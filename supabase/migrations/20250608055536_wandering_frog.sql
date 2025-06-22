/*
  # Final Booking Assignment Fix

  1. Updates
    - Ensure all existing bookings have correct employee_id assignments
    - Fix any remaining NULL employee_id values
    - Verify technician name matching works correctly

  2. Verification
    - Comprehensive verification of booking assignments
    - Ensure both Dora and Aracely have their bookings properly assigned
*/

-- Set timezone to America/Los_Angeles for all operations
SET timezone = 'America/Los_Angeles';

DO $$
DECLARE
    -- Employee IDs
    dora_employee_id uuid;
    aracely_employee_id uuid;
    
    -- Booking processing variables
    booking_record RECORD;
    technician_name text;
    target_employee_id uuid;
    bookings_updated integer := 0;
    
    -- Verification variables
    total_bookings integer;
    assigned_bookings integer;
    dora_bookings integer;
    aracely_bookings integer;
    unassigned_bookings integer;
BEGIN
    RAISE NOTICE '=== FINAL COMPREHENSIVE BOOKING ASSIGNMENT FIX ===';
    
    -- Step 1: Get employee IDs with exact name matching
    SELECT id INTO dora_employee_id 
    FROM employees 
    WHERE name = 'Dora Alviter'
    LIMIT 1;
    
    SELECT id INTO aracely_employee_id 
    FROM employees 
    WHERE name = 'Aracely Orozco'
    LIMIT 1;
    
    RAISE NOTICE 'Employee IDs:';
    RAISE NOTICE '  Dora Alviter: %', COALESCE(dora_employee_id::text, 'NULL');
    RAISE NOTICE '  Aracely Orozco: %', COALESCE(aracely_employee_id::text, 'NULL');
    
    -- Step 2: Process ALL bookings with technician data
    RAISE NOTICE 'Processing all bookings with technician data...';
    
    FOR booking_record IN 
        SELECT 
            id, 
            technicians, 
            employee_id as current_employee_id,
            customer_first_name,
            customer_last_name,
            appointment_date,
            appointment_time
        FROM bookings 
        WHERE technicians IS NOT NULL 
          AND technicians->>'type' != 'auto'
        ORDER BY appointment_date DESC, appointment_time DESC
    LOOP
        technician_name := NULL;
        target_employee_id := NULL;
        
        -- Extract technician name from booking data
        IF booking_record.technicians->>'type' = 'single' THEN
            -- Single technician for all services
            IF booking_record.technicians->'manicureTech'->>'name' IS NOT NULL THEN
                technician_name := TRIM(booking_record.technicians->'manicureTech'->>'name');
            END IF;
            
        ELSIF booking_record.technicians->>'type' = 'split' THEN
            -- Split technicians - prioritize manicure tech, fallback to pedicure tech
            IF booking_record.technicians->'manicureTech'->>'name' IS NOT NULL THEN
                technician_name := TRIM(booking_record.technicians->'manicureTech'->>'name');
            ELSIF booking_record.technicians->'pedicureTech'->>'name' IS NOT NULL THEN
                technician_name := TRIM(booking_record.technicians->'pedicureTech'->>'name');
            END IF;
        END IF;
        
        -- Find matching employee using comprehensive matching
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
            
            -- Update booking if employee found and different from current assignment
            IF target_employee_id IS NOT NULL AND 
               (booking_record.current_employee_id IS NULL OR booking_record.current_employee_id != target_employee_id) THEN
                
                UPDATE bookings 
                SET employee_id = target_employee_id,
                    updated_at = now()
                WHERE id = booking_record.id;
                
                bookings_updated := bookings_updated + 1;
                RAISE NOTICE 'Updated booking % (%s %s, % %) → employee_id % (technician: "%")', 
                    booking_record.id,
                    booking_record.customer_first_name,
                    booking_record.customer_last_name,
                    booking_record.appointment_date,
                    booking_record.appointment_time,
                    target_employee_id, 
                    technician_name;
            END IF;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Updated % bookings with correct employee assignments', bookings_updated;
    
    -- Step 3: Final verification and reporting
    SELECT COUNT(*) INTO total_bookings FROM bookings;
    SELECT COUNT(*) INTO assigned_bookings FROM bookings WHERE employee_id IS NOT NULL;
    SELECT COUNT(*) INTO dora_bookings FROM bookings WHERE employee_id = dora_employee_id;
    SELECT COUNT(*) INTO aracely_bookings FROM bookings WHERE employee_id = aracely_employee_id;
    unassigned_bookings := total_bookings - assigned_bookings;
    
    RAISE NOTICE '=== FINAL BOOKING ASSIGNMENT SUMMARY ===';
    RAISE NOTICE 'Total bookings: %', total_bookings;
    RAISE NOTICE 'Assigned bookings: %', assigned_bookings;
    RAISE NOTICE 'Unassigned bookings: %', unassigned_bookings;
    RAISE NOTICE 'Dora Alviter bookings: %', dora_bookings;
    RAISE NOTICE 'Aracely Orozco bookings: %', aracely_bookings;
    
    -- Show recent bookings for each employee
    RAISE NOTICE '=== RECENT BOOKINGS BY EMPLOYEE ===';
    
    -- Dora's recent bookings
    FOR booking_record IN
        SELECT 
            id,
            customer_first_name || ' ' || customer_last_name as customer_name,
            appointment_date,
            appointment_time,
            technicians->'manicureTech'->>'name' as selected_tech
        FROM bookings 
        WHERE employee_id = dora_employee_id
        ORDER BY appointment_date DESC, appointment_time DESC
        LIMIT 5
    LOOP
        RAISE NOTICE 'Dora booking: % | Customer: % | Date: % % | Selected: %',
            booking_record.id,
            booking_record.customer_name,
            booking_record.appointment_date,
            booking_record.appointment_time,
            COALESCE(booking_record.selected_tech, 'N/A');
    END LOOP;
    
    -- Aracely's recent bookings
    FOR booking_record IN
        SELECT 
            id,
            customer_first_name || ' ' || customer_last_name as customer_name,
            appointment_date,
            appointment_time,
            COALESCE(
                technicians->'manicureTech'->>'name',
                technicians->'pedicureTech'->>'name'
            ) as selected_tech
        FROM bookings 
        WHERE employee_id = aracely_employee_id
        ORDER BY appointment_date DESC, appointment_time DESC
        LIMIT 5
    LOOP
        RAISE NOTICE 'Aracely booking: % | Customer: % | Date: % % | Selected: %',
            booking_record.id,
            booking_record.customer_name,
            booking_record.appointment_date,
            booking_record.appointment_time,
            COALESCE(booking_record.selected_tech, 'N/A');
    END LOOP;
    
    -- Final status check
    IF dora_bookings > 0 AND aracely_bookings > 0 THEN
        RAISE NOTICE '✅ SUCCESS: Both Dora and Aracely have bookings assigned!';
        RAISE NOTICE '✅ Employee panels should now display appointments correctly!';
        RAISE NOTICE '✅ Future bookings will be assigned correctly via the updated trigger!';
    ELSIF dora_bookings > 0 THEN
        RAISE NOTICE '⚠️  Dora has % bookings, but Aracely has none.', dora_bookings;
    ELSIF aracely_bookings > 0 THEN
        RAISE NOTICE '⚠️  Aracely has % bookings, but Dora has none.', aracely_bookings;
    ELSE
        RAISE NOTICE '❌ ERROR: Neither employee has bookings assigned!';
    END IF;
    
    -- Show any remaining unassigned bookings
    IF unassigned_bookings > 0 THEN
        RAISE NOTICE '=== REMAINING UNASSIGNED BOOKINGS ===';
        FOR booking_record IN
            SELECT 
                id,
                customer_first_name || ' ' || customer_last_name as customer_name,
                appointment_date,
                technicians->>'type' as tech_type,
                technicians->'manicureTech'->>'name' as manicure_tech,
                technicians->'pedicureTech'->>'name' as pedicure_tech
            FROM bookings 
            WHERE employee_id IS NULL 
              AND technicians IS NOT NULL
            ORDER BY appointment_date DESC
            LIMIT 10
        LOOP
            RAISE NOTICE 'Unassigned: % | Customer: % | Date: % | Type: % | Manicure: % | Pedicure: %',
                booking_record.id,
                booking_record.customer_name,
                booking_record.appointment_date,
                COALESCE(booking_record.tech_type, 'NULL'),
                COALESCE(booking_record.manicure_tech, 'NULL'),
                COALESCE(booking_record.pedicure_tech, 'NULL');
        END LOOP;
    END IF;
    
    RAISE NOTICE 'Final comprehensive booking assignment fix completed successfully.';
    
END $$;

-- Update the auto-assignment function with the most robust logic
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
        RAISE NOTICE 'Auto-assigned booking to employee_id % (technician: "%")', target_employee_id, technician_name;
      ELSE
        RAISE NOTICE 'No employee found for technician: "%" (available: Dora Alviter, Aracely Orozco)', technician_name;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS auto_assign_employee_trigger ON bookings;
CREATE TRIGGER auto_assign_employee_trigger
  BEFORE INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_employee();