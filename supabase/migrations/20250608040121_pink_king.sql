/*
  # Complete Employee Panel Flow Synchronization

  1. Employee Authentication
    - Ensure proper auth_user_id linking
    - Clean up any inconsistent data
    - Verify employee records exist

  2. Booking Assignment
    - Update auto-assignment function
    - Ensure all bookings have correct employee_id
    - Fix any orphaned bookings

  3. RLS Policies
    - Ensure employees can only see their own bookings
    - Allow proper employee profile management
    - Secure booking updates

  4. Data Integrity
    - Verify employee-booking relationships
    - Clean up any inconsistent states
*/

-- Set timezone to America/Los_Angeles for all operations
SET timezone = 'America/Los_Angeles';

-- Ensure employees table has correct structure
DO $$
BEGIN
  -- Add auth_user_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'auth_user_id'
  ) THEN
    ALTER TABLE employees ADD COLUMN auth_user_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Create unique index on auth_user_id if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS employees_auth_user_id_key ON employees(auth_user_id);

-- Clean up and ensure correct employee records exist
WITH employee_data AS (
  SELECT 
    'dora@doritasnails.com' as email,
    'Dora Alviter' as name,
    'admin' as role
  UNION ALL
  SELECT 
    'aracely@doritasnails.com' as email,
    'Aracely Orozco' as name,
    'employee' as role
)
INSERT INTO employees (email, name, role, created_at, updated_at, auth_user_id)
SELECT email, name, role, now(), now(), NULL
FROM employee_data
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  updated_at = now();

-- Remove any duplicate employees (keep the ones with correct names)
WITH ranked_employees AS (
  SELECT id, email, name, role,
         ROW_NUMBER() OVER (
           PARTITION BY email 
           ORDER BY 
             CASE 
               WHEN email = 'dora@doritasnails.com' AND name = 'Dora Alviter' THEN 1
               WHEN email = 'aracely@doritasnails.com' AND name = 'Aracely Orozco' THEN 1
               ELSE 2
             END,
             created_at ASC
         ) as rn
  FROM employees
  WHERE email IN ('dora@doritasnails.com', 'aracely@doritasnails.com')
)
DELETE FROM employees 
WHERE id IN (
  SELECT id FROM ranked_employees WHERE rn > 1
);

-- Update function to get current employee ID
CREATE OR REPLACE FUNCTION get_current_employee_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id FROM employees WHERE auth_user_id = auth.uid();
$$;

-- Update the auto-assignment function for booking creation
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

-- Update RLS policies for employees table
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

-- Update RLS policies for bookings to ensure proper employee access
DROP POLICY IF EXISTS "Employees can view assigned bookings" ON bookings;
DROP POLICY IF EXISTS "Employees can update assigned bookings" ON bookings;

-- Employees can view bookings assigned to them or unassigned bookings
CREATE POLICY "Employees can view assigned bookings"
  ON bookings
  FOR SELECT
  TO authenticated
  USING (
    employee_id = get_current_employee_id() OR
    employee_id IS NULL
  );

-- Employees can update their assigned bookings
CREATE POLICY "Employees can update assigned bookings"
  ON bookings
  FOR UPDATE
  TO authenticated
  USING (employee_id = get_current_employee_id())
  WITH CHECK (employee_id = get_current_employee_id());

-- Update RLS policies for booking_updates
DROP POLICY IF EXISTS "Employees can view own booking updates" ON booking_updates;
DROP POLICY IF EXISTS "Employees can create own booking updates" ON booking_updates;

CREATE POLICY "Employees can view own booking updates"
  ON booking_updates
  FOR SELECT
  TO authenticated
  USING (employee_id = get_current_employee_id());

CREATE POLICY "Employees can create own booking updates"
  ON booking_updates
  FOR INSERT
  TO authenticated
  WITH CHECK (employee_id = get_current_employee_id());

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

-- Sync existing auth users with employee records
DO $$
DECLARE
    dora_employee_id uuid;
    aracely_employee_id uuid;
    dora_auth_id uuid;
    aracely_auth_id uuid;
    updated_count integer := 0;
BEGIN
    -- Get employee IDs
    SELECT id INTO dora_employee_id 
    FROM employees 
    WHERE email = 'dora@doritasnails.com' AND name = 'Dora Alviter'
    LIMIT 1;
    
    SELECT id INTO aracely_employee_id 
    FROM employees 
    WHERE email = 'aracely@doritasnails.com' AND name = 'Aracely Orozco'
    LIMIT 1;
    
    -- Get auth user IDs
    SELECT id INTO dora_auth_id 
    FROM auth.users 
    WHERE email = 'dora@doritasnails.com'
    LIMIT 1;
    
    SELECT id INTO aracely_auth_id 
    FROM auth.users 
    WHERE email = 'aracely@doritasnails.com'
    LIMIT 1;
    
    -- Link Dora's records if both exist
    IF dora_employee_id IS NOT NULL AND dora_auth_id IS NOT NULL THEN
        UPDATE employees 
        SET auth_user_id = dora_auth_id,
            updated_at = now()
        WHERE id = dora_employee_id;
        
        updated_count := updated_count + 1;
    END IF;
    
    -- Link Aracely's records if both exist
    IF aracely_employee_id IS NOT NULL AND aracely_auth_id IS NOT NULL THEN
        UPDATE employees 
        SET auth_user_id = aracely_auth_id,
            updated_at = now()
        WHERE id = aracely_employee_id;
        
        updated_count := updated_count + 1;
    END IF;
    
    RAISE NOTICE 'Employee-auth sync completed. Updated % employee(s).', updated_count;
END $$;