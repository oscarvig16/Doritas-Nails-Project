import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { parse, addHours, subHours, subDays, isEqual, parseISO, format } from "https://esm.sh/date-fns@3.3.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('⏰ [PROCESS-REMINDERS] Processing email reminders');
    
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('❌ [PROCESS-REMINDERS] Missing Supabase configuration');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Supabase configuration is incomplete' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get current date and time in PST/PDT
    const now = new Date();
    // Adjust for PST/PDT (UTC-7 or UTC-8)
    const pstOffset = -7; // This is approximate, should ideally use a proper timezone library
    const pstNow = addHours(now, pstOffset - now.getTimezoneOffset() / 60);
    
    console.log('⏰ [PROCESS-REMINDERS] Current PST/PDT time:', pstNow.toISOString());
    
    // Format current date for database query
    const currentDate = format(pstNow, 'yyyy-MM-dd');
    const tomorrowDate = format(addHours(pstNow, 24), 'yyyy-MM-dd');
    
    console.log('⏰ [PROCESS-REMINDERS] Current date:', currentDate);
    console.log('⏰ [PROCESS-REMINDERS] Tomorrow date:', tomorrowDate);

    // Process 24-hour reminders (for tomorrow's appointments)
    const dayBeforeReminders = await processDayBeforeReminders(supabase, supabaseUrl, supabaseServiceRoleKey, tomorrowDate, pstNow);
    
    // Process 6-hour reminders (for today's appointments)
    const sameDayReminders = await processSameDayReminders(supabase, supabaseUrl, supabaseServiceRoleKey, currentDate, pstNow);
    
    console.log('✅ [PROCESS-REMINDERS] Reminders processed successfully');
    console.log('📊 [PROCESS-REMINDERS] Day before reminders sent:', dayBeforeReminders.sent);
    console.log('📊 [PROCESS-REMINDERS] Day before reminders failed:', dayBeforeReminders.failed);
    console.log('📊 [PROCESS-REMINDERS] Same day reminders sent:', sameDayReminders.sent);
    console.log('📊 [PROCESS-REMINDERS] Same day reminders failed:', sameDayReminders.failed);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        dayBeforeReminders,
        sameDayReminders,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ [PROCESS-REMINDERS] Unexpected error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An unexpected error occurred' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

// Process 24-hour reminders (for tomorrow's appointments)
async function processDayBeforeReminders(supabase: any, supabaseUrl: string, supabaseServiceRoleKey: string, tomorrowDate: string, pstNow: Date) {
  console.log('⏰ [PROCESS-REMINDERS] Processing day before reminders for date:', tomorrowDate);
  
  // Find bookings for tomorrow that haven't received a day_before_reminder yet
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select(`
      id,
      customer_email,
      appointment_date,
      appointment_status
    `)
    .eq('appointment_date', tomorrowDate)
    .neq('appointment_status', 'cancelled')
    .neq('appointment_status', 'completed');

  if (bookingsError) {
    console.error('❌ [PROCESS-REMINDERS] Error fetching day before bookings:', bookingsError);
    return { sent: 0, failed: 0, error: bookingsError.message };
  }

  console.log('📋 [PROCESS-REMINDERS] Found', bookings?.length || 0, 'bookings for tomorrow');
  
  if (!bookings || bookings.length === 0) {
    return { sent: 0, failed: 0 };
  }

  // Check which bookings already have day_before_reminder emails
  const { data: existingLogs, error: logsError } = await supabase
    .from('email_logs')
    .select('booking_id')
    .in('booking_id', bookings.map(b => b.id))
    .eq('email_type', 'day_before_reminder')
    .eq('status', 'sent');

  if (logsError) {
    console.error('❌ [PROCESS-REMINDERS] Error fetching existing email logs:', logsError);
    // Continue anyway, might result in duplicate emails but that's better than no emails
  }

  // Create a set of booking IDs that already have reminders
  const reminderSentBookingIds = new Set(existingLogs?.map(log => log.booking_id) || []);
  
  console.log('📋 [PROCESS-REMINDERS] Found', reminderSentBookingIds.size, 'bookings that already have day before reminders');

  // Filter bookings that need reminders
  const bookingsNeedingReminders = bookings.filter(booking => !reminderSentBookingIds.has(booking.id));
  
  console.log('📋 [PROCESS-REMINDERS] Sending day before reminders to', bookingsNeedingReminders.length, 'bookings');

  // Send reminders
  let sent = 0;
  let failed = 0;

  for (const booking of bookingsNeedingReminders) {
    try {
      console.log('📤 [PROCESS-REMINDERS] Sending day before reminder for booking:', booking.id);
      
      const response = await fetch(`${supabaseUrl}/functions/v1/send-appointment-reminder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceRoleKey}`
        },
        body: JSON.stringify({
          bookingId: booking.id,
          reminderType: 'day_before'
        })
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log('✅ [PROCESS-REMINDERS] Day before reminder sent for booking:', booking.id);
        sent++;
      } else {
        console.error('❌ [PROCESS-REMINDERS] Failed to send day before reminder for booking:', booking.id, result.error);
        failed++;
      }
    } catch (error) {
      console.error('❌ [PROCESS-REMINDERS] Error sending day before reminder for booking:', booking.id, error);
      failed++;
    }
  }

  return { sent, failed };
}

