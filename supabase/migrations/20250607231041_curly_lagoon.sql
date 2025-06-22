/*
  # Employee Panel Improvements

  1. Employee Authentication
    - Add auth_user_id column to employees table
    - Create function to get current employee ID
    - Link employees with Supabase auth users

  2. Booking Ownership
    - Auto-assign employees to bookings based on technician selection
    - Restrict employee access to only their assigned bookings
    - Update RLS policies for proper access control

  3. Timezone Support
    - Set default timezone to America/Los_Angeles
    - Ensure consistent timezone handling across operations

  4. Audit Trail
    - Update booking_updates policies for employee-specific access
    - Ensure proper tracking of changes
*/

-- Set timezone to America/Los_Angeles for all operations
SET timezone = 'America/Los_Angeles';

-- Add auth_user_id column to employees table to link with Supabase auth
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'auth_user_id'
  ) THEN
    ALTER TABLE employees ADD COLUMN auth_user_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Create unique index on auth_user_id
CREATE UNIQUE INDEX IF NOT EXISTS employees_auth_user_id_key ON employees(auth_user_id);

-- Create function to get current employee ID from auth (after column exists)
CREATE OR REPLACE FUNCTION get_current_employee_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id FROM employees WHERE auth_user_id = auth.uid();
$$;

-- Update RLS policies for bookings to restrict employee access
DROP POLICY IF EXISTS "Employees can view all bookings" ON bookings;
DROP POLICY IF EXISTS "Employees can update bookings" ON bookings;

-- Employees can only view bookings assigned to them
CREATE POLICY "Employees can view assigned bookings"
  ON bookings
  FOR SELECT
  TO authenticated
  USING (
    employee_id = get_current_employee_id() OR
    -- Allow viewing if no employee assigned yet (for assignment purposes)
    employee_id IS NULL
  );

-- Employees can only update their assigned bookings
CREATE POLICY "Employees can update assigned bookings"
  ON bookings
  FOR UPDATE
  TO authenticated
  USING (employee_id = get_current_employee_id())
  WITH CHECK (employee_id = get_current_employee_id());

-- Function to auto-assign employee on booking creation
CREATE OR REPLACE FUNCTION auto_assign_employee()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If technician is specified and not auto-assign, try to find matching employee
  IF NEW.technicians IS NOT NULL AND NEW.technicians->>'type' != 'auto' THEN
    -- For single technician assignments
    IF NEW.technicians->>'type' = 'single' AND NEW.technicians->'manicureTech'->>'name' IS NOT NULL THEN
      UPDATE bookings 
      SET employee_id = (
        SELECT id FROM employees 
        WHERE name = NEW.technicians->'manicureTech'->>'name'
        LIMIT 1
      )
      WHERE id = NEW.id;
    -- For split technician assignments, assign to manicure tech if available
    ELSIF NEW.technicians->>'type' = 'split' AND NEW.technicians->'manicureTech'->>'name' IS NOT NULL THEN
      UPDATE bookings 
      SET employee_id = (
        SELECT id FROM employees 
        WHERE name = NEW.technicians->'manicureTech'->>'name'
        LIMIT 1
      )
      WHERE id = NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-assignment
DROP TRIGGER IF EXISTS auto_assign_employee_trigger ON bookings;
CREATE TRIGGER auto_assign_employee_trigger
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_employee();

-- Update booking_updates policies
DROP POLICY IF EXISTS "Employees can view booking updates" ON booking_updates;
DROP POLICY IF EXISTS "Employees can create booking updates" ON booking_updates;

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

-- Insert sample employees (auth_user_id will be updated when employees sign up)
INSERT INTO employees (name, email, role, auth_user_id) VALUES
  ('Dora Alviter', 'dora@doritasnails.com', 'admin', NULL),
  ('Aracely Orozco', 'aracely@doritasnails.com', 'employee', NULL)
ON CONFLICT (email) DO NOTHING;