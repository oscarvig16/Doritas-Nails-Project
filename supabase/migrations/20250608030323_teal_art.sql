/*
  # Update employees table with correct test entries

  1. Updates
    - Ensures correct employee entries exist for testing
    - Uses UPSERT to avoid duplicates
    - Sets proper names, emails, and roles
    - Uses gen_random_uuid() for new entries

  2. Security
    - No changes to RLS policies
    - Only updates employee data for testing alignment
*/

-- Update or insert the correct employee entries for testing
INSERT INTO employees (id, email, name, role, created_at, updated_at, auth_user_id) VALUES
  (gen_random_uuid(), 'dora@doritasnails.com', 'Dora Alviter', 'admin', now(), now(), NULL),
  (gen_random_uuid(), 'aracely@doritasnails.com', 'Aracely Orozco', 'employee', now(), now(), NULL)
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  updated_at = now();

-- Clean up any duplicate entries that might exist
WITH ranked_employees AS (
  SELECT id, email, name, role,
         ROW_NUMBER() OVER (PARTITION BY email ORDER BY 
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