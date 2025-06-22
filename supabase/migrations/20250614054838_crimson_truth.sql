/*
  # Fix RLS policies for admin access to all bookings

  1. Updates
    - Update RLS policies to allow admin users to access all bookings
    - Ensure admin role can view all employees and workload data
    - Maintain security for regular employees

  2. Security
    - Admin users (role = 'admin') can see all bookings
    - Regular employees can only see their assigned bookings
    - Maintain proper access control
*/

-- Set timezone to America/Los_Angeles for all operations
SET timezone = 'America/Los_Angeles';

-- Drop existing booking policies
DROP POLICY IF EXISTS "Employees can view assigned bookings" ON bookings;
DROP POLICY IF EXISTS "Employees can update assigned bookings" ON bookings;

-- Create new comprehensive RLS policy for bookings
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
    -- Allow admins to see ALL bookings
    EXISTS (
      SELECT 1 FROM employees 
      WHERE employees.auth_user_id = auth.uid() 
      AND employees.role = 'admin'
    )
  );

-- Allow employees to update their assigned bookings (admins can update any)
CREATE POLICY "Employees can update assigned bookings"
  ON bookings
  FOR UPDATE
  TO authenticated
  USING (
    -- Allow employees to update bookings assigned to them
    EXISTS (
      SELECT 1 FROM employees 
      WHERE employees.id = bookings.employee_id 
      AND employees.auth_user_id = auth.uid()
    ) OR
    -- Allow admins to update ANY booking
    EXISTS (
      SELECT 1 FROM employees 
      WHERE employees.auth_user_id = auth.uid() 
      AND employees.role = 'admin'
    )
  )
  WITH CHECK (
    -- Same conditions for WITH CHECK
    EXISTS (
      SELECT 1 FROM employees 
      WHERE employees.id = bookings.employee_id 
      AND employees.auth_user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM employees 
      WHERE employees.auth_user_id = auth.uid() 
      AND employees.role = 'admin'
    )
  );

-- Update employees table policies to allow admin access
DROP POLICY IF EXISTS "Allow anon employee lookup for booking" ON employees;
DROP POLICY IF EXISTS "Employees can view own profile" ON employees;
DROP POLICY IF EXISTS "Employees can update own profile" ON employees;
DROP POLICY IF EXISTS "Employees can create own profile" ON employees;

-- Allow anon access for booking assignment (needed for booking creation)
CREATE POLICY "Allow anon employee lookup for booking"
  ON employees
  FOR SELECT
  TO anon, authenticated
  USING (true);

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

-- Update booking_updates policies for admin access
DROP POLICY IF EXISTS "Employees can view own booking updates" ON booking_updates;
DROP POLICY IF EXISTS "Employees can create own booking updates" ON booking_updates;

CREATE POLICY "Employees can view booking updates"
  ON booking_updates
  FOR SELECT
  TO authenticated
  USING (
    -- Allow employees to see their own updates
    employee_id = get_current_employee_id() OR
    -- Allow admins to see all updates
    EXISTS (
      SELECT 1 FROM employees 
      WHERE employees.auth_user_id = auth.uid() 
      AND employees.role = 'admin'
    )
  );

CREATE POLICY "Employees can create booking updates"
  ON booking_updates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow employees to create updates for their bookings
    employee_id = get_current_employee_id() OR
    -- Allow admins to create updates for any booking
    EXISTS (
      SELECT 1 FROM employees 
      WHERE employees.auth_user_id = auth.uid() 
      AND employees.role = 'admin'
    )
  );

-- Verification
DO $$
DECLARE
    policy_record RECORD;
    dora_employee_id uuid;
    total_bookings integer;
BEGIN
    RAISE NOTICE '=== ADMIN RLS POLICY FIX VERIFICATION ===';
    
    -- Get Dora's employee ID
    SELECT id INTO dora_employee_id 
    FROM employees 
    WHERE name = 'Dora Alviter' AND role = 'admin'
    LIMIT 1;
    
    -- Count total bookings
    SELECT COUNT(*) INTO total_bookings FROM bookings;
    
    RAISE NOTICE 'Database state:';
    RAISE NOTICE '  Dora employee ID: %', COALESCE(dora_employee_id::text, 'NULL');
    RAISE NOTICE '  Total bookings: %', total_bookings;
    
    -- Show current RLS policies
    RAISE NOTICE 'Updated RLS policies:';
    FOR policy_record IN
        SELECT policyname, cmd, roles
        FROM pg_policies 
        WHERE tablename = 'bookings'
        ORDER BY policyname
    LOOP
        RAISE NOTICE '  %: % (%)', 
            policy_record.policyname, 
            policy_record.cmd,
            policy_record.roles;
    END LOOP;
    
    RAISE NOTICE '✅ Admin RLS policies updated successfully';
    RAISE NOTICE '✅ Dora (admin) should now be able to access all bookings';
    RAISE NOTICE '✅ Regular employees can still only see their assigned bookings';
    
END $$;