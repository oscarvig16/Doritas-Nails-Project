/*
  # Final Safe Sync for Booking Employee Assignments

  1. Updates
    - For each booking with employee_id IS NULL
    - Match technician names to employees.name (exact, case-insensitive, trimmed)
    - Update only bookings.employee_id
    - Do NOT modify employees or auth tables

  2. Safety
    - Only updates existing bookings
    - No new records created
    - No employee or auth data modified
    - Comprehensive logging for verification
*/

-- Set timezone to America/Los_Angeles for all operations
SET timezone = 'America/Los_Angeles';

DO $$
DECLARE
    booking_record RECORD;
    technician_name text;
    target_employee_id uuid;
    bookings_updated integer := 0;
    total_null_bookings integer;
    total_bookings integer;
    assigned_bookings integer;
    unassigned_bookings integer;
BEGIN
    RAISE NOTICE '=== STARTING FINAL SAFE BOOKING SYNC ===';
    
    -- Get initial counts
    SELECT COUNT(*) INTO total_bookings FROM bookings;
    SELECT COUNT(*) INTO total_null_bookings FROM bookings WHERE employee_id IS NULL;
    
    RAISE NOTICE 'Initial state:';
    RAISE NOTICE '  Total bookings: %', total_bookings;
    RAISE NOTICE '  Bookings with NULL employee_id: %', total_null_bookings;
    
    -- Process each booking with NULL employee_id
    FOR booking_record IN 
        SELECT id, technicians
        FROM bookings 
        WHERE employee_id IS NULL
          AND technicians IS NOT NULL 
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
            LIMIT 1;
            
            -- Update booking if employee found
            IF target_employee_id IS NOT NULL THEN
                UPDATE bookings 
                SET employee_id = target_employee_id,
                    updated_at = now()
                WHERE id = booking_record.id;
                
                bookings_updated := bookings_updated + 1;
                RAISE NOTICE 'Updated booking % with employee_id % (technician: "%")', 
                    booking_record.id, target_employee_id, technician_name;
            ELSE
                RAISE NOTICE 'No employee found for booking % with technician: "%"', 
                    booking_record.id, technician_name;
            END IF;
        ELSE
            RAISE NOTICE 'No technician name found for booking %', booking_record.id;
        END IF;
    END LOOP;
    
    -- Get final counts
    SELECT COUNT(*) INTO assigned_bookings FROM bookings WHERE employee_id IS NOT NULL;
    unassigned_bookings := total_bookings - assigned_bookings;
    
    RAISE NOTICE '=== FINAL SAFE BOOKING SYNC COMPLETE ===';
    RAISE NOTICE 'Bookings updated with employee_id: %', bookings_updated;
    RAISE NOTICE 'Final state:';
    RAISE NOTICE '  Total bookings: %', total_bookings;
    RAISE NOTICE '  Assigned bookings: %', assigned_bookings;
    RAISE NOTICE '  Unassigned bookings: %', unassigned_bookings;
    
    -- Verification: Show employee assignment summary
    RAISE NOTICE '=== EMPLOYEE ASSIGNMENT SUMMARY ===';
    FOR booking_record IN
        SELECT 
            e.name as employee_name,
            e.email as employee_email,
            COUNT(b.id) as total_bookings_assigned
        FROM employees e
        LEFT JOIN bookings b ON b.employee_id = e.id
        WHERE e.email IN ('dora@doritasnails.com', 'aracely@doritasnails.com')
        GROUP BY e.id, e.name, e.email
        ORDER BY e.name
    LOOP
        RAISE NOTICE 'Employee: % (%) has % bookings assigned',
            booking_record.employee_name,
            booking_record.employee_email,
            booking_record.total_bookings_assigned;
    END LOOP;
    
    -- Show remaining unassigned bookings (if any)
    IF unassigned_bookings > 0 THEN
        RAISE NOTICE '=== REMAINING UNASSIGNED BOOKINGS ===';
        FOR booking_record IN
            SELECT 
                id,
                technicians->>'type' as tech_type,
                technicians->'manicureTech'->>'name' as manicure_tech,
                technicians->'pedicureTech'->>'name' as pedicure_tech,
                appointment_date,
                appointment_time
            FROM bookings 
            WHERE employee_id IS NULL 
              AND technicians IS NOT NULL
            ORDER BY appointment_date, appointment_time
            LIMIT 10
        LOOP
            RAISE NOTICE 'Unassigned: % | Date: % % | Type: % | Manicure: % | Pedicure: %',
                booking_record.id,
                booking_record.appointment_date,
                booking_record.appointment_time,
                COALESCE(booking_record.tech_type, 'NULL'),
                COALESCE(booking_record.manicure_tech, 'NULL'),
                COALESCE(booking_record.pedicure_tech, 'NULL');
        END LOOP;
    END IF;
    
    -- Show available employees for reference
    RAISE NOTICE '=== AVAILABLE EMPLOYEES FOR MATCHING ===';
    FOR booking_record IN
        SELECT name, email, auth_user_id IS NOT NULL as has_auth_link
        FROM employees 
        WHERE email IN ('dora@doritasnails.com', 'aracely@doritasnails.com')
        ORDER BY name
    LOOP
        RAISE NOTICE 'Employee: "%" (%s) | Auth Linked: %',
            booking_record.name,
            booking_record.email,
            booking_record.has_auth_link;
    END LOOP;
    
    RAISE NOTICE 'Final safe booking sync completed successfully.';
    
END $$;