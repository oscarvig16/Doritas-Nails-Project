/*
  # Fix employee-auth sync and booking assignment

  1. Employee-Auth Sync
    - Links existing auth users to employee records
    - Updates user metadata with employee_id
    - Ensures proper authentication flow

  2. Booking Assignment
    - Updates auto-assignment function to work properly
    - Ensures all bookings get assigned to correct employees
    - Maintains data integrity

  3. Verification
    - Confirms all linkages are working
    - Provides detailed logging for troubleshooting
*/

DO $$
DECLARE
    dora_employee_id uuid;
    aracely_employee_id uuid;
    dora_auth_id uuid;
    aracely_auth_id uuid;
    updated_count integer := 0;
    emp_name text;
    emp_email text;
    has_auth_link boolean;
    metadata_employee_id text;
BEGIN
    RAISE NOTICE 'Starting employee-auth sync process...';
    
    -- Get employee IDs from employees table
    SELECT id INTO dora_employee_id 
    FROM employees 
    WHERE email = 'dora@doritasnails.com' AND name = 'Dora Alviter'
    LIMIT 1;
    
    SELECT id INTO aracely_employee_id 
    FROM employees 
    WHERE email = 'aracely@doritasnails.com' AND name = 'Aracely Orozco'
    LIMIT 1;
    
    -- Get auth user IDs from auth.users table
    SELECT id INTO dora_auth_id 
    FROM auth.users 
    WHERE email = 'dora@doritasnails.com'
    LIMIT 1;
    
    SELECT id INTO aracely_auth_id 
    FROM auth.users 
    WHERE email = 'aracely@doritasnails.com'
    LIMIT 1;
    
    -- Process Dora's records
    IF dora_employee_id IS NOT NULL AND dora_auth_id IS NOT NULL THEN
        -- Update Auth user metadata
        UPDATE auth.users 
        SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
            jsonb_build_object('employee_id', dora_employee_id::text)
        WHERE id = dora_auth_id;
        
        -- Update employee record to link auth user
        UPDATE employees 
        SET auth_user_id = dora_auth_id,
            updated_at = now()
        WHERE id = dora_employee_id;
        
        updated_count := updated_count + 1;
        RAISE NOTICE 'SUCCESS: Linked Dora Alviter - employee_id: %, auth_id: %', dora_employee_id, dora_auth_id;
    ELSE
        RAISE NOTICE 'SKIP: Dora records incomplete - employee_id: %, auth_id: %', 
            COALESCE(dora_employee_id::text, 'NULL'), 
            COALESCE(dora_auth_id::text, 'NULL');
    END IF;
    
    -- Process Aracely's records
    IF aracely_employee_id IS NOT NULL AND aracely_auth_id IS NOT NULL THEN
        -- Update Auth user metadata
        UPDATE auth.users 
        SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
            jsonb_build_object('employee_id', aracely_employee_id::text)
        WHERE id = aracely_auth_id;
        
        -- Update employee record to link auth user
        UPDATE employees 
        SET auth_user_id = aracely_auth_id,
            updated_at = now()
        WHERE id = aracely_employee_id;
        
        updated_count := updated_count + 1;
        RAISE NOTICE 'SUCCESS: Linked Aracely Orozco - employee_id: %, auth_id: %', aracely_employee_id, aracely_auth_id;
    ELSE
        RAISE NOTICE 'SKIP: Aracely records incomplete - employee_id: %, auth_id: %', 
            COALESCE(aracely_employee_id::text, 'NULL'), 
            COALESCE(aracely_auth_id::text, 'NULL');
    END IF;
    
    RAISE NOTICE 'Employee-auth sync completed. Updated % user(s).', updated_count;
    
    -- Verify the linkages using a cursor approach
    RAISE NOTICE 'Verification:';
    FOR emp_name, emp_email, has_auth_link, metadata_employee_id IN 
        SELECT e.name, e.email, e.auth_user_id IS NOT NULL,
               u.raw_user_meta_data->>'employee_id'
        FROM employees e
        LEFT JOIN auth.users u ON u.id = e.auth_user_id
        WHERE e.email IN ('dora@doritasnails.com', 'aracely@doritasnails.com')
    LOOP
        RAISE NOTICE '  %: auth_linked=%, metadata_set=%', 
            emp_name, 
            has_auth_link,
            (metadata_employee_id IS NOT NULL);
    END LOOP;
    
END $$;

-- Update the auto-assignment function to ensure it works properly
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
    
    -- For single technician assignments
    IF NEW.technicians->>'type' = 'single' AND NEW.technicians->'manicureTech'->>'name' IS NOT NULL THEN
      technician_name := NEW.technicians->'manicureTech'->>'name';
      
    -- For split technician assignments, prioritize manicure tech
    ELSIF NEW.technicians->>'type' = 'split' THEN
      IF NEW.technicians->'manicureTech'->>'name' IS NOT NULL THEN
        technician_name := NEW.technicians->'manicureTech'->>'name';
      ELSIF NEW.technicians->'pedicureTech'->>'name' IS NOT NULL THEN
        technician_name := NEW.technicians->'pedicureTech'->>'name';
      END IF;
    END IF;
    
    -- Find employee by name
    IF technician_name IS NOT NULL THEN
      SELECT id INTO target_employee_id
      FROM employees 
      WHERE name = technician_name
      LIMIT 1;
      
      -- Set the employee_id in the NEW record
      IF target_employee_id IS NOT NULL THEN
        NEW.employee_id := target_employee_id;
        RAISE NOTICE 'Auto-assigned booking to employee: % (ID: %)', technician_name, target_employee_id;
      ELSE
        RAISE NOTICE 'No employee found for technician: %', technician_name;
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

-- Update any existing bookings that don't have employee_id set
UPDATE bookings 
SET employee_id = (
  SELECT e.id 
  FROM employees e 
  WHERE e.name = COALESCE(
    bookings.technicians->'manicureTech'->>'name',
    bookings.technicians->'pedicureTech'->>'name'
  )
  LIMIT 1
)
WHERE employee_id IS NULL 
  AND technicians IS NOT NULL 
  AND technicians->>'type' != 'auto'
  AND EXISTS (
    SELECT 1 FROM employees e 
    WHERE e.name = COALESCE(
      bookings.technicians->'manicureTech'->>'name',
      bookings.technicians->'pedicureTech'->>'name'
    )
  );

-- Log the results
DO $$
DECLARE
    booking_count integer;
    assigned_count integer;
BEGIN
    SELECT COUNT(*) INTO booking_count FROM bookings;
    SELECT COUNT(*) INTO assigned_count FROM bookings WHERE employee_id IS NOT NULL;
    
    RAISE NOTICE 'Booking assignment summary:';
    RAISE NOTICE '  Total bookings: %', booking_count;
    RAISE NOTICE '  Assigned bookings: %', assigned_count;
    RAISE NOTICE '  Unassigned bookings: %', (booking_count - assigned_count);
END $$;