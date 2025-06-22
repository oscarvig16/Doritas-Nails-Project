import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // This function is designed to be triggered by a cron job
  // It will process all pending email reminders
  
  try {
    console.log('⏰ [SCHEDULE-REMINDERS] Cron job triggered');
    
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('❌ [SCHEDULE-REMINDERS] Missing Supabase configuration');
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

    // Call the process-email-reminders function
    console.log('🚀 [SCHEDULE-REMINDERS] Calling process-email-reminders function');
    
    const response = await fetch(`${supabaseUrl}/functions/v1/process-email-reminders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceRoleKey}`
      },
      body: JSON.stringify({})
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('❌ [SCHEDULE-REMINDERS] Error processing reminders:', result);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.error || 'Failed to process reminders' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }

    console.log('✅ [SCHEDULE-REMINDERS] Reminders processed successfully');
    console.log('📊 [SCHEDULE-REMINDERS] Results:', result);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        result,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ [SCHEDULE-REMINDERS] Unexpected error:', error);
    
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