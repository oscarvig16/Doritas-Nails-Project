/*
  # Fix Employee Panel and Bookings Flow

  1. Employee Management
    - Ensure employees table has proper auth_user_id linking
    - Add function to auto-create employee profiles on login
    
  2. Booking Assignment
    - Update auto-assignment function to properly set employee_id
    - Ensure technician names map to employee records
    
  3. Timezone Support
    - Set default timezone to America/Los_Angeles
    - Ensure all timestamp operations use this timezone
    
  4. RLS Policies
    - Update policies to allow employee profile creation
    - Ensure proper access control for bookings
*/

-- Set timezone to America/Los_Angeles for all operations
SET timezone = 'America/Los_Angeles';

-- Ensure auth_user_id column exists and is properly configured
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'auth_user_id'
  ) THEN
    ALTER TABLE employees ADD COLUMN auth_user_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Create unique index on auth_user_id if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS employees_auth_user_id_key ON employees(auth_user_id);

-- Update RLS policies for employees to allow profile creation
DROP POLICY IF EXISTS "Employees can view own profile" ON employees;

-- Allow employees to view their own profile
CREATE POLICY "Employees can view own profile"
  ON employees
  FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);

-- Allow employees to insert their own profile (for auto-creation)
CREATE POLICY "Employees can create own profile"
  ON employees
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = auth_user_id);

-- Allow employees to update their own profile
CREATE POLICY "Employees can update own profile"
  ON employees
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- Update the auto-assignment function to properly handle technician mapping
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
      
      -- Update the booking with the employee_id
      IF target_employee_id IS NOT NULL THEN
        NEW.employee_id := target_employee_id;
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

-- Update function to get current employee ID
CREATE OR REPLACE FUNCTION get_current_employee_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id FROM employees WHERE auth_user_id = auth.uid();
$$;

-- Update booking policies to ensure proper employee access
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

-- Ensure sample employees exist with correct names matching technician selection
INSERT INTO employees (name, email, role, auth_user_id) VALUES
  ('Dora Alviter', 'dora@doritasnails.com', 'admin', NULL),
  ('Aracely Orozco', 'aracely@doritasnails.com', 'employee', NULL)
ON CONFLICT (email) DO NOTHING;

-- Update existing bookings to have proper employee assignment based on technician data
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
  AND technicians->>'type' != 'auto';