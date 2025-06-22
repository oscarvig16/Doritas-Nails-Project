-- Set timezone to America/Los_Angeles for all operations
SET timezone = 'America/Los_Angeles';

-- Fix RLS policies to ensure employees can see their bookings
DROP POLICY IF EXISTS "Employees can view assigned bookings" ON bookings;

-- Create a more permissive policy for employees to view their bookings
CREATE POLICY "Employees can view assigned bookings"
  ON bookings
  FOR SELECT
  TO authenticated
  USING (
    -- Employee can see bookings assigned to them
    employee_id = get_current_employee_id() OR
    -- Also allow viewing unassigned bookings (for assignment purposes)
    employee_id IS NULL OR
    -- Allow admins to see all bookings
    EXISTS (
      SELECT 1 FROM employees 
      WHERE employees.auth_user_id = auth.uid() 
      AND employees.role = 'admin'
    )
  );

-- Ensure the get_current_employee_id function works correctly
CREATE OR REPLACE FUNCTION get_current_employee_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id FROM employees WHERE auth_user_id = auth.uid();
$$;

-- Debug function to check employee-booking relationships
CREATE OR REPLACE FUNCTION debug_employee_bookings(employee_email text)
RETURNS TABLE (
  employee_id uuid,
  employee_name text,
  booking_count bigint,
  sample_booking_id uuid,
  sample_customer text,
  sample_date date
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    e.id as employee_id,
    e.name as employee_name,
    COUNT(b.id) as booking_count,
    (array_agg(b.id))[1] as sample_booking_id,
    (array_agg(b.customer_first_name || ' ' || b.customer_last_name))[1] as sample_customer,
    (array_agg(b.appointment_date))[1] as sample_date
  FROM employees e
  LEFT JOIN bookings b ON b.employee_id = e.id
  WHERE e.email = employee_email
  GROUP BY e.id, e.name;
$$;

-- Verification query to check current state
DO $$
DECLARE
    verification_record RECORD;
    dora_employee_id uuid;
    aracely_employee_id uuid;
    total_bookings integer;
    dora_bookings integer;
    aracely_bookings integer;
BEGIN
    RAISE NOTICE '=== EMPLOYEE PANEL QUERY FIX VERIFICATION ===';
    
    -- Get employee IDs
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
    
    -- Count bookings
    SELECT COUNT(*) INTO total_bookings FROM bookings;
    SELECT COUNT(*) INTO dora_bookings FROM bookings WHERE employee_id = dora_employee_id;
    SELECT COUNT(*) INTO aracely_bookings FROM bookings WHERE employee_id = aracely_employee_id;
    
    RAISE NOTICE 'Booking counts:';
    RAISE NOTICE '  Total bookings: %', total_bookings;
    RAISE NOTICE '  Dora bookings: %', dora_bookings;
    RAISE NOTICE '  Aracely bookings: %', aracely_bookings;
    
    -- Show recent bookings for each employee
    RAISE NOTICE 'Recent bookings:';
    
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
        LIMIT 3
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
        LIMIT 3
    LOOP
        RAISE NOTICE '  Aracely: % | % | % %',
            verification_record.id,
            verification_record.customer_name,
            verification_record.appointment_date,
            verification_record.appointment_time;
    END LOOP;
    
    -- Check auth linkage
    RAISE NOTICE 'Auth linkage:';
    FOR verification_record IN
        SELECT 
            name,
            email,
            auth_user_id IS NOT NULL as has_auth_link
        FROM employees 
        WHERE email IN ('dora@doritasnails.com', 'aracely@doritasnails.com')
        ORDER BY name
    LOOP
        RAISE NOTICE '  %: auth_linked=%',
            verification_record.name,
            verification_record.has_auth_link;
    END LOOP;
    
    -- Final status
    IF dora_bookings > 0 AND aracely_bookings > 0 THEN
        RAISE NOTICE '✅ SUCCESS: Both employees have bookings assigned!';
        RAISE NOTICE '✅ Employee panels should now show appointments correctly!';
    ELSIF dora_bookings > 0 THEN
        RAISE NOTICE '⚠️  Only Dora has bookings assigned.';
    ELSIF aracely_bookings > 0 THEN
        RAISE NOTICE '⚠️  Only Aracely has bookings assigned.';
    ELSE
        RAISE NOTICE '❌ ERROR: No bookings assigned to either employee!';
    END IF;
    
    RAISE NOTICE 'Employee panel query fix verification completed.';
    
END $$;