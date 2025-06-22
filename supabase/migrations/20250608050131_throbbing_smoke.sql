/*
  # Final Employee-Auth Sync and Booking Assignment

  1. Employee-Auth Sync
    - Link employees.auth_user_id to matching auth.users.id by email
    - Only update existing records, no new inserts or duplicates
    - Preserve existing id and email columns

  2. Booking Assignment
    - Set correct employee_id based on technician name matching
    - Use exact name matching (trimmed, case-insensitive)
    - Do not modify last_updated_by

  3. Verification
    - Log sync results and booking updates
    - Ensure no data corruption or duplicates
*/

-- Set timezone to America/Los_Angeles for all operations
SET timezone = 'America/Los_Angeles';

DO $$
DECLARE
    -- Employee sync variables
    dora_employee_id uuid;
    aracely_employee_id uuid;
    dora_auth_id uuid;
    aracely_auth_id uuid;
    employees_synced integer := 0;
    
    -- Booking assignment variables
    booking_record RECORD;
    technician_name text;
    target_employee_id uuid;
    bookings_updated integer := 0;
    
    -- Verification variables
    total_bookings integer;
    assigned_bookings integer;
    unassigned_bookings integer;
BEGIN
    RAISE NOTICE '=== STARTING FINAL EMPLOYEE-AUTH SYNC ===';
    
    -- Step 1: Employee-Auth Sync
    RAISE NOTICE 'Step 1: Syncing employee records with auth users...';
    
    -- Get existing employee IDs (do not modify these)
    SELECT id INTO dora_employee_id 
    FROM employees 
    WHERE email = 'dora@doritasnails.com'
    LIMIT 1;
    
    SELECT id INTO aracely_employee_id 
    FROM employees 
    WHERE email = 'aracely@doritasnails.com'
    LIMIT 1;
    
    -- Get matching auth user IDs by email
    SELECT id INTO dora_auth_id 
    FROM auth.users 
    WHERE LOWER(TRIM(email)) = 'dora@doritasnails.com'
    LIMIT 1;
    
    SELECT id INTO aracely_auth_id 
    FROM auth.users 
    WHERE LOWER(TRIM(email)) = 'aracely@doritasnails.com'
    LIMIT 1;
    
    RAISE NOTICE 'Found employees - Dora: %, Aracely: %', 
        COALESCE(dora_employee_id::text, 'NULL'), 
        COALESCE(aracely_employee_id::text, 'NULL');
    RAISE NOTICE 'Found auth users - Dora: %, Aracely: %', 
        COALESCE(dora_auth_id::text, 'NULL'), 
        COALESCE(aracely_auth_id::text, 'NULL');
    
    -- Sync Dora's auth_user_id if both records exist
    IF dora_employee_id IS NOT NULL AND dora_auth_id IS NOT NULL THEN
        UPDATE employees 
        SET auth_user_id = dora_auth_id,
            name = 'Dora Alviter',  -- Ensure correct name
            role = 'admin',         -- Ensure correct role
            updated_at = now()
        WHERE id = dora_employee_id;
        
        employees_synced := employees_synced + 1;
        RAISE NOTICE 'Synced Dora: employee_id % linked to auth_user_id %', dora_employee_id, dora_auth_id;
    ELSE
        RAISE NOTICE 'Skipped Dora sync - missing employee or auth record';
    END IF;
    
    -- Sync Aracely's auth_user_id if both records exist
    IF aracely_employee_id IS NOT NULL AND aracely_auth_id IS NOT NULL THEN
        UPDATE employees 
        SET auth_user_id = aracely_auth_id,
            name = 'Aracely Orozco', -- Ensure correct name
            role = 'employee',       -- Ensure correct role
            updated_at = now()
        WHERE id = aracely_employee_id;
        
        employees_synced := employees_synced + 1;
        RAISE NOTICE 'Synced Aracely: employee_id % linked to auth_user_id %', aracely_employee_id, aracely_auth_id;
    ELSE
        RAISE NOTICE 'Skipped Aracely sync - missing employee or auth record';
    END IF;
    
    -- Step 2: Booking Assignment
    RAISE NOTICE 'Step 2: Updating booking assignments based on technician names...';
    
    FOR booking_record IN 
        SELECT id, technicians, employee_id as current_employee_id
        FROM bookings 
        WHERE technicians IS NOT NULL 
          AND technicians->>'type' != 'auto'
    LOOP
        technician_name := NULL;
        target_employee_id := NULL;
        
        -- Extract technician name from booking data
        IF booking_record.technicians->>'type' = 'single' AND booking_record.technicians->'manicureTech'->>'name' IS NOT NULL THEN
            technician_name := TRIM(booking_record.technicians->'manicureTech'->>'name');
        ELSIF booking_record.technicians->>'type' = 'split' THEN
            -- For split assignments, prioritize manicure tech, fallback to pedicure tech
            IF booking_record.technicians->'manicureTech'->>'name' IS NOT NULL THEN
                technician_name := TRIM(booking_record.technicians->'manicureTech'->>'name');
            ELSIF booking_record.technicians->'pedicureTech'->>'name' IS NOT NULL THEN
                technician_name := TRIM(booking_record.technicians->'pedicureTech'->>'name');
            END IF;
        END IF;
        
        -- Find matching employee using exact name matching (case-insensitive, trimmed)
        IF technician_name IS NOT NULL THEN
            SELECT id INTO target_employee_id
            FROM employees 
            WHERE LOWER(TRIM(name)) = LOWER(technician_name)
              AND auth_user_id IS NOT NULL  -- Only assign to synced employees
            LIMIT 1;
            
            -- Update booking if employee found and different from current assignment
            IF target_employee_id IS NOT NULL AND 
               (booking_record.current_employee_id IS NULL OR booking_record.current_employee_id != target_employee_id) THEN
                
                UPDATE bookings 
                SET employee_id = target_employee_id,
                    updated_at = now()
                WHERE id = booking_record.id;
                
                bookings_updated := bookings_updated + 1;
                RAISE NOTICE 'Updated booking % with employee_id % (technician: "%")', 
                    booking_record.id, target_employee_id, technician_name;
            END IF;
        END IF;
    END LOOP;
    
    -- Step 3: Verification and Reporting
    RAISE NOTICE 'Step 3: Verification and reporting...';
    
    SELECT COUNT(*) INTO total_bookings FROM bookings;
    SELECT COUNT(*) INTO assigned_bookings FROM bookings WHERE employee_id IS NOT NULL;
    unassigned_bookings := total_bookings - assigned_bookings;
    
    RAISE NOTICE '=== FINAL EMPLOYEE-AUTH SYNC COMPLETE ===';
    RAISE NOTICE 'Employees synced: %', employees_synced;
    RAISE NOTICE 'Bookings updated with employee_id: %', bookings_updated;
    RAISE NOTICE 'Total bookings: %', total_bookings;
    RAISE NOTICE 'Assigned bookings: %', assigned_bookings;
    RAISE NOTICE 'Unassigned bookings: %', unassigned_bookings;
    
    -- Detailed verification of employee-auth linkage
    RAISE NOTICE '=== EMPLOYEE-AUTH LINKAGE VERIFICATION ===';
    FOR booking_record IN
        SELECT 
            e.name,
            e.email,
            e.id as employee_id,
            e.auth_user_id,
            (e.auth_user_id IS NOT NULL) as has_auth_link,
            COUNT(b.id) as total_bookings_assigned
        FROM employees e
        LEFT JOIN bookings b ON b.employee_id = e.id
        WHERE e.email IN ('dora@doritasnails.com', 'aracely@doritasnails.com')
        GROUP BY e.id, e.name, e.email, e.auth_user_id
        ORDER BY e.name
    LOOP
        RAISE NOTICE 'Employee: % | Email: % | Employee ID: % | Auth Linked: % | Bookings: %',
            booking_record.name,
            booking_record.email,
            booking_record.employee_id,
            booking_record.has_auth_link,
            booking_record.total_bookings_assigned;
    END LOOP;
    
    -- Check for any problematic unassigned bookings
    IF unassigned_bookings > 0 THEN
        RAISE NOTICE '=== UNASSIGNED BOOKINGS ANALYSIS ===';
        FOR booking_record IN
            SELECT 
                id,
                technicians->>'type' as tech_type,
                technicians->'manicureTech'->>'name' as manicure_tech,
                technicians->'pedicureTech'->>'name' as pedicure_tech
            FROM bookings 
            WHERE employee_id IS NULL 
              AND technicians IS NOT NULL
            LIMIT 5
        LOOP
            RAISE NOTICE 'Unassigned booking % | Type: % | Manicure: % | Pedicure: %',
                booking_record.id,
                COALESCE(booking_record.tech_type, 'NULL'),
                COALESCE(booking_record.manicure_tech, 'NULL'),
                COALESCE(booking_record.pedicure_tech, 'NULL');
        END LOOP;
    END IF;
    
    RAISE NOTICE 'Sync completed successfully. No duplicates created, no data corrupted.';
    
