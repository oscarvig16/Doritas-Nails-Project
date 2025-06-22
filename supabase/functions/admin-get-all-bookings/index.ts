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
    console.log('🔒 [ADMIN API] Calling secure getAllBookings endpoint')
    
    // Initialize Supabase admin client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('❌ [ADMIN API] Missing Supabase configuration')
      console.error('❌ [ADMIN API] SUPABASE_URL present:', !!supabaseUrl)
      console.error('❌ [ADMIN API] SUPABASE_SERVICE_ROLE_KEY present:', !!supabaseServiceRoleKey)
      throw new Error('Missing Supabase configuration')
    }

    console.log('✅ [ADMIN API] Admin client initialized with SUPABASE_SERVICE_ROLE_KEY')
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Parse request body for filters
    const { filters = {} } = await req.json()
    console.log('🔍 [ADMIN API] Filters received:', filters)

    // Build query with admin privileges - using explicit relationship naming
    let query = supabaseAdmin
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
        employee_notes,
        created_at,
        updated_at,
        employee_id,
        last_updated_by,
        stripe_setup_intent_id,
        stripe_customer_id,
        stripe_session_id,
        no_show_policy_accepted,
        assigned_employee:employee_id(id, name, email)
      `)
      .order('appointment_date', { ascending: false })
      .order('appointment_time', { ascending: true })

    // Apply filters
    if (filters.employeeId) {
      console.log('🔍 [ADMIN API] Applying employee filter:', filters.employeeId)
      query = query.eq('employee_id', filters.employeeId)
    }

    if (filters.dateFrom) {
      console.log('🔍 [ADMIN API] Applying date from filter:', filters.dateFrom)
      query = query.gte('appointment_date', filters.dateFrom)
    }

    if (filters.dateTo) {
      console.log('🔍 [ADMIN API] Applying date to filter:', filters.dateTo)
      query = query.lte('appointment_date', filters.dateTo)
    }

    if (filters.appointmentStatus) {
      console.log('🔍 [ADMIN API] Applying appointment status filter:', filters.appointmentStatus)
      query = query.eq('appointment_status', filters.appointmentStatus)
    }

    if (filters.paymentStatus) {
      console.log('🔍 [ADMIN API] Applying payment status filter:', filters.paymentStatus)
      query = query.eq('payment_status', filters.paymentStatus)
    }

    if (filters.searchTerm) {
      console.log('🔍 [ADMIN API] Applying search term filter:', filters.searchTerm)
      // Search in customer names and email
      query = query.or(`customer_first_name.ilike.%${filters.searchTerm}%,customer_last_name.ilike.%${filters.searchTerm}%,customer_email.ilike.%${filters.searchTerm}%`)
    }

    console.log('🚀 [ADMIN API] Executing admin query...')
    const { data, error } = await query

    if (error) {
      console.error('❌ [ADMIN API] Query error:', error)
      throw error
    }

    console.log('✅ [ADMIN API] Query successful:', data?.length || 0, 'bookings returned')
    
    // Log sample booking to verify fields are present
    if (data && data.length > 0) {
      const sampleBooking = data[0]
      console.log('📋 [ADMIN API] Sample booking fields:')
      console.log('  - appointment_status:', sampleBooking.appointment_status)
      console.log('  - payment_method:', sampleBooking.payment_method)
      console.log('  - stripe_setup_intent_id:', sampleBooking.stripe_setup_intent_id ? 'present' : 'missing')
      console.log('  - stripe_customer_id:', sampleBooking.stripe_customer_id ? 'present' : 'missing')
      console.log('  - stripe_session_id:', sampleBooking.stripe_session_id ? 'present' : 'missing')
      console.log('  - no_show_policy_accepted:', sampleBooking.no_show_policy_accepted)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: data || [],
        count: data?.length || 0,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('❌ [ADMIN API] Error in getAllBookings:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An error occurred while fetching bookings',
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})