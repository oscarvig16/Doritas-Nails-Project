/*
  # Update Auth Users Metadata with Employee IDs

  1. Updates
    - Set metadata.employee_id for dora@doritasnails.com to match Dora Alviter's UUID
    - Set metadata.employee_id for aracely@doritasnails.com to match Aracely Orozco's UUID

  2. Security
    - Uses service role to update auth.users metadata
    - Only updates existing users, does not create new ones
*/

-- Update metadata for existing auth users to include employee_id
DO $$
DECLARE
    dora_employee_id uuid;
    aracely_employee_id uuid;
    dora_auth_id uuid;
    aracely_auth_id uuid;
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
    
    -- Update Dora's metadata if both records exist
    IF dora_employee_id IS NOT NULL AND dora_auth_id IS NOT NULL THEN
        UPDATE auth.users 
        SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
            jsonb_build_object('employee_id', dora_employee_id::text)
        WHERE id = dora_auth_id;
        
        -- Also update the employees table to link the auth user
        UPDATE employees 
        SET auth_user_id = dora_auth_id
        WHERE id = dora_employee_id;
        
        RAISE NOTICE 'Updated metadata for Dora Alviter: employee_id = %', dora_employee_id;
    ELSE
        RAISE NOTICE 'Dora records not found - employee_id: %, auth_id: %', dora_employee_id, dora_auth_id;
    END IF;
    
    -- Update Aracely's metadata if both records exist
    IF aracely_employee_id IS NOT NULL AND aracely_auth_id IS NOT NULL THEN
        UPDATE auth.users 
        SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || 
            jsonb_build_object('employee_id', aracely_employee_id::text)
        WHERE id = aracely_auth_id;
        
        -- Also update the employees table to link the auth user
        UPDATE employees 
        SET auth_user_id = aracely_auth_id
        WHERE id = aracely_employee_id;
        
        RAISE NOTICE 'Updated metadata for Aracely Orozco: employee_id = %', aracely_employee_id;
    ELSE
        RAISE NOTICE 'Aracely records not found - employee_id: %, auth_id: %', aracely_employee_id, aracely_auth_id;
    END IF;
END $$;