// Process 6-hour reminders (for today's appointments)
async function processSameDayReminders(supabase: any, supabaseUrl: string, supabaseServiceRoleKey: string, currentDate: string, pstNow: Date) {
  console.log('⏰ [PROCESS-REMINDERS] Processing same day reminders for date:', currentDate);
  
  // Find bookings for today that haven't received a same_day_reminder yet
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select(`
      id,
      customer_email,
      appointment_date,
      appointment_time,
      start_time,
      appointment_status
    `)
    .eq('appointment_date', currentDate)
    .neq('appointment_status', 'cancelled')
    .neq('appointment_status', 'completed');

  if (bookingsError) {
    console.error('❌ [PROCESS-REMINDERS] Error fetching same day bookings:', bookingsError);
    return { sent: 0, failed: 0, error: bookingsError.message };
  }

  console.log('📋 [PROCESS-REMINDERS] Found', bookings?.length || 0, 'bookings for today');
  
  if (!bookings || bookings.length === 0) {
    return { sent: 0, failed: 0 };
  }

  // Check which bookings already have same_day_reminder emails
  const { data: existingLogs, error: logsError } = await supabase
    .from('email_logs')
    .select('booking_id')
    .in('booking_id', bookings.map(b => b.id))
    .eq('email_type', 'same_day_reminder')
    .eq('status', 'sent');

  if (logsError) {
    console.error('❌ [PROCESS-REMINDERS] Error fetching existing email logs:', logsError);
    // Continue anyway, might result in duplicate emails but that's better than no emails
  }

  // Create a set of booking IDs that already have reminders
  const reminderSentBookingIds = new Set(existingLogs?.map(log => log.booking_id) || []);
  
  console.log('📋 [PROCESS-REMINDERS] Found', reminderSentBookingIds.size, 'bookings that already have same day reminders');

  // Filter bookings that need reminders and are within the next 6 hours
  const bookingsNeedingReminders = bookings.filter(booking => {
    if (reminderSentBookingIds.has(booking.id)) {
      return false;
    }
    
    // Parse appointment time
    const timeString = booking.start_time || booking.appointment_time;
    if (!timeString) return false;
    
    // Parse time in 12-hour format (e.g., "2:00 PM")
    const [timePart, periodPart] = timeString.split(' ');
    const [hours, minutes] = timePart.split(':').map(Number);
    
    // Convert to 24-hour format
    let hour24 = hours;
    if (periodPart === 'PM' && hours !== 12) hour24 += 12;
    if (periodPart === 'AM' && hours === 12) hour24 = 0;
    
    // Create appointment date object
    const appointmentDate = new Date(pstNow);
    appointmentDate.setHours(hour24, minutes, 0, 0);
    
    // Calculate time difference in hours
    const timeDiffHours = (appointmentDate.getTime() - pstNow.getTime()) / (1000 * 60 * 60);
    
    // Send reminder if appointment is between 6 and 7 hours away
    return timeDiffHours >= 6 && timeDiffHours <= 7;
  });
  
  console.log('📋 [PROCESS-REMINDERS] Sending same day reminders to', bookingsNeedingReminders.length, 'bookings');

  // Send reminders
  let sent = 0;
  let failed = 0;

  for (const booking of bookingsNeedingReminders) {
    try {
      console.log('📤 [PROCESS-REMINDERS] Sending same day reminder for booking:', booking.id);
      
      const response = await fetch(`${supabaseUrl}/functions/v1/send-appointment-reminder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceRoleKey}`
        },
        body: JSON.stringify({
          bookingId: booking.id,
          reminderType: 'same_day'
        })
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log('✅ [PROCESS-REMINDERS] Same day reminder sent for booking:', booking.id);
        sent++;
      } else {
        console.error('❌ [PROCESS-REMINDERS] Failed to send same day reminder for booking:', booking.id, result.error);
        failed++;
      }
    } catch (error) {
      console.error('❌ [PROCESS-REMINDERS] Error sending same day reminder for booking:', booking.id, error);
      failed++;
    }
  }

  return { sent, failed };
}