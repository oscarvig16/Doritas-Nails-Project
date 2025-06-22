import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import Stripe from 'https://esm.sh/stripe@13.10.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔔 [WEBHOOK] Stripe webhook received')
    console.log('🔔 [WEBHOOK] Request method:', req.method)
    console.log('🔔 [WEBHOOK] Request headers:', Object.fromEntries(req.headers.entries()))
    
    // Get frontend URL from environment variable
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://doritasnailspa.com'
    console.log('🌐 [WEBHOOK] Using frontend URL:', frontendUrl)
    
    // Initialize Stripe with secret key
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      console.error('❌ [WEBHOOK] STRIPE_SECRET_KEY not configured')
      return new Response('Stripe secret key not configured', { status: 500 })
    }
    
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // Get webhook secret from environment
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    console.log('🔐 [WEBHOOK] Webhook secret configured:', !!webhookSecret)
    console.log('🔐 [WEBHOOK] Webhook secret prefix:', webhookSecret?.substring(0, 10) + '...')
    
    if (!webhookSecret) {
      console.error('❌ [WEBHOOK] STRIPE_WEBHOOK_SECRET not configured')
      return new Response('Webhook secret not configured', { status: 500 })
    }

    // Get the raw body and signature
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    console.log('📝 [WEBHOOK] Body length:', body.length)
    console.log('🔐 [WEBHOOK] Signature present:', !!signature)
    console.log('🔐 [WEBHOOK] Signature preview:', signature?.substring(0, 50) + '...')

    if (!signature) {
      console.error('❌ [WEBHOOK] No Stripe signature found in headers')
      return new Response('No signature', { status: 400 })
    }

    console.log('🔐 [WEBHOOK] Verifying webhook signature asynchronously...')

    // ✅ Use constructEventAsync for Deno Edge runtime
    let event: Stripe.Event
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
      console.log('✅ [WEBHOOK] Webhook signature verified successfully with constructEventAsync')
    } catch (err) {
      console.error('❌ [WEBHOOK] Webhook signature verification failed:', err.message)
      console.error('❌ [WEBHOOK] Error details:', {
        name: err.name,
        type: err.type,
        message: err.message
      })
      return new Response(`Webhook signature verification failed: ${err.message}`, { status: 400 })
    }

    console.log('📨 [WEBHOOK] Webhook event type:', event.type)
    console.log('📨 [WEBHOOK] Event ID:', event.id)

    // Handle checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      console.log('💳 [WEBHOOK] Processing checkout.session.completed')
      console.log('💳 [WEBHOOK] Session ID:', session.id)
      console.log('💳 [WEBHOOK] Payment status:', session.payment_status)
      console.log('💳 [WEBHOOK] Amount total:', session.amount_total)
      console.log('💳 [WEBHOOK] Currency:', session.currency)
      console.log('💳 [WEBHOOK] Customer email:', session.customer_details?.email)
      
      // DEBUG: Log session metadata
      console.log('[DEBUG] Stripe session metadata:', JSON.stringify(session.metadata, null, 2))

      // Initialize Supabase client with CORRECT environment variable
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      
      // DEBUG: Log service key being used
      console.log('[DEBUG] Service key used:', supabaseServiceRoleKey?.substring(0, 20) + '...')
      
      console.log('🔧 [WEBHOOK] Supabase configuration check:')
      console.log('  - SUPABASE_URL present:', !!supabaseUrl)
      console.log('  - SUPABASE_SERVICE_ROLE_KEY present:', !!supabaseServiceRoleKey)
      console.log('  - SUPABASE_SERVICE_ROLE_KEY length:', supabaseServiceRoleKey?.length || 0)
      
      if (!supabaseUrl || !supabaseServiceRoleKey) {
        console.error('❌ [WEBHOOK] Missing Supabase configuration')
        console.error('❌ [WEBHOOK] SUPABASE_URL present:', !!supabaseUrl)
        console.error('❌ [WEBHOOK] SUPABASE_SERVICE_ROLE_KEY present:', !!supabaseServiceRoleKey)
        return new Response('Missing Supabase configuration', { status: 500 })
      }

      console.log('🔧 [WEBHOOK] Creating Supabase admin client...')
      const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      })

      // Check if payment was successful
      if (session.payment_status === 'paid') {
        console.log('✅ [WEBHOOK] Payment successful, creating booking...')

        try {
          // Parse metadata from session
          const metadata = session.metadata
          
          if (!metadata) {
            console.error('❌ [WEBHOOK] No metadata found in session')
            return new Response('No metadata in session', { status: 400 })
          }
          
          // Parse services and technicians from JSON strings
          let services = []
          let technicians = { type: 'auto' }
          
          try {
            if (metadata.services) {
              services = JSON.parse(metadata.services)
            }
            
            if (metadata.technicians) {
              technicians = JSON.parse(metadata.technicians)
            }
          } catch (parseError) {
            console.error('❌ [WEBHOOK] Error parsing JSON metadata:', parseError)
            console.error('❌ [WEBHOOK] Services string:', metadata.services)
            console.error('❌ [WEBHOOK] Technicians string:', metadata.technicians)
          }
          
          console.log('📋 [WEBHOOK] Parsed metadata:')
          console.log('  - Customer:', metadata.customerFirstName, metadata.customerLastName)
          console.log('  - Email:', metadata.customerEmail)
          console.log('  - Date/Time:', metadata.appointmentDate, metadata.appointmentTime)
          console.log('  - Services count:', services.length)
          console.log('  - Technician type:', technicians.type)
          
          // Create booking record
          const bookingData = {
            customer_first_name: metadata.customerFirstName,
            customer_last_name: metadata.customerLastName,
            customer_email: metadata.customerEmail,
            appointment_date: metadata.appointmentDate,
            appointment_time: metadata.appointmentTime,
            start_time: metadata.startTime,
            end_time: metadata.endTime,
            services: services,
            technicians: technicians,
            total_price: parseInt(metadata.totalAmount) / 100, // Convert cents to dollars
            total_duration: parseInt(metadata.totalDuration),
            payment_status: 'paid',
            appointment_status: 'pending',
            payment_method: metadata.paymentMethod || 'stripe',
            no_show_policy_accepted: metadata.noShowPolicyAccepted === 'true',
            stripe_session_id: session.id,
            stripe_customer_id: session.customer as string
          }
          
          console.log('📝 [WEBHOOK] Creating booking with data:', JSON.stringify(bookingData, null, 2))
          
          // Insert booking into database
          const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .insert([bookingData])
            .select()
            .single()
            
          if (bookingError) {
            console.error('❌ [WEBHOOK] Error creating booking:', bookingError)
            console.error('❌ [WEBHOOK] Error details:', {
              message: bookingError.message,
              details: bookingError.details,
              hint: bookingError.hint,
              code: bookingError.code
            })
            return new Response(`Error creating booking: ${bookingError.message}`, { status: 500 })
          }
          
          console.log('✅ [WEBHOOK] Booking created successfully:', {
            id: booking.id,
            customer: `${booking.customer_first_name} ${booking.customer_last_name}`,
            date: booking.appointment_date,
            time: booking.appointment_time,
            payment_status: booking.payment_status,
            appointment_status: booking.appointment_status,
            employee_id: booking.employee_id
          })
          
          // Check if this is a split booking that needs multiple records
          if (technicians.type === 'split') {
            console.log('🔄 [WEBHOOK] Processing split booking...')
            
            // For split bookings, we need to create separate records for each service type
            const manicureServices = services.filter(s => s.category === 'manicure')
            const pedicureServices = services.filter(s => s.category === 'pedicure')
            
            console.log('  - Manicure services:', manicureServices.length)
            console.log('  - Pedicure services:', pedicureServices.length)
            
            // If we have both service types and both technicians
            if (manicureServices.length > 0 && pedicureServices.length > 0 &&
                technicians.manicureTech && technicians.pedicureTech) {
              
              // Calculate time slots for sequential appointments
              const calculateTimeSlots = (startTime: string, durationMinutes: number) => {
                const [time, period] = startTime.split(' ')
                const [hours, minutes] = time.split(':').map(Number)
                
                // Convert to 24-hour format
                let startHour = hours
                if (period === 'PM' && hours !== 12) startHour += 12
                if (period === 'AM' && hours === 12) startHour = 0
                
                const startMinutes = startHour * 60 + minutes
                const endMinutes = startMinutes + durationMinutes
                
                // Convert back to 12-hour format
                const formatTime = (totalMins: number) => {
                  const hours = Math.floor(totalMins / 60)
                  const mins = totalMins % 60
                  const period = hours >= 12 ? 'PM' : 'AM'
                  const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
                  return `${displayHour}:${mins.toString().padStart(2, '0')} ${period}`
                }
                
                return {
                  start_time: formatTime(startMinutes),
                  end_time: formatTime(endMinutes),
                  next_start_time: formatTime(endMinutes)
                }
              }
              
              // Calculate manicure duration
              const manicureDuration = manicureServices.reduce((total, service) => {
                const duration = service.duration || '0min'
                let mins = 0
                const hourMatch = duration.match(/(\d+)\s*h/)
                const minuteMatch = duration.match(/(\d+)\s*min/)
                
                if (hourMatch) mins += parseInt(hourMatch[1]) * 60
                if (minuteMatch) mins += parseInt(minuteMatch[1])
                
                return total + mins
              }, 0)
              
              // Calculate pedicure duration
              const pedicureDuration = pedicureServices.reduce((total, service) => {
                const duration = service.duration || '0min'
                let mins = 0
                const hourMatch = duration.match(/(\d+)\s*h/)
                const minuteMatch = duration.match(/(\d+)\s*min/)
                
                if (hourMatch) mins += parseInt(hourMatch[1]) * 60
                if (minuteMatch) mins += parseInt(minuteMatch[1])
                
                return total + mins
              }, 0)
              
              // Calculate manicure price
              const manicurePrice = manicureServices.reduce((total, service) => 
                total + (service.price || 0), 0)
              
              // Calculate pedicure price
              const pedicurePrice = pedicureServices.reduce((total, service) => 
                total + (service.price || 0), 0)
              
              console.log('  - Manicure duration:', manicureDuration, 'minutes')
              console.log('  - Pedicure duration:', pedicureDuration, 'minutes')
              console.log('  - Manicure price:', manicurePrice)
              console.log('  - Pedicure price:', pedicurePrice)
              
              // Calculate time slots
              const manicureSlot = calculateTimeSlots(metadata.appointmentTime, manicureDuration)
              
              // Create second booking for pedicure (starts after manicure ends)
              const pedicureBookingData = {
                customer_first_name: metadata.customerFirstName,
                customer_last_name: metadata.customerLastName,
                customer_email: metadata.customerEmail,
                appointment_date: metadata.appointmentDate,
                appointment_time: manicureSlot.next_start_time, // Start after manicure
                start_time: manicureSlot.next_start_time,
                end_time: calculateTimeSlots(manicureSlot.next_start_time, pedicureDuration).end_time,
                services: pedicureServices,
                technicians: {
                  type: 'single',
                  pedicureTech: technicians.pedicureTech
                },
                total_price: pedicurePrice,
                total_duration: pedicureDuration,
                payment_status: 'paid',
                appointment_status: 'pending',
                payment_method: metadata.paymentMethod || 'stripe',
                no_show_policy_accepted: metadata.noShowPolicyAccepted === 'true',
                stripe_session_id: session.id,
                stripe_customer_id: session.customer as string
              }
              
              console.log('📝 [WEBHOOK] Creating pedicure booking:', JSON.stringify(pedicureBookingData, null, 2))
              
              const { data: pedicureBooking, error: pedicureError } = await supabase
                .from('bookings')
                .insert([pedicureBookingData])
                .select()
                .single()
                
              if (pedicureError) {
                console.error('❌ [WEBHOOK] Error creating pedicure booking:', pedicureError)
              } else {
                console.log('✅ [WEBHOOK] Pedicure booking created:', pedicureBooking.id)
              }
              
              // Update the first booking to be manicure only
              const { data: updatedManicure, error: updateError } = await supabase
                .from('bookings')
                .update({
                  services: manicureServices,
                  technicians: {
                    type: 'single',
                    manicureTech: technicians.manicureTech
                  },
                  total_price: manicurePrice,
                  total_duration: manicureDuration,
                  start_time: manicureSlot.start_time,
                  end_time: manicureSlot.end_time
                })
                .eq('id', booking.id)
                .select()
                .single()
                
              if (updateError) {
                console.error('❌ [WEBHOOK] Error updating manicure booking:', updateError)
              } else {
                console.log('✅ [WEBHOOK] Manicure booking updated:', updatedManicure.id)
              }
            }
          }
        } catch (bookingCreationError) {
          console.error('❌ [WEBHOOK] Error in booking creation process:', bookingCreationError)
          return new Response(`Error in booking creation: ${bookingCreationError.message}`, { status: 500 })
        }
      } else {
        console.log('⚠️ [WEBHOOK] Payment not successful, status:', session.payment_status)
        // No booking creation for unsuccessful payments
      }
    } else {
      console.log('ℹ️ [WEBHOOK] Unhandled webhook event type:', event.type)
      console.log('ℹ️ [WEBHOOK] Event will be acknowledged but not processed')
    }

    // Return success response
    console.log('✅ [WEBHOOK] Webhook processing completed successfully')
    return new Response(
      JSON.stringify({ 
        received: true, 
        eventType: event.type,
        processed: event.type === 'checkout.session.completed',
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('❌ [WEBHOOK] Webhook error:', error)
    console.error('❌ [WEBHOOK] Error stack:', error.stack)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})