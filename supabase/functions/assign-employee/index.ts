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
    // Initialize Supabase admin client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing Supabase configuration')
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log('✅ [EDGE] Admin client initialized securely')

    // Parse request body
    const { technicianName, serviceTypes, bookingType } = await req.json()
    
    console.log(`🔍 [EDGE] Employee lookup request:`)
    console.log(`  - Technician Name: "${technicianName}"`)
    console.log(`  - Service Types: ${JSON.stringify(serviceTypes)}`)
    console.log(`  - Booking Type: ${bookingType}`)

    // Secure employee lookup function
    const findEmployeeByName = async (name: string) => {
      console.log(`🔍 [EDGE] Looking up employee: "${name}"`)
      
      if (!name || typeof name !== 'string') {
        console.log(`❌ [EDGE] Invalid name provided: ${name}`)
        return null
      }

      const trimmedName = name.trim()
      
      try {
        // Strategy 1: Exact name match
        console.log(`🔍 [EDGE] Strategy 1: Exact match for "${trimmedName}"`)
        const { data: exactMatch, error: exactError } = await supabaseAdmin
          .from('employees')
          .select('id, name, email, role')
          .eq('name', trimmedName)
          .maybeSingle()

        if (exactError) {
          console.error(`❌ [EDGE] Exact match error:`, exactError)
        }

        if (exactMatch) {
          console.log(`✅ [EDGE] Found employee via exact match: ${exactMatch.name} (ID: ${exactMatch.id})`)
          return exactMatch
        }

        // Strategy 2: Case-insensitive match
        console.log(`🔍 [EDGE] Strategy 2: Case-insensitive match for "${trimmedName}"`)
        const { data: caseInsensitiveMatch, error: caseError } = await supabaseAdmin
          .from('employees')
          .select('id, name, email, role')
          .ilike('name', trimmedName)
          .maybeSingle()

        if (caseError) {
          console.error(`❌ [EDGE] Case-insensitive match error:`, caseError)
        }

        if (caseInsensitiveMatch) {
          console.log(`✅ [EDGE] Found employee via case-insensitive match: ${caseInsensitiveMatch.name} (ID: ${caseInsensitiveMatch.id})`)
          return caseInsensitiveMatch
        }

        // Strategy 3: Fallback mapping for known technicians
        console.log(`🔍 [EDGE] Strategy 3: Fallback mapping for "${trimmedName}"`)
        const normalizedName = trimmedName.toLowerCase()
        let fallbackName = null

        if (normalizedName.includes('dora') || normalizedName.includes('alviter')) {
          fallbackName = 'Dora Alviter'
        } else if (normalizedName.includes('aracely') || normalizedName.includes('orozco')) {
          fallbackName = 'Aracely Orozco'
        }

        if (fallbackName) {
          console.log(`🔍 [EDGE] Trying fallback mapping: "${trimmedName}" → "${fallbackName}"`)
          const { data: fallbackMatch, error: fallbackError } = await supabaseAdmin
            .from('employees')
            .select('id, name, email, role')
            .eq('name', fallbackName)
            .maybeSingle()

          if (fallbackError) {
            console.error(`❌ [EDGE] Fallback match error:`, fallbackError)
          }

          if (fallbackMatch) {
            console.log(`✅ [EDGE] Found employee via fallback mapping: ${fallbackMatch.name} (ID: ${fallbackMatch.id})`)
            return fallbackMatch
          }
        }

        // Strategy 4: List all available employees for debugging
        console.log(`🔍 [EDGE] Strategy 4: Listing available employees for debugging`)
        const { data: allEmployees, error: allError } = await supabaseAdmin
          .from('employees')
          .select('id, name, email, role')
          .limit(10)

        if (allError) {
          console.error(`❌ [EDGE] Error listing employees:`, allError)
        } else {
          console.log(`📋 [EDGE] Available employees in database:`)
          allEmployees?.forEach(emp => {
            console.log(`  - "${emp.name}" (${emp.email}) [ID: ${emp.id}]`)
          })
        }

        console.log(`❌ [EDGE] No employee found for name: "${trimmedName}" after all strategies`)
        return null
      } catch (error) {
        console.error(`❌ [EDGE] Critical error looking up employee "${trimmedName}":`, error)
        return null
      }
    }

    // Auto-assignment logic based on service types
    const getAutoAssignedEmployee = async (serviceTypes: string[]) => {
      console.log(`🤖 [EDGE] Auto-assignment logic for services: ${JSON.stringify(serviceTypes)}`)
      
      const hasManicure = serviceTypes.includes('manicure')
      const hasPedicure = serviceTypes.includes('pedicure')
      
      if (hasManicure && hasPedicure) {
        // Both services - assign to Dora (manicure specialist)
        console.log('🎯 [EDGE] Both manicure and pedicure services → assigning to Dora Alviter')
        return await findEmployeeByName('Dora Alviter')
      } else if (hasManicure) {
        // Only manicure services - assign to Dora
        console.log('🎯 [EDGE] Manicure services only → assigning to Dora Alviter')
        return await findEmployeeByName('Dora Alviter')
      } else if (hasPedicure) {
        // Only pedicure services - assign to Aracely
        console.log('🎯 [EDGE] Pedicure services only → assigning to Aracely Orozco')
        return await findEmployeeByName('Aracely Orozco')
      } else {
        // No recognizable services - default to Dora
        console.log('🎯 [EDGE] No recognizable services → defaulting to Dora Alviter')
        return await findEmployeeByName('Dora Alviter')
      }
    }

    let assignedEmployee = null
    let assignmentType = 'unknown'

    // Handle different assignment types
    if (bookingType === 'auto') {
      console.log('🤖 [EDGE] Processing auto-assignment')
      assignedEmployee = await getAutoAssignedEmployee(serviceTypes || [])
      assignmentType = 'auto'
    } else if (technicianName) {
      console.log(`👤 [EDGE] Processing specific technician assignment: "${technicianName}"`)
      assignedEmployee = await findEmployeeByName(technicianName)
      assignmentType = 'specific'
    } else {
      console.log('⚠️ [EDGE] No technician name or auto-assignment specified')
    }

    // Prepare response
    const response = {
      success: !!assignedEmployee,
      employee: assignedEmployee,
      assignmentType,
      technicianRequested: technicianName,
      serviceTypes: serviceTypes || [],
      timestamp: new Date().toISOString()
    }

    if (assignedEmployee) {
      console.log(`✅ [EDGE] Employee assignment successful:`)
      console.log(`  - Employee: ${assignedEmployee.name} (${assignedEmployee.email})`)
      console.log(`  - Employee ID: ${assignedEmployee.id}`)
      console.log(`  - Assignment Type: ${assignmentType}`)
    } else {
      console.log(`❌ [EDGE] Employee assignment failed:`)
      console.log(`  - Requested: "${technicianName}"`)
      console.log(`  - Service Types: ${JSON.stringify(serviceTypes)}`)
      console.log(`  - Assignment Type: ${assignmentType}`)
    }

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('❌ [EDGE] Edge function error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An error occurred during employee assignment',
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})