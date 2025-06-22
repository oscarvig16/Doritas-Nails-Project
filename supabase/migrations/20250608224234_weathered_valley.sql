/*
  # Restore employees table with exact UUIDs

  1. Employees
    - Insert Dora Alviter with exact UUID: 5ecbfa44-2171-4a7f-9445-0890ab4c5651
    - Insert Aracely Orozco with exact UUID: 8c91136b-0bcc-449b-ab17-08d7aef04579
    - Link to correct auth_user_id values from auth.users table

  2. Verification
    - Ensure employees exist for booking assignment
    - Maintain existing booking references
*/

-- Get auth user IDs for linking
DO $$
DECLARE
    dora_auth_id uuid;
    aracely_auth_id uuid;
BEGIN
    -- Get auth user IDs by email
    SELECT id INTO dora_auth_id 
    FROM auth.users 
    WHERE LOWER(TRIM(email)) = 'dora@doritasnails.com'
    LIMIT 1;
    
    SELECT id INTO aracely_auth_id 
    FROM auth.users 
    WHERE LOWER(TRIM(email)) = 'aracely@doritasnails.com'
    LIMIT 1;
    
    RAISE NOTICE 'Found auth users - Dora: %, Aracely: %', 
        COALESCE(dora_auth_id::text, 'NULL'), 
        COALESCE(aracely_auth_id::text, 'NULL');
    
    -- Insert Dora Alviter with exact UUID
    INSERT INTO employees (id, name, email, role, auth_user_id, created_at, updated_at)
    VALUES (
        '5ecbfa44-2171-4a7f-9445-0890ab4c5651',
        'Dora Alviter',
        'dora@doritasnails.com',
        'admin',
        dora_auth_id,
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        auth_user_id = EXCLUDED.auth_user_id,
        updated_at = now();
    
    -- Insert Aracely Orozco with exact UUID
    INSERT INTO employees (id, name, email, role, auth_user_id, created_at, updated_at)
    VALUES (
        '8c91136b-0bcc-449b-ab17-08d7aef04579',
        'Aracely Orozco',
        'aracely@doritasnails.com',
        'employee',
        aracely_auth_id,
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        auth_user_id = EXCLUDED.auth_user_id,
        updated_at = now();
    
    RAISE NOTICE 'Inserted employees with exact UUIDs:';
    RAISE NOTICE '  Dora Alviter: 5ecbfa44-2171-4a7f-9445-0890ab4c5651';
    RAISE NOTICE '  Aracely Orozco: 8c91136b-0bcc-449b-ab17-08d7aef04579';
    
    -- Verify the employees were inserted correctly
    DECLARE
        verification_record RECORD;
    BEGIN
        FOR verification_record IN
            SELECT id, name, email, auth_user_id
            FROM employees 
            WHERE id IN ('5ecbfa44-2171-4a7f-9445-0890ab4c5651', '8c91136b-0bcc-449b-ab17-08d7aef04579')
            ORDER BY name
        LOOP
            RAISE NOTICE 'Verified employee: % | % | % | auth_user_id: %',
                verification_record.id,
                verification_record.name,
                verification_record.email,
                COALESCE(verification_record.auth_user_id::text, 'NULL');
        END LOOP;
    END;
    
END $$;

-- Final verification query
SELECT 
    id,
    name,
    email,
    role,
    auth_user_id,
    created_at
FROM employees 
WHERE id IN ('5ecbfa44-2171-4a7f-9445-0890ab4c5651', '8c91136b-0bcc-449b-ab17-08d7aef04579')
ORDER BY name;