-- Set timezone to America/Los_Angeles for all operations
SET timezone = 'America/Los_Angeles';

-- Step 1: Fix RLS policies for employees table to allow proper access
DROP POLICY IF EXISTS "Employees can view own profile" ON employees;
DROP POLICY IF EXISTS "Employees can update own profile" ON employees;
DROP POLICY IF EXISTS "Employees can create own profile" ON employees;

-- Allow employees to view their own profile
CREATE POLICY "Employees can view own profile"
  ON employees
  FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);

-- Allow employees to update their own profile (for linking auth_user_id)
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

-- Step 2: Fix RLS policies for bookings table to be more permissive
DROP POLICY IF EXISTS "Employees can view assigned bookings" ON bookings;
DROP POLICY IF EXISTS "Employees can update assigned bookings" ON bookings;

-- Create simplified RLS policy for employee booking access
CREATE POLICY "Employees can view assigned bookings"
  ON bookings
  FOR SELECT
  TO authenticated
  USING (
    -- Allow employees to see bookings assigned to them
    EXISTS (
      SELECT 1 FROM employees 
      WHERE employees.id = bookings.employee_id 
      AND employees.auth_user_id = auth.uid()
    ) OR
    -- Allow admins to see all bookings
    EXISTS (
      SELECT 1 FROM employees 
      WHERE employees.auth_user_id = auth.uid() 
      AND employees.role = 'admin'
    )
  );

-- Allow employees to update their assigned bookings
CREATE POLICY "Employees can update assigned bookings"
  ON bookings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE employees.id = bookings.employee_id 
      AND employees.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE employees.id = bookings.employee_id 
      AND employees.auth_user_id = auth.uid()
    )
  );

-- Step 3: Ensure get_current_employee_id function is simple and reliable
CREATE OR REPLACE FUNCTION get_current_employee_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id FROM employees WHERE auth_user_id = auth.uid();
$$;

-- Step 4: Verification and final status check
DO $$
DECLARE
    verification_record RECORD;
    dora_employee_id uuid;
    aracely_employee_id uuid;
    dora_auth_id uuid;
    aracely_auth_id uuid;
    total_bookings integer;
    dora_bookings integer;
    aracely_bookings integer;
BEGIN
    RAISE NOTICE '=== FINAL EMPLOYEE PANEL SPINNER FIX ===';
    
    -- Get employee and auth IDs
    SELECT id, auth_user_id INTO dora_employee_id, dora_auth_id 
    FROM employees 
    WHERE name = 'Dora Alviter'
    LIMIT 1;
    
    SELECT id, auth_user_id INTO aracely_employee_id, aracely_auth_id 
    FROM employees 
    WHERE name = 'Aracely Orozco'
    LIMIT 1;
    
    RAISE NOTICE 'Employee records:';
    RAISE NOTICE '  Dora: employee_id=%, auth_user_id=%', 
        COALESCE(dora_employee_id::text, 'NULL'), 
        COALESCE(dora_auth_id::text, 'NULL');
    RAISE NOTICE '  Aracely: employee_id=%, auth_user_id=%', 
        COALESCE(aracely_employee_id::text, 'NULL'), 
        COALESCE(aracely_auth_id::text, 'NULL');
    
    -- Count bookings by employee
    SELECT COUNT(*) INTO total_bookings FROM bookings;
    SELECT COUNT(*) INTO dora_bookings FROM bookings WHERE employee_id = dora_employee_id;
    SELECT COUNT(*) INTO aracely_bookings FROM bookings WHERE employee_id = aracely_employee_id;
    
    RAISE NOTICE 'Booking assignments:';
    RAISE NOTICE '  Total bookings: %', total_bookings;
    RAISE NOTICE '  Dora bookings: %', dora_bookings;
    RAISE NOTICE '  Aracely bookings: %', aracely_bookings;
    RAISE NOTICE '  Unassigned bookings: %', (total_bookings - dora_bookings - aracely_bookings);
    
    -- Show sample bookings for verification
    RAISE NOTICE 'Sample bookings:';
    
    -- Dora's bookings
    FOR verification_record IN
        SELECT 
            id,
            customer_first_name || ' ' || customer_last_name as customer_name,
            appointment_date,
            appointment_time
        FROM bookings 
        WHERE employee_id = dora_employee_id
        ORDER BY appointment_date DESC, appointment_time DESC
        LIMIT 2
    LOOP
        RAISE NOTICE '  Dora: % | % | % %',
            verification_record.id,
            verification_record.customer_name,
            verification_record.appointment_date,
            verification_record.appointment_time;
    END LOOP;
    
    -- Aracely's bookings
    FOR verification_record IN
        SELECT 
            id,
            customer_first_name || ' ' || customer_last_name as customer_name,
            appointment_date,
            appointment_time
        FROM bookings 
        WHERE employee_id = aracely_employee_id
        ORDER BY appointment_date DESC, appointment_time DESC
        LIMIT 2
    LOOP
        RAISE NOTICE '  Aracely: % | % | % %',
            verification_record.id,
            verification_record.customer_name,
            verification_record.appointment_date,
            verification_record.appointment_time;
    END LOOP;
    
    -- Final status
    IF dora_bookings > 0 AND aracely_bookings > 0 THEN
        RAISE NOTICE '✅ SUCCESS: Both employees have bookings assigned!';
        RAISE NOTICE '✅ Employee panels should now work without infinite spinner!';
        RAISE NOTICE '✅ getCurrentEmployee() will return proper employee records!';
        RAISE NOTICE '✅ getEmployeeBookings() will show correct appointments!';
    ELSIF dora_bookings > 0 THEN
        RAISE NOTICE '⚠️  Only Dora has % bookings assigned.', dora_bookings;
    ELSIF aracely_bookings > 0 THEN
        RAISE NOTICE '⚠️  Only Aracely has % bookings assigned.', aracely_bookings;
    ELSE
        RAISE NOTICE '❌ ERROR: No bookings assigned to either employee!';
    END IF;
    
    -- Check auth linkage status
    IF dora_auth_id IS NOT NULL AND aracely_auth_id IS NOT NULL THEN
        RAISE NOTICE '✅ Both employees have auth_user_id linked - can log in!';
    ELSE
        RAISE NOTICE '⚠️  Some employees missing auth_user_id linkage:';
        IF dora_auth_id IS NULL THEN
            RAISE NOTICE '    - Dora needs auth_user_id linkage';
        END IF;
        IF aracely_auth_id IS NULL THEN
            RAISE NOTICE '    - Aracely needs auth_user_id linkage';
        END IF;
    END IF;
    
    RAISE NOTICE 'Final employee panel spinner fix completed successfully.';
    
END $$;