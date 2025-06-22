import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔔 [UPDATE SETUP INTENT] Received update request')
    
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('❌ [UPDATE SETUP INTENT] Missing Supabase configuration')
      console.error('❌ [UPDATE SETUP INTENT] SUPABASE_URL present:', !!supabaseUrl)
      console.error('❌ [UPDATE SETUP INTENT] SUPABASE_SERVICE_ROLE_KEY present:', !!serviceRoleKey)
      return new Response(
        JSON.stringify({ error: 'Supabase configuration missing' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    console.log('✅ [UPDATE SETUP INTENT] Using SUPABASE_SERVICE_ROLE_KEY for admin client')
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Parse request body
    const { 
      bookingId,
      setupIntentId
    } = await req.json()
    
    console.log('📋 [UPDATE SETUP INTENT] Request data:', {
      bookingId,
      setupIntentId
    })

    // Validate required fields
    if (!bookingId || !setupIntentId) {
      console.error('❌ [UPDATE SETUP INTENT] Missing required fields')
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // First, verify the booking exists
    console.log('🔍 [UPDATE SETUP INTENT] Verifying booking exists:', bookingId)
    const { data: bookingCheck, error: checkError } = await supabaseAdmin
      .from('bookings')
      .select('id')
      .eq('id', bookingId)
      .single()

    if (checkError) {
      console.error('❌ [UPDATE SETUP INTENT] Booking not found:', checkError)
      return new Response(
        JSON.stringify({ error: `Booking not found: ${checkError.message}` }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      )
    }

    console.log('✅ [UPDATE SETUP INTENT] Booking exists:', bookingCheck.id)

    // Update the booking with the setup intent ID using admin privileges
    console.log('📝 [UPDATE SETUP INTENT] Updating booking with admin privileges:', bookingId)
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .update({ 
        stripe_setup_intent_id: setupIntentId,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .select('id, stripe_setup_intent_id')

    if (error) {
      console.error('❌ [UPDATE SETUP INTENT] Error updating booking:', error)
      console.error('❌ [UPDATE SETUP INTENT] Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      return new Response(
        JSON.stringify({ error: `Failed to update booking: ${error.message}` }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    console.log('✅ [UPDATE SETUP INTENT] Booking updated successfully:', data)

    // Verify the update was successful
    const { data: verifyData, error: verifyError } = await supabaseAdmin
      .from('bookings')
      .select('id, stripe_setup_intent_id')
      .eq('id', bookingId)
      .single()

    if (verifyError) {
      console.error('❌ [UPDATE SETUP INTENT] Error verifying update:', verifyError)
    } else {
      console.log('✅ [UPDATE SETUP INTENT] Verification result:', verifyData)
      console.log('✅ [UPDATE SETUP INTENT] SetupIntent ID saved:', verifyData.stripe_setup_intent_id === setupIntentId)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: verifyData || data,
        message: 'Setup intent ID updated successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('❌ [UPDATE SETUP INTENT] Edge function error:', error)
    
    return new Response(
      JSON.stringify({ error: error.message || 'An error occurred while updating setup intent ID' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})