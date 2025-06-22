import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@13.10.0'
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
    console.log('🔔 [CHARGE NO-SHOW] Received charge no-show fee request')
    
    // Initialize Stripe with secret key
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      console.error('❌ [CHARGE NO-SHOW] STRIPE_SECRET_KEY not configured')
      return new Response(
        JSON.stringify({ error: 'Stripe secret key not configured' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }
    
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('❌ [CHARGE NO-SHOW] Missing Supabase configuration')
      console.error('❌ [CHARGE NO-SHOW] SUPABASE_URL present:', !!supabaseUrl)
      console.error('❌ [CHARGE NO-SHOW] SUPABASE_SERVICE_ROLE_KEY present:', !!supabaseServiceRoleKey)
      return new Response(
        JSON.stringify({ error: 'Supabase configuration missing' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    console.log('✅ [CHARGE NO-SHOW] Using SUPABASE_SERVICE_ROLE_KEY for admin client')
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Parse request body
    const { 
      bookingId,
      employeeId,
      notes
    } = await req.json()
    
    console.log('📋 [CHARGE NO-SHOW] Request data:', {
      bookingId,
      employeeId
    })

    // Validate required fields
    if (!bookingId || !employeeId) {
      console.error('❌ [CHARGE NO-SHOW] Missing required fields')
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Get booking details
    console.log('🔍 [CHARGE NO-SHOW] Fetching booking details:', bookingId)
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      console.error('❌ [CHARGE NO-SHOW] Error fetching booking:', bookingError)
      return new Response(
        JSON.stringify({ error: 'Booking not found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      )
    }

    // Verify booking is a no-show and has payment method
    if (booking.appointment_status !== 'no_show') {
      console.error('❌ [CHARGE NO-SHOW] Booking is not marked as no-show:', booking.appointment_status)
      return new Response(
        JSON.stringify({ error: 'Booking is not marked as no-show' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    if (!booking.stripe_customer_id || !booking.stripe_setup_intent_id) {
      console.error('❌ [CHARGE NO-SHOW] Booking has no payment method stored')
      console.error('❌ [CHARGE NO-SHOW] stripe_customer_id:', booking.stripe_customer_id)
      console.error('❌ [CHARGE NO-SHOW] stripe_setup_intent_id:', booking.stripe_setup_intent_id)
      return new Response(
        JSON.stringify({ error: 'No payment method available for this booking' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Get the setup intent to retrieve the payment method
    console.log('🔍 [CHARGE NO-SHOW] Retrieving setup intent:', booking.stripe_setup_intent_id)
    const setupIntent = await stripe.setupIntents.retrieve(booking.stripe_setup_intent_id)
    
    if (!setupIntent.payment_method) {
      console.error('❌ [CHARGE NO-SHOW] No payment method attached to setup intent')
      return new Response(
        JSON.stringify({ error: 'No payment method available' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Create a payment intent for the no-show fee
    console.log('💰 [CHARGE NO-SHOW] Creating payment intent for no-show fee')
    const noShowFee = 4000 // $40.00 in cents
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: noShowFee,
      currency: 'usd',
      customer: booking.stripe_customer_id,
      payment_method: setupIntent.payment_method as string,
      off_session: true,
      confirm: true,
      metadata: {
        bookingId: booking.id,
        appointmentDate: booking.appointment_date,
        appointmentTime: booking.appointment_time,
        customerEmail: booking.customer_email,
        feeType: 'no_show',
        chargedBy: employeeId
      },
      description: `No-show fee for appointment on ${booking.appointment_date} at ${booking.appointment_time}`
    })

    console.log('✅ [CHARGE NO-SHOW] Payment intent created:', paymentIntent.id)
    console.log('💳 [CHARGE NO-SHOW] Payment status:', paymentIntent.status)

    // Update booking payment status
    console.log('📝 [CHARGE NO-SHOW] Updating booking payment status')
    const { error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({
        payment_status: 'paid',
        updated_at: new Date().toISOString(),
        last_updated_by: employeeId,
        employee_notes: (booking.employee_notes ? booking.employee_notes + '\n' : '') + 
          `No-show fee charged: $40.00 on ${new Date().toLocaleDateString()}` + 
          (notes ? ` - Note: ${notes}` : '')
      })
      .eq('id', bookingId)
    
    if (updateError) {
      console.error('❌ [CHARGE NO-SHOW] Error updating booking:', updateError)
      // Continue anyway since the payment was processed
    }

    // Create audit log entry
    console.log('📝 [CHARGE NO-SHOW] Creating audit log entry')
    const { error: logError } = await supabaseAdmin
      .from('booking_updates')
      .insert({
        booking_id: bookingId,
        employee_id: employeeId,
        status_type: 'payment',
        previous_status: booking.appointment_status,
        new_status: booking.appointment_status, // No change to appointment status
        payment_previous_status: booking.payment_status,
        payment_new_status: 'paid',
        notes: `No-show fee of $40.00 charged automatically.${notes ? ` Note: ${notes}` : ''}`
      })
    
    if (logError) {
      console.error('❌ [CHARGE NO-SHOW] Error creating audit log:', logError)
      // Continue anyway since the payment was processed and booking updated
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        paymentIntentId: paymentIntent.id,
        paymentStatus: paymentIntent.status,
        amount: noShowFee / 100, // Convert back to dollars for display
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('❌ [CHARGE NO-SHOW] Edge function error:', error)
    
    // Handle Stripe card errors specifically
    let errorMessage = error.message || 'An error occurred while charging the no-show fee'
    let errorCode = 'unknown_error'
    let statusCode = 500
    
    if (error.type === 'StripeCardError') {
      errorMessage = `Card error: ${error.message}`
      errorCode = error.code || 'card_error'
      statusCode = 400
    } else if (error.type === 'StripeInvalidRequestError') {
      errorMessage = `Invalid request: ${error.message}`
      errorCode = 'invalid_request'
      statusCode = 400
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        errorCode,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: statusCode,
      }
    )
  }
})