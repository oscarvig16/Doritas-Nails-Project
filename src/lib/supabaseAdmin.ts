import { createClient } from '@supabase/supabase-js';

// This file should only be used for admin operations that require elevated permissions
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const serviceRoleKey = import.meta.env.VITE_SERVICE_ROLE_KEY_TEMP;

if (!serviceRoleKey) {
  console.warn('⚠️ SERVICE_ROLE_KEY_TEMP not found. Admin operations will use regular client.');
}

// Create admin client with service role key for elevated permissions
export const supabaseAdmin = createClient(
  supabaseUrl, 
  serviceRoleKey || import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Function to check if admin client is properly configured
export const isAdminClientConfigured = () => {
  return !!serviceRoleKey;
};