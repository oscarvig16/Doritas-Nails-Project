/*
  # Sync employee_id between Supabase Auth users and employees table

  1. Links Auth users to employee records by matching email addresses
  2. Updates Auth user metadata with employee_id for proper access control
  3. Updates employee records with auth_user_id for bidirectional linking
  4. Provides detailed logging for verification

  This fixes the employee panel hanging issue by ensuring correct employee-user linkage.
*/

DO $$
DECLARE
    dora_employee_id uuid;
    aracely_employee_id uuid;
    dora_auth_id uuid;
    aracely_auth_id uuid;
    updated_count integer := 0;
    verification_record record;
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
    
    -- Verify the linkages
    RAISE NOTICE 'Verification:';
    FOR verification_record IN 
        SELECT e.name, e.email, e.auth_user_id IS NOT NULL as has_auth_link,
               u.raw_user_meta_data->>'employee_id' as metadata_employee_id
        FROM employees e
        LEFT JOIN auth.users u ON u.id = e.auth_user_id
        WHERE e.email IN ('dora@doritasnails.com', 'aracely@doritasnails.com')
    LOOP
        RAISE NOTICE '  %: auth_linked=%, metadata_set=%', 
            verification_record.name, 
            verification_record.has_auth_link,
            (verification_record.metadata_employee_id IS NOT NULL);
    END LOOP;
    
END $$;