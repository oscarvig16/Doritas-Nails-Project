import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('👥 [ADMIN API] getAllEmployees request received')
    
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

    console.log('🚀 [ADMIN API] Fetching all employees...')
    const { data, error } = await supabaseAdmin
      .from('employees')
      .select('id, name, email, role')
      .order('name')

    if (error) {
      console.error('❌ [ADMIN API] Employees query error:', error)
      throw error
    }

    console.log('✅ [ADMIN API] Employees fetched successfully:', data?.length || 0)

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
    console.error('❌ [ADMIN API] Error in getAllEmployees:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An error occurred while fetching employees',
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})