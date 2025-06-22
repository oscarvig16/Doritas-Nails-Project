/*
  # Fix Booking Flow Employee Assignment Logic

  1. Problem Analysis
    - Booking with Dora Alviter works → employee_id correctly assigned
    - Booking with Aracely Orozco fails → employee_id remains NULL
    - Employee panel driven by employee_id → NULL bookings don't show

  2. Solution
    - Fix auto-assignment function with better name matching
    - Update existing NULL bookings with correct employee_id
    - Add verification to prevent future issues
    - Ensure dynamic matching based on employees table

  3. Verification
    - Test both Dora and Aracely assignments
    - Confirm employee panel displays correctly
*/

-- Set timezone to America/Los_Angeles for all operations
SET timezone = 'America/Los_Angeles';

DO $$
DECLARE
    -- Variables for analysis
    dora_employee_id uuid;
    aracely_employee_id uuid;
    booking_record RECORD;
    technician_name text;
    target_employee_id uuid;
    bookings_updated integer := 0;
    
    -- Verification variables
    total_bookings integer;
    assigned_bookings integer;
    dora_bookings integer;
    aracely_bookings integer;
BEGIN
    RAISE NOTICE '=== FIXING BOOKING FLOW EMPLOYEE ASSIGNMENT ===';
    
    -- Step 1: Get current employee IDs for reference
    SELECT id INTO dora_employee_id 
    FROM employees 
    WHERE LOWER(TRIM(name)) = 'dora alviter'
    LIMIT 1;
    
    SELECT id INTO aracely_employee_id 
    FROM employees 
    WHERE LOWER(TRIM(name)) = 'aracely orozco'
    LIMIT 1;
    
    RAISE NOTICE 'Employee IDs - Dora: %, Aracely: %', 
        COALESCE(dora_employee_id::text, 'NULL'), 
        COALESCE(aracely_employee_id::text, 'NULL');
    
    -- Step 2: Analyze current booking assignments
    SELECT COUNT(*) INTO total_bookings FROM bookings;
    SELECT COUNT(*) INTO assigned_bookings FROM bookings WHERE employee_id IS NOT NULL;
    SELECT COUNT(*) INTO dora_bookings FROM bookings WHERE employee_id = dora_employee_id;
    SELECT COUNT(*) INTO aracely_bookings FROM bookings WHERE employee_id = aracely_employee_id;
    
    RAISE NOTICE 'Current state:';
    RAISE NOTICE '  Total bookings: %', total_bookings;
    RAISE NOTICE '  Assigned bookings: %', assigned_bookings;
    RAISE NOTICE '  Dora bookings: %', dora_bookings;
    RAISE NOTICE '  Aracely bookings: %', aracely_bookings;
    RAISE NOTICE '  Unassigned bookings: %', (total_bookings - assigned_bookings);
    
    -- Step 3: Fix existing bookings with NULL employee_id
    RAISE NOTICE 'Step 3: Fixing existing bookings with NULL employee_id...';
    
    FOR booking_record IN 
        SELECT id, technicians, customer_first_name, customer_last_name, appointment_date
        FROM bookings 
        WHERE employee_id IS NULL
          AND technicians IS NOT NULL 
          AND technicians->>'type' != 'auto'
        ORDER BY appointment_date DESC
    LOOP
        technician_name := NULL;
        target_employee_id := NULL;
        
        -- Extract technician name from booking data with comprehensive logic
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
        
        -- Find matching employee using multiple matching strategies
        IF technician_name IS NOT NULL THEN
            -- Strategy 1: Exact case-insensitive match
            SELECT id INTO target_employee_id
            FROM employees 
            WHERE LOWER(TRIM(name)) = LOWER(technician_name)
            LIMIT 1;
            
            -- Strategy 2: If no match, try partial matching for common variations
            IF target_employee_id IS NULL THEN
                -- Check for "Dora" variations
                IF LOWER(technician_name) LIKE '%dora%' OR LOWER(technician_name) LIKE '%alviter%' THEN
                    target_employee_id := dora_employee_id;
                -- Check for "Aracely" variations  
                ELSIF LOWER(technician_name) LIKE '%aracely%' OR LOWER(technician_name) LIKE '%orozco%' THEN
                    target_employee_id := aracely_employee_id;
                END IF;
            END IF;
            
            -- Update booking if employee found
            IF target_employee_id IS NOT NULL THEN
                UPDATE bookings 
                SET employee_id = target_employee_id,
                    updated_at = now()
                WHERE id = booking_record.id;
                
                bookings_updated := bookings_updated + 1;
                RAISE NOTICE 'Fixed booking % (%s %s, %s) → employee_id % (technician: "%")', 
                    booking_record.id,
                    booking_record.customer_first_name,
                    booking_record.customer_last_name,
                    booking_record.appointment_date,
                    target_employee_id, 
                    technician_name;
            ELSE
                RAISE NOTICE 'No employee match for booking % with technician: "%"', 
                    booking_record.id, technician_name;
            END IF;
        ELSE
            RAISE NOTICE 'No technician name extracted from booking %', booking_record.id;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Fixed % existing bookings with correct employee_id', bookings_updated;
    
