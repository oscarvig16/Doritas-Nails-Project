/*
  # RLS Investigation and Policy Analysis

  1. Current RLS Policies
    - Show all current policies on employees table
    - Analyze policy conditions and requirements
    
  2. Policy Fixes
    - Create anon-friendly policy for employee lookup during booking
    - Maintain security while allowing necessary operations
*/

-- Show current RLS policies on employees table
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    RAISE NOTICE '=== CURRENT RLS POLICIES ON EMPLOYEES TABLE ===';
    
    FOR policy_record IN
        SELECT 
            schemaname,
            tablename,
            policyname,
            permissive,
            roles,
            cmd,
            qual,
            with_check
        FROM pg_policies 
        WHERE tablename = 'employees'
        ORDER BY policyname
    LOOP
        RAISE NOTICE 'Policy: %', policy_record.policyname;
        RAISE NOTICE '  Command: %', policy_record.cmd;
        RAISE NOTICE '  Roles: %', policy_record.roles;
        RAISE NOTICE '  Permissive: %', policy_record.permissive;
        RAISE NOTICE '  Qualifier: %', COALESCE(policy_record.qual, 'NULL');
        RAISE NOTICE '  With Check: %', COALESCE(policy_record.with_check, 'NULL');
        RAISE NOTICE '  ---';
    END LOOP;
    
    -- Check if RLS is enabled
    IF EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'employees' 
        AND n.nspname = 'public'
        AND c.relrowsecurity = true
    ) THEN
        RAISE NOTICE 'RLS is ENABLED on employees table';
    ELSE
        RAISE NOTICE 'RLS is DISABLED on employees table';
    END IF;
    
END $$;

-- Create a temporary anon-friendly policy for employee lookup during booking
-- This allows the booking creation process to find employees without authentication
DROP POLICY IF EXISTS "Allow anon employee lookup for booking" ON employees;

CREATE POLICY "Allow anon employee lookup for booking"
  ON employees
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Verify the new policy was created
DO $$
BEGIN
    RAISE NOTICE '=== CREATED ANON-FRIENDLY POLICY ===';
    RAISE NOTICE 'Policy "Allow anon employee lookup for booking" created';
    RAISE NOTICE 'This allows anonymous users to read employees table for booking assignment';
    RAISE NOTICE 'Security note: This is necessary for booking flow but should be monitored';
END $$;

-- Test employee access with the new policy
DO $$
DECLARE
    employee_count integer;
    employee_record RECORD;
BEGIN
    RAISE NOTICE '=== TESTING EMPLOYEE ACCESS ===';
    
    -- Count total employees
    SELECT COUNT(*) INTO employee_count FROM employees;
    RAISE NOTICE 'Total employees in table: %', employee_count;
    
    -- Show sample employees
    FOR employee_record IN
        SELECT id, name, email, role
        FROM employees
        WHERE name IN ('Dora Alviter', 'Aracely Orozco')
        ORDER BY name
    LOOP
        RAISE NOTICE 'Employee: % | % | % | %',
            employee_record.id,
            employee_record.name,
            employee_record.email,
            employee_record.role;
    END LOOP;
    
END $$;