import { supabase } from '../lib/supabase';

/**
 * Sends a booking confirmation email to the customer
 * @param bookingId The ID of the booking to send confirmation for
 * @returns Promise resolving to success status
 */
export const sendBookingConfirmationEmail = async (bookingId: string): Promise<boolean> => {
  console.log('📧 [CLIENT] Sending booking confirmation email for booking:', bookingId);
  
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-booking-confirmation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        bookingId
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ [CLIENT] Error sending booking confirmation email:', data);
      return false;
    }

    console.log('✅ [CLIENT] Booking confirmation email sent successfully');
    return true;
  } catch (error) {
    console.error('❌ [CLIENT] Error in sendBookingConfirmationEmail:', error);
    return false;
  }
};

/**
 * Gets email logs for a specific booking
 * @param bookingId The ID of the booking to get email logs for
 * @returns Promise resolving to email logs
 */
export const getEmailLogs = async (bookingId: string) => {
  console.log('🔍 [CLIENT] Getting email logs for booking:', bookingId);
  
  try {
    const { data, error } = await supabase
      .from('email_logs')
      .select('*')
      .eq('booking_id', bookingId)
      .order('sent_at', { ascending: false });

    if (error) {
      console.error('❌ [CLIENT] Error fetching email logs:', error);
      throw error;
    }

    console.log('✅ [CLIENT] Retrieved', data?.length || 0, 'email logs');
    return data || [];
  } catch (error) {
    console.error('❌ [CLIENT] Error in getEmailLogs:', error);
    throw error;
  }
};

/**
 * Manually sends a reminder email for a booking
 * @param bookingId The ID of the booking to send reminder for
 * @param reminderType The type of reminder to send (day_before or same_day)
 * @returns Promise resolving to success status
 */
export const sendManualReminderEmail = async (
  bookingId: string, 
  reminderType: 'day_before' | 'same_day'
): Promise<boolean> => {
  console.log('📧 [CLIENT] Sending manual reminder email for booking:', bookingId);
  console.log('📧 [CLIENT] Reminder type:', reminderType);
  
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-appointment-reminder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        bookingId,
        reminderType
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ [CLIENT] Error sending manual reminder email:', data);
      return false;
    }

    console.log('✅ [CLIENT] Manual reminder email sent successfully');
    return true;
  } catch (error) {
    console.error('❌ [CLIENT] Error in sendManualReminderEmail:', error);
    return false;
  }
};