END $$;

-- Step 4: Update the auto-assignment function with improved logic
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
    WHERE LOWER(TRIM(name)) = 'dora alviter'
    LIMIT 1;
    
    SELECT id INTO aracely_employee_id 
    FROM employees 
    WHERE LOWER(TRIM(name)) = 'aracely orozco'
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
      -- Strategy 1: Exact case-insensitive match
      SELECT id INTO target_employee_id
      FROM employees 
      WHERE LOWER(TRIM(name)) = LOWER(technician_name)
        AND auth_user_id IS NOT NULL  -- Only assign to synced employees
      LIMIT 1;
      
      -- Strategy 2: If no exact match, use direct ID matching for known employees
      IF target_employee_id IS NULL THEN
        -- Check for "Dora" variations
        IF LOWER(technician_name) LIKE '%dora%' OR LOWER(technician_name) LIKE '%alviter%' THEN
          target_employee_id := dora_employee_id;
        -- Check for "Aracely" variations  
        ELSIF LOWER(technician_name) LIKE '%aracely%' OR LOWER(technician_name) LIKE '%orozco%' THEN
          target_employee_id := aracely_employee_id;
        END IF;
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

-- Step 5: Final verification and reporting
DO $$
DECLARE
    verification_record RECORD;
    total_bookings integer;
    assigned_bookings integer;
    unassigned_bookings integer;
    dora_bookings integer;
    aracely_bookings integer;
BEGIN
    RAISE NOTICE '=== FINAL VERIFICATION AND REPORTING ===';
    
    -- Get final counts
    SELECT COUNT(*) INTO total_bookings FROM bookings;
    SELECT COUNT(*) INTO assigned_bookings FROM bookings WHERE employee_id IS NOT NULL;
    unassigned_bookings := total_bookings - assigned_bookings;
    
    -- Get employee-specific counts
    SELECT COUNT(*) INTO dora_bookings 
    FROM bookings b
    JOIN employees e ON b.employee_id = e.id
    WHERE LOWER(TRIM(e.name)) = 'dora alviter';
    
    SELECT COUNT(*) INTO aracely_bookings 
    FROM bookings b
    JOIN employees e ON b.employee_id = e.id
    WHERE LOWER(TRIM(e.name)) = 'aracely orozco';
    
    RAISE NOTICE 'Final booking assignment summary:';
    RAISE NOTICE '  Total bookings: %', total_bookings;
    RAISE NOTICE '  Assigned bookings: %', assigned_bookings;
    RAISE NOTICE '  Unassigned bookings: %', unassigned_bookings;
    RAISE NOTICE '  Dora Alviter bookings: %', dora_bookings;
    RAISE NOTICE '  Aracely Orozco bookings: %', aracely_bookings;
    
    -- Detailed employee verification
    RAISE NOTICE '=== EMPLOYEE PANEL READINESS ===';
    FOR verification_record IN
        SELECT 
            e.name as employee_name,
            e.email as employee_email,
            e.id as employee_id,
            e.auth_user_id,
            (e.auth_user_id IS NOT NULL) as can_login,
            COUNT(b.id) as total_bookings_assigned
        FROM employees e
        LEFT JOIN bookings b ON b.employee_id = e.id
        WHERE e.email IN ('dora@doritasnails.com', 'aracely@doritasnails.com')
        GROUP BY e.id, e.name, e.email, e.auth_user_id
        ORDER BY e.name
    LOOP
        RAISE NOTICE 'Employee: % | Email: % | Can Login: % | Bookings: %',
            verification_record.employee_name,
            verification_record.employee_email,
            verification_record.can_login,
            verification_record.total_bookings_assigned;
    END LOOP;
    
    -- Show any remaining problematic bookings
    IF unassigned_bookings > 0 THEN
        RAISE NOTICE '=== REMAINING UNASSIGNED BOOKINGS ===';
        FOR verification_record IN
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
            LIMIT 5
        LOOP
            RAISE NOTICE 'Unassigned: % | Customer: % | Date: % | Type: % | Manicure: % | Pedicure: %',
                verification_record.id,
                verification_record.customer_name,
                verification_record.appointment_date,
                COALESCE(verification_record.tech_type, 'NULL'),
                COALESCE(verification_record.manicure_tech, 'NULL'),
                COALESCE(verification_record.pedicure_tech, 'NULL');
        END LOOP;
    END IF;
    
    -- Success confirmation
    IF dora_bookings > 0 AND aracely_bookings > 0 THEN
        RAISE NOTICE '✅ SUCCESS: Both Dora and Aracely have bookings assigned!';
    ELSIF dora_bookings > 0 THEN
        RAISE NOTICE '⚠️  WARNING: Only Dora has bookings assigned. Aracely has none.';
    ELSIF aracely_bookings > 0 THEN
        RAISE NOTICE '⚠️  WARNING: Only Aracely has bookings assigned. Dora has none.';
    ELSE
        RAISE NOTICE '❌ ERROR: Neither Dora nor Aracely have bookings assigned!';
    END IF;
    
    RAISE NOTICE 'Booking flow employee assignment fix completed.';
    
END $$;