/*
  # Fix Employee Assignment for All Technicians

  1. Updates
    - Improve auto-assignment function with better name matching
    - Add case-insensitive and trimmed name matching
    - Ensure all bookings get proper employee_id assignment
    - Add detailed logging for debugging

  2. Data Integrity
    - Update existing bookings with missing employee_id
    - Verify employee names match exactly with technician selection
*/

-- Set timezone to America/Los_Angeles for all operations
SET timezone = 'America/Los_Angeles';

-- Update the auto-assignment function with improved name matching
CREATE OR REPLACE FUNCTION auto_assign_employee()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  target_employee_id uuid;
  technician_name text;
  normalized_name text;
  emp_record RECORD;
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
    
    -- Find employee by name with improved matching
    IF technician_name IS NOT NULL THEN
      -- Normalize the technician name (trim whitespace)
      normalized_name := TRIM(technician_name);
      
      -- First try exact match
      SELECT id INTO target_employee_id
      FROM employees 
      WHERE name = normalized_name
      LIMIT 1;
      
      -- If exact match fails, try case-insensitive match
      IF target_employee_id IS NULL THEN
        SELECT id INTO target_employee_id
        FROM employees 
        WHERE LOWER(TRIM(name)) = LOWER(normalized_name)
        LIMIT 1;
      END IF;
      
      -- Set the employee_id in the NEW record
      IF target_employee_id IS NOT NULL THEN
        NEW.employee_id := target_employee_id;
        
        -- Log successful assignment
        SELECT name INTO technician_name FROM employees WHERE id = target_employee_id;
        RAISE NOTICE 'Auto-assigned booking to employee: % (ID: %)', technician_name, target_employee_id;
      ELSE
        -- Log failed assignment with available employees
        RAISE NOTICE 'No employee found for technician: "%"', normalized_name;
        RAISE NOTICE 'Available employees:';
        FOR emp_record IN SELECT name, email FROM employees LOOP
          RAISE NOTICE '  - "%" (%)', emp_record.name, emp_record.email;
        END LOOP;
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

-- Update existing bookings with missing employee_id using improved matching
DO $$
DECLARE
  booking_record RECORD;
  technician_name text;
  normalized_name text;
  target_employee_id uuid;
  updated_count integer := 0;
BEGIN
  RAISE NOTICE 'Updating existing bookings with missing employee_id...';
  
  FOR booking_record IN 
    SELECT id, technicians 
    FROM bookings 
    WHERE employee_id IS NULL 
      AND technicians IS NOT NULL 
      AND technicians->>'type' != 'auto'
  LOOP
    technician_name := NULL;
    target_employee_id := NULL;
    
    -- Extract technician name from booking data
    IF booking_record.technicians->>'type' = 'single' AND booking_record.technicians->'manicureTech'->>'name' IS NOT NULL THEN
      technician_name := booking_record.technicians->'manicureTech'->>'name';
    ELSIF booking_record.technicians->>'type' = 'split' THEN
      IF booking_record.technicians->'manicureTech'->>'name' IS NOT NULL THEN
        technician_name := booking_record.technicians->'manicureTech'->>'name';
      ELSIF booking_record.technicians->'pedicureTech'->>'name' IS NOT NULL THEN
        technician_name := booking_record.technicians->'pedicureTech'->>'name';
      END IF;
    END IF;
    
    -- Find matching employee
    IF technician_name IS NOT NULL THEN
      normalized_name := TRIM(technician_name);
      
      -- First try exact match
      SELECT id INTO target_employee_id
      FROM employees 
      WHERE name = normalized_name
      LIMIT 1;
      
      -- If exact match fails, try case-insensitive match
      IF target_employee_id IS NULL THEN
        SELECT id INTO target_employee_id
        FROM employees 
        WHERE LOWER(TRIM(name)) = LOWER(normalized_name)
        LIMIT 1;
      END IF;
      
      -- Update booking if employee found
      IF target_employee_id IS NOT NULL THEN
        UPDATE bookings 
        SET employee_id = target_employee_id
        WHERE id = booking_record.id;
        
        updated_count := updated_count + 1;
        RAISE NOTICE 'Updated booking % with employee_id %', booking_record.id, target_employee_id;
      ELSE
        RAISE NOTICE 'No employee found for booking % with technician "%"', booking_record.id, normalized_name;
      END IF;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Updated % existing bookings with employee assignments', updated_count;
END $$;

-- Verify employee names are exactly as expected
DO $$
DECLARE
  emp_record RECORD;
  expected_names text[] := ARRAY['Dora Alviter', 'Aracely Orozco'];
  name_found boolean;
BEGIN
  RAISE NOTICE 'Verifying employee names...';
  
  FOR emp_record IN SELECT name, email FROM employees WHERE email IN ('dora@doritasnails.com', 'aracely@doritasnails.com') LOOP
    name_found := emp_record.name = ANY(expected_names);
    RAISE NOTICE 'Employee: "%" (%) - Name correct: %', emp_record.name, emp_record.email, name_found;
    
    IF NOT name_found THEN
      RAISE NOTICE 'WARNING: Employee name does not match expected values!';
    END IF;
  END LOOP;
  
  -- Show final booking assignment summary
  RAISE NOTICE 'Booking assignment summary:';
  RAISE NOTICE '  Total bookings: %', (SELECT COUNT(*) FROM bookings);
  RAISE NOTICE '  Assigned bookings: %', (SELECT COUNT(*) FROM bookings WHERE employee_id IS NOT NULL);
  RAISE NOTICE '  Unassigned bookings: %', (SELECT COUNT(*) FROM bookings WHERE employee_id IS NULL);
  RAISE NOTICE '  Auto-assign bookings: %', (SELECT COUNT(*) FROM bookings WHERE technicians->>'type' = 'auto');
END $$;