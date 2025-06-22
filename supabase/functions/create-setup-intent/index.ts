import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@13.10.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🔔 [SETUP INTENT] Received setup intent request')
    
    // Initialize Stripe with secret key
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      console.error('❌ [SETUP INTENT] STRIPE_SECRET_KEY not configured')
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

    // Parse request body
    const { 
      customerEmail,
      customerFirstName,
      customerLastName,
      appointmentDate,
      appointmentTime,
      services,
      technicians,
      totalAmount,
      totalDuration
    } = await req.json()
    
    console.log('📋 [SETUP INTENT] Request data:', {
      customerEmail,
      appointmentDate,
      appointmentTime,
      servicesCount: services?.length || 0,
      technicianType: technicians?.type
    })

    // Validate required fields
    if (!customerEmail) {
      console.error('❌ [SETUP INTENT] Missing required fields')
      return new Response(
        JSON.stringify({ error: 'Customer email is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Step 1: Check if customer already exists
    console.log('🔍 [SETUP INTENT] Searching for existing customer with email:', customerEmail)
    const customerSearch = await stripe.customers.search({
      query: `email:'${customerEmail}'`,
      limit: 1
    })
    
    let customer
    
    if (customerSearch.data.length > 0) {
      // Use existing customer
      customer = customerSearch.data[0]
      console.log('✅ [SETUP INTENT] Found existing customer:', customer.id)
    } else {
      // Create new customer
      console.log('👤 [SETUP INTENT] Creating new Stripe customer for:', customerEmail)
      customer = await stripe.customers.create({
        email: customerEmail,
        name: `${customerFirstName} ${customerLastName}`,
        metadata: {
          source: 'pay_on_site_booking',
          appointmentDate,
          appointmentTime,
          createdAt: new Date().toISOString()
        }
      })
      console.log('✅ [SETUP INTENT] Created new customer:', customer.id)
    }

    // Step 2: Create a SetupIntent with the customer
    console.log('🧪 [SETUP INTENT] Creating SetupIntent for customer:', customer.id)
    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ['card'],
      usage: 'off_session', // Important for future charges without customer
      metadata: {
        appointmentDate,
        appointmentTime,
        customerEmail,
        customerName: `${customerFirstName} ${customerLastName}`,
        noShowFee: '40.00', // Store the no-show fee amount in metadata
        createdAt: new Date().toISOString()
      }
    })

    console.log('✅ [SETUP INTENT] Setup intent created:', setupIntent.id)
    console.log('✅ [SETUP INTENT] Customer ID attached:', setupIntent.customer)
    console.log('🔐 [SETUP INTENT] Returning clientSecret:', setupIntent.client_secret?.substring(0, 12) + '...')

    // Return the client secret for the frontend to complete the setup
    return new Response(
      JSON.stringify({ 
        clientSecret: setupIntent.client_secret,
        setupIntentId: setupIntent.id,
        customerId: customer.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('❌ [SETUP INTENT] Edge function error:', error)
    
    return new Response(
      JSON.stringify({ error: error.message || 'An error occurred during setup intent creation' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})