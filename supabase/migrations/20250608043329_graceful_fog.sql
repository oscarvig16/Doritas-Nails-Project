/*
  # Complete Employee-Auth Synchronization and Booking Assignment Fix

  1. Employee-Auth Sync
    - Safely synchronize employee IDs with auth user IDs
    - Handle existing records without creating duplicates
    - Ensure proper foreign key relationships

  2. Booking Assignment
    - Fix auto-assignment function for accurate technician matching
    - Update existing bookings with correct employee assignments
    - Use exact name matching with trimming

  3. Verification
    - Comprehensive verification of all linkages
    - Detailed logging for troubleshooting
*/

-- Set timezone to America/Los_Angeles for all operations
SET timezone = 'America/Los_Angeles';

-- Step 1: Safe employee-auth synchronization
DO $$
DECLARE
    dora_auth_id uuid;
    aracely_auth_id uuid;
    dora_employee_id uuid;
    aracely_employee_id uuid;
    booking_count integer;
    updated_bookings integer := 0;
    booking_record RECORD;
    technician_name text;
    target_employee_id uuid;
BEGIN
    RAISE NOTICE 'Starting safe employee-auth synchronization...';
    
    -- Get existing auth user IDs
    SELECT id INTO dora_auth_id 
    FROM auth.users 
    WHERE LOWER(TRIM(email)) = 'dora@doritasnails.com'
    LIMIT 1;
    
    SELECT id INTO aracely_auth_id 
    FROM auth.users 
    WHERE LOWER(TRIM(email)) = 'aracely@doritasnails.com'
    LIMIT 1;
    
    RAISE NOTICE 'Found auth users - Dora: %, Aracely: %', 
        COALESCE(dora_auth_id::text, 'NULL'), 
        COALESCE(aracely_auth_id::text, 'NULL');
    
    -- Get existing employee IDs
    SELECT id INTO dora_employee_id 
    FROM employees 
    WHERE email = 'dora@doritasnails.com'
    LIMIT 1;
    
    SELECT id INTO aracely_employee_id 
    FROM employees 
    WHERE email = 'aracely@doritasnails.com'
    LIMIT 1;
    
    RAISE NOTICE 'Found employee records - Dora: %, Aracely: %', 
        COALESCE(dora_employee_id::text, 'NULL'), 
        COALESCE(aracely_employee_id::text, 'NULL');
    
    -- Step 2: Handle Dora's synchronization
    IF dora_auth_id IS NOT NULL THEN
        IF dora_employee_id IS NOT NULL THEN
            -- Update existing employee record to link with auth
            UPDATE employees 
            SET auth_user_id = dora_auth_id,
                name = 'Dora Alviter',
                role = 'admin',
                updated_at = now()
            WHERE id = dora_employee_id;
            
            RAISE NOTICE 'Updated Dora employee record: % linked to auth: %', dora_employee_id, dora_auth_id;
        ELSE
            -- Create new employee record using auth_user_id as the primary key
            INSERT INTO employees (id, email, name, role, auth_user_id, created_at, updated_at)
            VALUES (dora_auth_id, 'dora@doritasnails.com', 'Dora Alviter', 'admin', dora_auth_id, now(), now())
            ON CONFLICT (email) DO UPDATE SET
                auth_user_id = dora_auth_id,
                name = 'Dora Alviter',
                role = 'admin',
                updated_at = now();
            
            dora_employee_id := dora_auth_id;
            RAISE NOTICE 'Created/updated Dora employee record: %', dora_employee_id;
        END IF;
    END IF;
    
    -- Step 3: Handle Aracely's synchronization
    IF aracely_auth_id IS NOT NULL THEN
        IF aracely_employee_id IS NOT NULL THEN
            -- Update existing employee record to link with auth
            UPDATE employees 
            SET auth_user_id = aracely_auth_id,
                name = 'Aracely Orozco',
                role = 'employee',
                updated_at = now()
            WHERE id = aracely_employee_id;
            
            RAISE NOTICE 'Updated Aracely employee record: % linked to auth: %', aracely_employee_id, aracely_auth_id;
        ELSE
            -- Create new employee record using auth_user_id as the primary key
            INSERT INTO employees (id, email, name, role, auth_user_id, created_at, updated_at)
            VALUES (aracely_auth_id, 'aracely@doritasnails.com', 'Aracely Orozco', 'employee', aracely_auth_id, now(), now())
            ON CONFLICT (email) DO UPDATE SET
                auth_user_id = aracely_auth_id,
                name = 'Aracely Orozco',
                role = 'employee',
                updated_at = now();
            
            aracely_employee_id := aracely_auth_id;
            RAISE NOTICE 'Created/updated Aracely employee record: %', aracely_employee_id;
        END IF;
    END IF;
    
    -- Step 4: Update foreign key references if employee IDs changed
    IF dora_employee_id IS NOT NULL AND dora_auth_id IS NOT NULL AND dora_employee_id != dora_auth_id THEN
        -- Update booking references
        UPDATE bookings 
        SET employee_id = dora_auth_id,
            last_updated_by = CASE WHEN last_updated_by = dora_employee_id THEN dora_auth_id ELSE last_updated_by END,
            updated_at = now()
        WHERE employee_id = dora_employee_id OR last_updated_by = dora_employee_id;
        
        -- Update booking_updates references
        UPDATE booking_updates 
        SET employee_id = dora_auth_id 
        WHERE employee_id = dora_employee_id;
        
        RAISE NOTICE 'Updated foreign key references for Dora: % -> %', dora_employee_id, dora_auth_id;
    END IF;
    
    IF aracely_employee_id IS NOT NULL AND aracely_auth_id IS NOT NULL AND aracely_employee_id != aracely_auth_id THEN
        -- Update booking references
        UPDATE bookings 
        SET employee_id = aracely_auth_id,
            last_updated_by = CASE WHEN last_updated_by = aracely_employee_id THEN aracely_auth_id ELSE last_updated_by END,
            updated_at = now()
        WHERE employee_id = aracely_employee_id OR last_updated_by = aracely_employee_id;
        
        -- Update booking_updates references
        UPDATE booking_updates 
        SET employee_id = aracely_auth_id 
        WHERE employee_id = aracely_employee_id;
        
        RAISE NOTICE 'Updated foreign key references for Aracely: % -> %', aracely_employee_id, aracely_auth_id;
    END IF;
    
    -- Step 5: Update booking assignments with exact name matching
    RAISE NOTICE 'Updating booking assignments with exact name matching...';
    
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
            IF booking_record.technicians->'manicureTech'->>'name' IS NOT NULL THEN
                technician_name := TRIM(booking_record.technicians->'manicureTech'->>'name');
            ELSIF booking_record.technicians->'pedicureTech'->>'name' IS NOT NULL THEN
                technician_name := TRIM(booking_record.technicians->'pedicureTech'->>'name');
            END IF;
        END IF;
        
        -- Find matching employee with exact name matching
        IF technician_name IS NOT NULL THEN
            IF technician_name = 'Dora Alviter' THEN
                target_employee_id := COALESCE(dora_auth_id, dora_employee_id);
            ELSIF technician_name = 'Aracely Orozco' THEN
                target_employee_id := COALESCE(aracely_auth_id, aracely_employee_id);
            END IF;
            
            -- Update booking if employee found and different from current
            IF target_employee_id IS NOT NULL AND target_employee_id != COALESCE(booking_record.current_employee_id, '00000000-0000-0000-0000-000000000000'::uuid) THEN
                UPDATE bookings 
                SET employee_id = target_employee_id,
                    updated_at = now()
                WHERE id = booking_record.id;
                
                updated_bookings := updated_bookings + 1;
                RAISE NOTICE 'Updated booking % with employee_id % (technician: %)', 
                    booking_record.id, target_employee_id, technician_name;
            END IF;
        END IF;
    END LOOP;
    
    -- Step 6: Clean up any duplicate employee records
    DELETE FROM employees 
    WHERE email IN ('dora@doritasnails.com', 'aracely@doritasnails.com')
      AND auth_user_id IS NULL
      AND id NOT IN (
          SELECT DISTINCT employee_id 
          FROM bookings 
          WHERE employee_id IS NOT NULL
          UNION
          SELECT DISTINCT employee_id 
          FROM booking_updates 
          WHERE employee_id IS NOT NULL
      );
    
    -- Step 7: Verification and reporting
    SELECT COUNT(*) INTO booking_count FROM bookings;
    
    RAISE NOTICE '=== SYNCHRONIZATION COMPLETE ===';
    RAISE NOTICE 'Updated % bookings with correct employee assignments', updated_bookings;
    RAISE NOTICE 'Total bookings: %', booking_count;
    RAISE NOTICE 'Assigned bookings: %', (SELECT COUNT(*) FROM bookings WHERE employee_id IS NOT NULL);
    RAISE NOTICE 'Unassigned bookings: %', (SELECT COUNT(*) FROM bookings WHERE employee_id IS NULL);
    
