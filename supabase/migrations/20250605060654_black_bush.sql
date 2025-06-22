/*
  # Add new fields to bookings table

  1. New Fields
    - payment_method (text) - Payment method used (stripe/pay_on_site)
    - no_show_policy_accepted (boolean) - Whether customer accepted no-show policy
    - stripe_customer_id (text) - Stripe customer ID for returning customers
    - updated_at (timestamp) - Last update timestamp
    - status (text) - Booking status (pending/paid/completed/cancelled/no_show)
    - employee_notes (text) - Private notes for employees

  2. Changes
    - Add default values and constraints
    - Add trigger for updated_at
    - Preserve existing data and functionality
*/

-- Add new columns with appropriate defaults and constraints
ALTER TABLE bookings 
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS no_show_policy_accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS employee_notes text;

-- Add check constraint for payment_method
ALTER TABLE bookings
  ADD CONSTRAINT valid_payment_method 
  CHECK (payment_method IN ('stripe', 'pay_on_site'));

-- Add check constraint for status
ALTER TABLE bookings
  ADD CONSTRAINT valid_status 
  CHECK (status IN ('pending', 'paid', 'completed', 'cancelled', 'no_show'));

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update existing records to have consistent status
UPDATE bookings 
SET status = CASE 
  WHEN payment_status = 'paid' THEN 'paid'
  WHEN payment_status = 'pending' THEN 'pending'
  ELSE 'pending'
END
WHERE status = 'pending';