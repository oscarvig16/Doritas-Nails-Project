/*
  # Fix Employee Login Sync Logic

  1. Security
    - Update RLS policies to prevent unauthorized access
    - Ensure only known employees can create profiles
    
  2. Data Integrity
    - Clean up any duplicate employees
    - Ensure proper auth_user_id linking
    
  3. Employee Assignment
    - Fix auto-assignment function to work with BEFORE trigger
    - Ensure bookings are properly assigned to employees
*/

-- Set timezone to America/Los_Angeles for all operations
SET timezone = 'America/Los_Angeles';

-- Clean up duplicate employees (keep the ones with correct names)
DO $$
DECLARE
    dora_correct_id uuid;
    aracely_correct_id uuid;
    emp_record RECORD;
BEGIN
    -- Find the correct Dora record (with proper name)
    SELECT id INTO dora_correct_id 
    FROM employees 
    WHERE email = 'dora@doritasnails.com' AND name = 'Dora Alviter'
    LIMIT 1;
    
    -- If no correct Dora record exists, find any Dora record and update it
    IF dora_correct_id IS NULL THEN
        SELECT id INTO dora_correct_id 
        FROM employees 
        WHERE email = 'dora@doritasnails.com'
        ORDER BY created_at ASC
        LIMIT 1;
        
        IF dora_correct_id IS NOT NULL THEN
            UPDATE employees 
            SET name = 'Dora Alviter', role = 'admin'
            WHERE id = dora_correct_id;
        END IF;
    END IF;
    
    -- Find the correct Aracely record (with proper name)
    SELECT id INTO aracely_correct_id 
    FROM employees 
    WHERE email = 'aracely@doritasnails.com' AND name = 'Aracely Orozco'
    LIMIT 1;
    
    -- If no correct Aracely record exists, find any Aracely record and update it
    IF aracely_correct_id IS NULL THEN
        SELECT id INTO aracely_correct_id 
        FROM employees 
        WHERE email = 'aracely@doritasnails.com'
        ORDER BY created_at ASC
        LIMIT 1;
        
        IF aracely_correct_id IS NOT NULL THEN
            UPDATE employees 
            SET name = 'Aracely Orozco', role = 'employee'
            WHERE id = aracely_correct_id;
        END IF;
    END IF;
    
    -- Delete duplicate Dora records
    IF dora_correct_id IS NOT NULL THEN
        DELETE FROM employees 
        WHERE email = 'dora@doritasnails.com' AND id != dora_correct_id;
    END IF;
    
    -- Delete duplicate Aracely records
    IF aracely_correct_id IS NOT NULL THEN
        DELETE FROM employees 
        WHERE email = 'aracely@doritasnails.com' AND id != aracely_correct_id;
    END IF;
END $$;

-- Ensure the correct employees exist
INSERT INTO employees (name, email, role, auth_user_id) VALUES
  ('Dora Alviter', 'dora@doritasnails.com', 'admin', NULL),
  ('Aracely Orozco', 'aracely@doritasnails.com', 'employee', NULL)
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role;

-- Update RLS policies for employees to be more restrictive
DROP POLICY IF EXISTS "Employees can create own profile" ON employees;
DROP POLICY IF EXISTS "Employees can update own profile" ON employees;
DROP POLICY IF EXISTS "Employees can view own profile" ON employees;

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

-- Update the auto-assignment function to work properly with BEFORE trigger
CREATE OR REPLACE FUNCTION auto_assign_employee()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  target_employee_id uuid;
  technician_name text;
BEGIN
  -- If technician is specified and not auto-assign, try to find matching employee
  IF NEW.technicians IS NOT NULL AND NEW.technicians->>'type' != 'auto' THEN
    
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

-- Recreate the trigger as BEFORE INSERT
DROP TRIGGER IF EXISTS auto_assign_employee_trigger ON bookings;
CREATE TRIGGER auto_assign_employee_trigger
  BEFORE INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_employee();

-- Update existing bookings to have proper employee assignment
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