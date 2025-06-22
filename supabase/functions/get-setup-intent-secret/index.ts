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
    console.log('🔔 [GET SETUP SECRET] Received request to get setup intent client secret')
    
    // Initialize Stripe with secret key
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      console.error('❌ [GET SETUP SECRET] STRIPE_SECRET_KEY not configured')
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
    const { setupIntentId } = await req.json()
    
    console.log('📋 [GET SETUP SECRET] Request data:', {
      setupIntentId
    })

    // Validate required fields
    if (!setupIntentId) {
      console.error('❌ [GET SETUP SECRET] Missing required fields')
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Retrieve the SetupIntent
    console.log('🔍 [GET SETUP SECRET] Retrieving setup intent:', setupIntentId)
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId)
    
    if (!setupIntent || !setupIntent.client_secret) {
      console.error('❌ [GET SETUP SECRET] Setup intent not found or missing client secret')
      return new Response(
        JSON.stringify({ error: 'Setup intent not found or missing client secret' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      )
    }

    // Check if the setup intent is expired or already used
    const now = Math.floor(Date.now() / 1000); // Current time in seconds
    const isExpired = setupIntent.created + (24 * 60 * 60) < now; // 24 hours expiry
    
    if (isExpired) {
      console.error('❌ [GET SETUP SECRET] Setup intent is expired')
      return new Response(
        JSON.stringify({ error: 'Setup intent is expired', expired: true }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }
    
    if (setupIntent.status === 'succeeded' || setupIntent.status === 'canceled') {
      console.error('❌ [GET SETUP SECRET] Setup intent is already used or canceled')
      return new Response(
        JSON.stringify({ 
          error: `Setup intent is already ${setupIntent.status}`, 
          status: setupIntent.status 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    console.log('✅ [GET SETUP SECRET] Retrieved valid setup intent:', {
      id: setupIntent.id,
      status: setupIntent.status,
      created: new Date(setupIntent.created * 1000).toISOString(),
      clientSecret: setupIntent.client_secret.substring(0, 10) + '...',
      customerId: setupIntent.customer
    })

    // Return the client secret
    return new Response(
      JSON.stringify({ 
        clientSecret: setupIntent.client_secret,
        setupIntentId: setupIntent.id,
        customerId: setupIntent.customer,
        status: setupIntent.status,
        created: new Date(setupIntent.created * 1000).toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('❌ [GET SETUP SECRET] Edge function error:', error)
    
    return new Response(
      JSON.stringify({ error: error.message || 'An error occurred while retrieving setup intent' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})