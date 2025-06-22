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
    console.log('📊 [ADMIN API] getWorkloadStats request received')
    
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

    // Parse request body for date range
    const { dateFrom, dateTo } = await req.json()
    console.log('📅 [ADMIN API] Date range:', dateFrom, 'to', dateTo)

    if (!dateFrom || !dateTo) {
      throw new Error('Date range is required')
    }

    // First, get all employees to ensure we have complete data
    const { data: employees, error: employeesError } = await supabaseAdmin
      .from('employees')
      .select('id, name, email')
      .order('name')

    if (employeesError) {
      console.error('❌ [ADMIN API] Error fetching employees:', employeesError)
      throw employeesError
    }

    console.log('👥 [ADMIN API] Fetched', employees?.length || 0, 'employees')

    // Then get booking data with explicit relationship naming
    console.log('🚀 [ADMIN API] Fetching workload data...')
    const { data: bookings, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select(`
        employee_id,
        appointment_date,
        total_duration,
        appointment_status,
        assigned_employee:employee_id(name)
      `)
      .gte('appointment_date', dateFrom)
      .lte('appointment_date', dateTo)
      .not('employee_id', 'is', null)

    if (bookingsError) {
      console.error('❌ [ADMIN API] Workload query error:', bookingsError)
      throw bookingsError
    }

    console.log('✅ [ADMIN API] Workload data fetched:', bookings?.length || 0, 'records')

    // Create a map of employee IDs to names for easier lookup
    const employeeMap = employees.reduce((map, emp) => {
      map[emp.id] = emp.name
      return map
    }, {})

    // Process workload statistics
    const workloadStats = bookings.reduce((acc: any, booking: any) => {
      const employeeId = booking.employee_id
      // Use the employee name from the map or from the relationship
      const employeeName = employeeMap[employeeId] || 
                          (booking.assigned_employee ? booking.assigned_employee.name : 'Unknown')
      
      if (!acc[employeeId]) {
        acc[employeeId] = {
          employeeId,
          employeeName,
          totalAppointments: 0,
          totalDuration: 0,
          completedAppointments: 0,
          pendingAppointments: 0,
          cancelledAppointments: 0,
          noShowAppointments: 0
        }
      }

      acc[employeeId].totalAppointments++
      acc[employeeId].totalDuration += booking.total_duration || 0

      switch (booking.appointment_status) {
        case 'completed':
          acc[employeeId].completedAppointments++
          break
        case 'pending':
          acc[employeeId].pendingAppointments++
          break
        case 'cancelled':
          acc[employeeId].cancelledAppointments++
          break
        case 'no_show':
          acc[employeeId].noShowAppointments++
          break
      }

      return acc
    }, {})

    // Add employees with no bookings to ensure complete data
    employees.forEach(emp => {
      if (!workloadStats[emp.id]) {
        workloadStats[emp.id] = {
          employeeId: emp.id,
          employeeName: emp.name,
          totalAppointments: 0,
          totalDuration: 0,
          completedAppointments: 0,
          pendingAppointments: 0,
          cancelledAppointments: 0,
          noShowAppointments: 0
        }
      }
    })

    const result = Object.values(workloadStats)
    console.log('📊 [ADMIN API] Processed workload stats for', result.length, 'employees')

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: result,
        count: result.length,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('❌ [ADMIN API] Error in getWorkloadStats:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An error occurred while fetching workload statistics',
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})