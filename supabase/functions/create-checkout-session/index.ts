import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@13.10.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

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
    console.log('🔔 [CHECKOUT] Received checkout session request (no booking creation)')
    
    const { 
      services, 
      technicians, 
      date, 
      appointmentDate,
      time, 
      startTime,
      endTime,
      customer, 
      totalAmount, 
      totalDuration,
      timezone,
      paymentMethod
    } = await req.json()
    
    console.log('📋 [CHECKOUT] Request data:', {
      date,
      time,
      customer: customer?.email,
      totalAmount,
      timezone,
      paymentMethod,
      servicesCount: services?.length || 0,
      technicianType: technicians?.type
    })

    // Validate required fields
    if (!totalAmount || !customer?.email || !services || !technicians) {
      console.error('❌ [CHECKOUT] Missing required fields')
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Get frontend URL from environment variable
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://doritasnailspa.com'
    console.log('🌐 [CHECKOUT] Using frontend URL:', frontendUrl)

    // Create appointment description with timezone info
    const appointmentDescription = `Appointment on ${date} at ${time} (${timezone || 'America/Los_Angeles'})`
    console.log('📝 [CHECKOUT] Description:', appointmentDescription)

    // Create comprehensive metadata for webhook booking creation
    const sessionMetadata = {
      // Customer information
      customerFirstName: customer.firstName,
      customerLastName: customer.lastName,
      customerEmail: customer.email,
      
      // Appointment details
      appointmentDate: appointmentDate,
      appointmentTime: time,
      startTime: startTime,
      endTime: endTime,
      timezone: timezone || 'America/Los_Angeles',
      
      // Services and technicians
      services: JSON.stringify(services),
      technicians: JSON.stringify(technicians),
      
      // Financial details
      totalAmount: totalAmount.toString(),
      totalDuration: totalDuration.toString(),
      paymentMethod: paymentMethod || 'stripe',
      
      // Flags
      noShowPolicyAccepted: 'true',
      createdByWebhook: 'true'
    }

    // Create Stripe checkout session
    console.log('💳 [CHECKOUT] Creating Stripe checkout session with metadata...')
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Nail Services Booking',
            description: appointmentDescription,
          },
          unit_amount: totalAmount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${frontendUrl}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/booking-canceled`,
      metadata: sessionMetadata,
    })

    console.log('✅ [CHECKOUT] Stripe session created:', {
      id: session.id,
      url: session.url,
      success_url: session.success_url,
      cancel_url: session.cancel_url
    })

    return new Response(
      JSON.stringify({ id: session.id, url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('❌ [CHECKOUT] Edge function error:', error)
    
    return new Response(
      JSON.stringify({ error: error.message || 'An error occurred during checkout' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})