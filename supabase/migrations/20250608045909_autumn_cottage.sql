/*
  # Fix booking_updates foreign key constraint

  1. Changes
    - Drop existing booking_updates_booking_id_fkey constraint
    - Recreate with ON DELETE CASCADE to allow safe booking deletion
    - Ensures booking_updates are automatically cleaned up when bookings are deleted

  2. Security
    - No changes to RLS policies
    - Maintains data integrity while allowing proper cleanup
*/

-- Drop the current foreign key constraint
ALTER TABLE booking_updates
DROP CONSTRAINT IF EXISTS booking_updates_booking_id_fkey;

-- Recreate the foreign key constraint with ON DELETE CASCADE
ALTER TABLE booking_updates
ADD CONSTRAINT booking_updates_booking_id_fkey
FOREIGN KEY (booking_id)
REFERENCES bookings(id)
ON DELETE CASCADE;

-- Verify the constraint was created correctly
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints tc
        JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
        WHERE tc.table_name = 'booking_updates' 
        AND tc.constraint_name = 'booking_updates_booking_id_fkey'
        AND rc.delete_rule = 'CASCADE'
    ) THEN
        RAISE NOTICE 'SUCCESS: booking_updates foreign key constraint updated with ON DELETE CASCADE';
    ELSE
        RAISE NOTICE 'ERROR: Failed to update foreign key constraint';
    END IF;
END $$;