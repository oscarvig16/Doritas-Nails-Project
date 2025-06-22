import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  bookingId?: string;
  emailType: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('📧 [SEND-EMAIL] Email request received');
    
    // Get SMTP configuration from environment variables
    const smtpHost = Deno.env.get('SMTP_HOST');
    const smtpPort = parseInt(Deno.env.get('SMTP_PORT') || '587');
    const smtpUser = Deno.env.get('SMTP_USER');
    const smtpPass = Deno.env.get('SMTP_PASS');
    const emailSender = Deno.env.get('EMAIL_SENDER');
    
    // Validate SMTP configuration
    if (!smtpHost || !smtpUser || !smtpPass || !emailSender) {
      console.error('❌ [SEND-EMAIL] Missing SMTP configuration');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'SMTP configuration is incomplete' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('❌ [SEND-EMAIL] Missing Supabase configuration');
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
    const { to, subject, html, bookingId, emailType }: EmailRequest = await req.json();
    
    console.log('📧 [SEND-EMAIL] Request data:', {
      to,
      subject,
      emailType,
      bookingId: bookingId || 'N/A',
      htmlLength: html?.length || 0
    });

    // Validate required fields
    if (!to || !subject || !html || !emailType) {
      console.error('❌ [SEND-EMAIL] Missing required fields');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Ensure email_logs table exists
    try {
      await supabase.rpc('create_email_logs_table');
      console.log('✅ [SEND-EMAIL] Email logs table exists or was created');
    } catch (tableError) {
      console.error('⚠️ [SEND-EMAIL] Error ensuring email_logs table:', tableError);
      // Continue anyway, as this is not critical
    }

    // Initialize SMTP client
    console.log('🔌 [SEND-EMAIL] Connecting to SMTP server:', smtpHost);
    const client = new SmtpClient();
    
    try {
      await client.connectTLS({
        hostname: smtpHost,
        port: smtpPort,
        username: smtpUser,
        password: smtpPass,
      });

      // Send email
      console.log('📤 [SEND-EMAIL] Sending email to:', to);
      await client.send({
        from: emailSender,
        to: to,
        subject: subject,
        content: html,
        html: html,
      });

      await client.close();
      console.log('✅ [SEND-EMAIL] Email sent successfully');

      // Log successful email
      if (bookingId) {
        const { error: logError } = await supabase
          .from('email_logs')
          .insert({
            booking_id: bookingId,
            recipient: to,
            subject: subject,
            email_type: emailType,
            status: 'sent',
            sent_at: new Date().toISOString()
          });

        if (logError) {
          console.error('⚠️ [SEND-EMAIL] Error logging email:', logError);
        } else {
          console.log('✅ [SEND-EMAIL] Email logged successfully');
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Email sent successfully' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } catch (emailError) {
      console.error('❌ [SEND-EMAIL] Error sending email:', emailError);
      
      // Log failed email
      if (bookingId) {
        const { error: logError } = await supabase
          .from('email_logs')
          .insert({
            booking_id: bookingId,
            recipient: to,
            subject: subject,
            email_type: emailType,
            status: 'failed',
            error_message: emailError.message || 'Unknown error',
            sent_at: new Date().toISOString()
          });

        if (logError) {
          console.error('⚠️ [SEND-EMAIL] Error logging failed email:', logError);
        } else {
          console.log('✅ [SEND-EMAIL] Failed email logged successfully');
        }
      }

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: emailError.message || 'Failed to send email' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  } catch (error) {
    console.error('❌ [SEND-EMAIL] Unexpected error:', error);
    
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