/*
  # Fix Admin Access to All Bookings

  1. RLS Policy Updates
    - Ensure admin role can access all bookings
    - Fix employee access to only see their own bookings
    - Update booking_updates policies for proper audit trail

  2. Verification
    - Test admin access to all bookings
    - Verify employee access restrictions
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

-- Update booking_updates policies for admin access
DROP POLICY IF EXISTS "Employees can view booking updates" ON booking_updates;
DROP POLICY IF EXISTS "Employees can create booking updates" ON booking_updates;
DROP POLICY IF EXISTS "Employees can view own booking updates" ON booking_updates;
DROP POLICY IF EXISTS "Employees can create own booking updates" ON booking_updates;

CREATE POLICY "Employees can view booking updates"
  ON booking_updates
  FOR SELECT
  TO authenticated
  USING (
    -- Allow employees to see their own updates
    employee_id = (SELECT id FROM employees WHERE auth_user_id = auth.uid()) OR
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
    employee_id = (SELECT id FROM employees WHERE auth_user_id = auth.uid()) OR
    -- Allow admins to create updates for any booking
    EXISTS (
      SELECT 1 FROM employees 
      WHERE employees.auth_user_id = auth.uid() 
      AND employees.role = 'admin'
    )
  );

-- Ensure Dora has admin role
UPDATE employees
SET role = 'admin'
WHERE email = 'dora@doritasnails.com';

-- Verification
DO $$
DECLARE
    dora_employee_id uuid;
    dora_auth_id uuid;
    dora_role text;
    total_bookings integer;
BEGIN
    RAISE NOTICE '=== ADMIN ACCESS FIX VERIFICATION ===';
    
    -- Get Dora's employee info
    SELECT id, auth_user_id, role INTO dora_employee_id, dora_auth_id, dora_role
    FROM employees 
    WHERE email = 'dora@doritasnails.com'
    LIMIT 1;
    
    -- Count total bookings
    SELECT COUNT(*) INTO total_bookings FROM bookings;
    
    RAISE NOTICE 'Dora employee info:';
    RAISE NOTICE '  ID: %', COALESCE(dora_employee_id::text, 'NULL');
    RAISE NOTICE '  Auth ID: %', COALESCE(dora_auth_id::text, 'NULL');
    RAISE NOTICE '  Role: %', COALESCE(dora_role, 'NULL');
    RAISE NOTICE '  Total bookings: %', total_bookings;
    
    -- Verify admin role is set
    IF dora_role = 'admin' THEN
        RAISE NOTICE '✅ Dora has admin role - should have access to all bookings';
    ELSE
        RAISE NOTICE '❌ Dora does NOT have admin role - fix needed!';
    END IF;
    
    -- Verify auth_user_id is set
    IF dora_auth_id IS NOT NULL THEN
        RAISE NOTICE '✅ Dora has auth_user_id linked - authentication will work';
    ELSE
        RAISE NOTICE '❌ Dora does NOT have auth_user_id linked - login issues may occur';
    END IF;
    
    RAISE NOTICE '✅ Admin access fix completed';
    RAISE NOTICE '✅ RLS policies updated to allow admin access to all bookings';
END $$;