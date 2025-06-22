import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

// This function is designed to be triggered by a cron job
// It will process all pending email reminders

serve(async (req) => {
  try {
    console.log('⏰ [CRON-EMAIL-REMINDERS] Cron job triggered');
    
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('❌ [CRON-EMAIL-REMINDERS] Missing Supabase configuration');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Supabase configuration is incomplete' 
        }),
        { status: 500 }
      );
    }

    // Call the process-email-reminders function
    console.log('🚀 [CRON-EMAIL-REMINDERS] Calling process-email-reminders function');
    
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
      console.error('❌ [CRON-EMAIL-REMINDERS] Error processing reminders:', result);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.error || 'Failed to process reminders' 
        }),
        { status: 500 }
      );
    }

    console.log('✅ [CRON-EMAIL-REMINDERS] Reminders processed successfully');
    console.log('📊 [CRON-EMAIL-REMINDERS] Results:', result);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        result,
        timestamp: new Date().toISOString()
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ [CRON-EMAIL-REMINDERS] Unexpected error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An unexpected error occurred' 
      }),
      { status: 500 }
    );
  }
});