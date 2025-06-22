import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface BookingConfirmationRequest {
  bookingId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('📧 [BOOKING-CONFIRMATION] Request received');
    
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('❌ [BOOKING-CONFIRMATION] Missing Supabase configuration');
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

    // Parse request body
    const { bookingId }: BookingConfirmationRequest = await req.json();
    
    console.log('📧 [BOOKING-CONFIRMATION] Request data:', {
      bookingId
    });

    // Validate required fields
    if (!bookingId) {
      console.error('❌ [BOOKING-CONFIRMATION] Missing booking ID');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Booking ID is required' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Fetch booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        customer_first_name,
        customer_last_name,
        customer_email,
        appointment_date,
        appointment_time,
        start_time,
        end_time,
        services,
        technicians,
        total_price,
        total_duration,
        payment_status,
        appointment_status,
        payment_method,
        employee_id
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('❌ [BOOKING-CONFIRMATION] Error fetching booking:', bookingError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Booking not found' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      );
    }

    console.log('✅ [BOOKING-CONFIRMATION] Booking found:', booking.id);

    // Get technician name
    let technicianName = 'Your assigned technician';
    if (booking.technicians) {
      if (booking.technicians.type === 'single' && booking.technicians.manicureTech?.name) {
        technicianName = booking.technicians.manicureTech.name;
      } else if (booking.technicians.type === 'auto') {
        technicianName = 'Your assigned technician';
      } else if (booking.technicians.type === 'split') {
        const manicureTech = booking.technicians.manicureTech?.name;
        const pedicureTech = booking.technicians.pedicureTech?.name;
        
        if (manicureTech && pedicureTech) {
          technicianName = `${manicureTech} (Manicure) and ${pedicureTech} (Pedicure)`;
        } else if (manicureTech) {
          technicianName = `${manicureTech} (Manicure)`;
        } else if (pedicureTech) {
          technicianName = `${pedicureTech} (Pedicure)`;
        }
      }
    }

    // Format services list
    const servicesList = booking.services.map((service: any) => {
      let serviceText = service.title;
      if (service.options) {
        serviceText += ` (${service.options.type}: ${service.options.value})`;
      }
      return serviceText;
    }).join('<br>');

    // Format time slot
    const timeSlot = booking.start_time && booking.end_time 
      ? `${booking.start_time} - ${booking.end_time}`
      : booking.appointment_time;

    // Create email HTML content
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Confirmation</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #7B4B94;
            color: white;
            padding: 20px;
            text-align: center;
          }
          .content {
            padding: 20px;
            background-color: #f9f9f9;
          }
          .booking-details {
            background-color: white;
            border-radius: 5px;
            padding: 15px;
            margin-bottom: 20px;
          }
          .footer {
            text-align: center;
            padding: 20px;
            font-size: 12px;
            color: #666;
          }
          h1, h2, h3 {
            color: #7B4B94;
          }
          .btn {
            display: inline-block;
            background-color: #7B4B94;
            color: white;
            text-decoration: none;
            padding: 10px 20px;
            border-radius: 5px;
            margin-top: 20px;
          }
          .location {
            margin-top: 20px;
            padding: 15px;
            background-color: #f0f0f0;
            border-radius: 5px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Booking Confirmation</h1>
          </div>
          <div class="content">
            <p>Dear ${booking.customer_first_name},</p>
            <p>Thank you for booking with Dorita's Nails Spa. Your appointment has been confirmed!</p>
            
            <div class="booking-details">
              <h3>Appointment Details</h3>
              <p><strong>Date:</strong> ${booking.appointment_date}</p>
              <p><strong>Time:</strong> ${timeSlot} (Pacific Time)</p>
              <p><strong>Technician:</strong> ${technicianName}</p>
              <p><strong>Services:</strong><br>${servicesList}</p>
              <p><strong>Total Duration:</strong> ${booking.total_duration} minutes</p>
              <p><strong>Total Price:</strong> $${booking.total_price}</p>
              <p><strong>Payment Method:</strong> ${booking.payment_method === 'pay_on_site' ? 'Pay on Site' : 'Card Payment'}</p>
            </div>
            
            <div class="location">
              <h3>Salon Location</h3>
              <p>202 N Riverside Ave Suite C<br>Rialto, CA 92376</p>
              <p><strong>Phone:</strong> (909) 838-7363</p>
              <a href="https://maps.google.com/?q=202+N+Riverside+Ave+Suite+C,+Rialto,+CA+92376" class="btn">Get Directions</a>
            </div>
            
            <p>If you need to cancel or reschedule your appointment, please contact us at least 4 hours in advance to avoid a no-show fee.</p>
            
            <p>We look forward to seeing you soon!</p>
            <p>Warm regards,<br>Dorita's Nails Spa Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Dorita's Nails Spa. All rights reserved.</p>
            <p>202 N Riverside Ave Suite C, Rialto, CA 92376 | (909) 838-7363</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email using the send-email function
    console.log('📤 [BOOKING-CONFIRMATION] Sending confirmation email to:', booking.customer_email);
    
    const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceRoleKey}`
      },
      body: JSON.stringify({
        to: booking.customer_email,
        subject: 'Your Appointment at Dorita\'s Nails Spa is Confirmed',
        html: emailHtml,
        bookingId: booking.id,
        emailType: 'booking_confirmation'
      })
    });

    const emailResult = await emailResponse.json();
    
    if (!emailResponse.ok) {
      console.error('❌ [BOOKING-CONFIRMATION] Error sending email:', emailResult);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: emailResult.error || 'Failed to send confirmation email' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    console.log('✅ [BOOKING-CONFIRMATION] Email sent successfully');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Booking confirmation email sent successfully' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ [BOOKING-CONFIRMATION] Unexpected error:', error);
    
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