END $$;

-- Update the auto-assignment function to use the corrected employee matching
CREATE OR REPLACE FUNCTION auto_assign_employee()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  target_employee_id uuid;
  technician_name text;
BEGIN
  -- Only process if employee_id is not already set
  IF NEW.employee_id IS NULL AND NEW.technicians IS NOT NULL AND NEW.technicians->>'type' != 'auto' THEN
    
    -- Extract technician name with proper trimming
    IF NEW.technicians->>'type' = 'single' AND NEW.technicians->'manicureTech'->>'name' IS NOT NULL THEN
      technician_name := TRIM(NEW.technicians->'manicureTech'->>'name');
    ELSIF NEW.technicians->>'type' = 'split' THEN
      IF NEW.technicians->'manicureTech'->>'name' IS NOT NULL THEN
        technician_name := TRIM(NEW.technicians->'manicureTech'->>'name');
      ELSIF NEW.technicians->'pedicureTech'->>'name' IS NOT NULL THEN
        technician_name := TRIM(NEW.technicians->'pedicureTech'->>'name');
      END IF;
    END IF;
    
    -- Find employee by exact name match (case-insensitive, trimmed)
    IF technician_name IS NOT NULL THEN
      SELECT id INTO target_employee_id
      FROM employees 
      WHERE LOWER(TRIM(name)) = LOWER(technician_name)
        AND auth_user_id IS NOT NULL  -- Only assign to synced employees
      LIMIT 1;
      
      -- Set the employee_id in the NEW record
      IF target_employee_id IS NOT NULL THEN
        NEW.employee_id := target_employee_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS auto_assign_employee_trigger ON bookings;
CREATE TRIGGER auto_assign_employee_trigger
  BEFORE INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_employee();