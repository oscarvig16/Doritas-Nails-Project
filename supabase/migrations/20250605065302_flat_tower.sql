/*
  # Employee Panel Schema Updates

  1. New Tables
    - `employees` table for employee authentication and management
    - `booking_updates` table for tracking status changes and employee actions

  2. Changes
    - Add employee_id to bookings table
    - Add last_updated_by to bookings table

  3. Security
    - Enable RLS on new tables
    - Add policies for employee access
*/

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'employee',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_role CHECK (role IN ('employee', 'admin'))
);

-- Create booking_updates table for audit trail
CREATE TABLE IF NOT EXISTS booking_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id),
  employee_id uuid NOT NULL REFERENCES employees(id),
  previous_status text NOT NULL,
  new_status text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_status_change CHECK (
    new_status IN ('pending', 'paid', 'completed', 'cancelled', 'no_show')
  )
);

-- Add employee-related columns to bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS employee_id uuid REFERENCES employees(id),
  ADD COLUMN IF NOT EXISTS last_updated_by uuid REFERENCES employees(id);

-- Enable RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_updates ENABLE ROW LEVEL SECURITY;

-- Policies for employees table
CREATE POLICY "Employees can view own profile"
  ON employees
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);

-- Policies for booking_updates table
CREATE POLICY "Employees can view booking updates"
  ON booking_updates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can create booking updates"
  ON booking_updates
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Update bookings policies for employee access
CREATE POLICY "Employees can view all bookings"
  ON bookings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Employees can update bookings"
  ON bookings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger for employees
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();