END $$;

-- Update the auto-assignment function with improved name matching
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
    
    -- Find employee by exact name match with case sensitivity
    IF technician_name IS NOT NULL THEN
      SELECT id INTO target_employee_id
      FROM employees 
      WHERE TRIM(name) = technician_name
        AND auth_user_id IS NOT NULL
      LIMIT 1;
      
      -- Set the employee_id in the NEW record
      IF target_employee_id IS NOT NULL THEN
        NEW.employee_id := target_employee_id;
        RAISE NOTICE 'Auto-assigned booking to employee: "%" (ID: %)', technician_name, target_employee_id;
      ELSE
        RAISE NOTICE 'No employee found for technician: "%" (available employees: %)', 
            technician_name, 
            (SELECT string_agg(name, ', ') FROM employees WHERE auth_user_id IS NOT NULL);
      END IF;
    END IF;
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

-- Update the get_current_employee_id function
CREATE OR REPLACE FUNCTION get_current_employee_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id FROM employees WHERE auth_user_id = auth.uid();
$$;

-- Ensure RLS policies are correct
DROP POLICY IF EXISTS "Employees can view own profile" ON employees;
DROP POLICY IF EXISTS "Employees can update own profile" ON employees;
DROP POLICY IF EXISTS "Employees can create own profile" ON employees;

