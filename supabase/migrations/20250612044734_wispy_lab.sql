/*
  # Add Time Slot Support for Split Bookings

  1. Schema Changes
    - Add start_time and end_time columns to bookings table
    - These will store calculated time slots for better scheduling

  2. Benefits
    - Clear time slot management for split bookings
    - Better scheduling visualization in employee panel
    - Improved customer experience with precise timing
*/

-- Set timezone to America/Los_Angeles for all operations
SET timezone = 'America/Los_Angeles';

-- Add time slot columns to bookings table
DO $$
BEGIN
  -- Add start_time column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'start_time'
  ) THEN
    ALTER TABLE bookings ADD COLUMN start_time text;
    RAISE NOTICE 'Added start_time column';
  END IF;

  -- Add end_time column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'end_time'
  ) THEN
    ALTER TABLE bookings ADD COLUMN end_time text;
    RAISE NOTICE 'Added end_time column';
  END IF;
END $$;

-- Update existing bookings to populate time slots based on appointment_time and duration
DO $$
DECLARE
    booking_record RECORD;
    start_minutes integer;
    end_minutes integer;
    start_hour integer;
    start_min integer;
    end_hour integer;
    end_min integer;
    period text;
    display_hour integer;
BEGIN
    RAISE NOTICE 'Updating existing bookings with calculated time slots...';
    
    FOR booking_record IN 
        SELECT id, appointment_time, total_duration
        FROM bookings 
        WHERE start_time IS NULL OR end_time IS NULL
    LOOP
        -- Parse appointment_time (e.g., "2:00 PM")
        IF booking_record.appointment_time ~ '^\d{1,2}:\d{2} (AM|PM)$' THEN
            -- Extract components
            period := split_part(booking_record.appointment_time, ' ', 2);
            start_hour := split_part(split_part(booking_record.appointment_time, ' ', 1), ':', 1)::integer;
            start_min := split_part(split_part(booking_record.appointment_time, ' ', 1), ':', 2)::integer;
            
            -- Convert to 24-hour format
            IF period = 'PM' AND start_hour != 12 THEN
                start_hour := start_hour + 12;
            ELSIF period = 'AM' AND start_hour = 12 THEN
                start_hour := 0;
            END IF;
            
            -- Calculate start and end times in minutes
            start_minutes := start_hour * 60 + start_min;
            end_minutes := start_minutes + COALESCE(booking_record.total_duration, 60);
            
            -- Convert back to 12-hour format for start_time
            start_hour := start_minutes / 60;
            start_min := start_minutes % 60;
            
            IF start_hour = 0 THEN
                display_hour := 12;
                period := 'AM';
            ELSIF start_hour < 12 THEN
                display_hour := start_hour;
                period := 'AM';
            ELSIF start_hour = 12 THEN
                display_hour := 12;
                period := 'PM';
            ELSE
                display_hour := start_hour - 12;
                period := 'PM';
            END IF;
            
            -- Convert back to 12-hour format for end_time
            end_hour := end_minutes / 60;
            end_min := end_minutes % 60;
            
            -- Update the booking with calculated time slots
            UPDATE bookings 
            SET 
                start_time = display_hour || ':' || lpad(start_min::text, 2, '0') || ' ' || period,
                end_time = CASE 
                    WHEN end_hour = 0 THEN '12:' || lpad(end_min::text, 2, '0') || ' AM'
                    WHEN end_hour < 12 THEN end_hour || ':' || lpad(end_min::text, 2, '0') || ' AM'
                    WHEN end_hour = 12 THEN '12:' || lpad(end_min::text, 2, '0') || ' PM'
                    ELSE (end_hour - 12) || ':' || lpad(end_min::text, 2, '0') || ' PM'
                END
            WHERE id = booking_record.id;
            
        ELSE
            -- For invalid time formats, just copy appointment_time to start_time
            UPDATE bookings 
            SET 
                start_time = appointment_time,
                end_time = appointment_time
            WHERE id = booking_record.id;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Time slot calculation completed for existing bookings';
END $$;

-- Verification
DO $$
DECLARE
    verification_record RECORD;
    total_bookings integer;
    updated_bookings integer;
BEGIN
    RAISE NOTICE '=== TIME SLOT MIGRATION VERIFICATION ===';
    
    -- Count bookings
    SELECT COUNT(*) INTO total_bookings FROM bookings;
    SELECT COUNT(*) INTO updated_bookings FROM bookings WHERE start_time IS NOT NULL AND end_time IS NOT NULL;
    
    RAISE NOTICE 'Migration summary:';
    RAISE NOTICE '  Total bookings: %', total_bookings;
    RAISE NOTICE '  Bookings with time slots: %', updated_bookings;
    
    -- Show sample bookings with time slots
    RAISE NOTICE 'Sample bookings with time slots:';
    FOR verification_record IN
        SELECT 
            id,
            customer_first_name || ' ' || customer_last_name as customer_name,
            appointment_date,
            appointment_time,
            start_time,
            end_time,
            total_duration
        FROM bookings 
        WHERE start_time IS NOT NULL AND end_time IS NOT NULL
        ORDER BY appointment_date DESC
        LIMIT 5
    LOOP
        RAISE NOTICE '  % | % | % | Original: % | Slot: % - % | Duration: %min',
            verification_record.id,
            verification_record.customer_name,
            verification_record.appointment_date,
            verification_record.appointment_time,
            verification_record.start_time,
            verification_record.end_time,
            verification_record.total_duration;
    END LOOP;
    
    RAISE NOTICE '✅ Time slot migration completed successfully';
    
END $$;