-- Allow employees to view their own profile
CREATE POLICY "Employees can view own profile"
  ON employees
  FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);

-- Allow employees to update their own profile
CREATE POLICY "Employees can update own profile"
  ON employees
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id OR auth_user_id IS NULL)
  WITH CHECK (auth.uid() = auth_user_id);

-- Allow creation only for known employee emails
CREATE POLICY "Employees can create own profile"
  ON employees
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = auth_user_id AND
    email IN ('dora@doritasnails.com', 'aracely@doritasnails.com')
  );

-- Final verification
DO $$
DECLARE
    verification_record RECORD;
BEGIN
    RAISE NOTICE '=== FINAL VERIFICATION ===';
    
    -- Check employee-auth linkage
    FOR verification_record IN
        SELECT 
            e.name,
            e.email,
            e.id as employee_id,
            e.auth_user_id,
            u.id as auth_id,
            (e.id = e.auth_user_id) as ids_match,
            (e.auth_user_id IS NOT NULL) as has_auth_link,
            COUNT(b.id) as total_bookings
        FROM employees e
        LEFT JOIN auth.users u ON u.id = e.auth_user_id
        LEFT JOIN bookings b ON b.employee_id = e.id
        WHERE e.email IN ('dora@doritasnails.com', 'aracely@doritasnails.com')
        GROUP BY e.id, e.name, e.email, e.auth_user_id, u.id
        ORDER BY e.name
    LOOP
        RAISE NOTICE 'Employee: % | Employee ID: % | Auth ID: % | IDs Match: % | Has Auth Link: % | Bookings: %',
            verification_record.name,
            verification_record.employee_id,
            COALESCE(verification_record.auth_id::text, 'NULL'),
            verification_record.ids_match,
            verification_record.has_auth_link,
            verification_record.total_bookings;
    END LOOP;
    
    -- Check for any unassigned bookings with technician data
    FOR verification_record IN
        SELECT 
            id,
            technicians->'manicureTech'->>'name' as manicure_tech,
            technicians->'pedicureTech'->>'name' as pedicure_tech,
            employee_id
        FROM bookings 
        WHERE employee_id IS NULL 
          AND technicians IS NOT NULL 
          AND technicians->>'type' != 'auto'
        LIMIT 5
    LOOP
        RAISE NOTICE 'Unassigned booking: % | Manicure Tech: % | Pedicure Tech: %',
            verification_record.id,
            COALESCE(verification_record.manicure_tech, 'NULL'),
            COALESCE(verification_record.pedicure_tech, 'NULL');
    END LOOP;
    
    RAISE NOTICE 'Synchronization verification complete.';
END $$;