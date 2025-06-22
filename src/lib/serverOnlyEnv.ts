// Server-only environment variable access
// This file should only be imported in server-side code (API routes, edge functions)

if (typeof window !== 'undefined') {
  throw new Error('serverOnlyEnv.ts should never be imported in client-side code');
}

export const getServerEnv = () => {
  const serviceRoleKey = process.env.SERVICE_ROLE_KEY_TEMP;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;

  if (!serviceRoleKey) {
    throw new Error('SERVICE_ROLE_KEY_TEMP is not set in server environment');
  }

  if (!supabaseUrl) {
    throw new Error('VITE_SUPABASE_URL is not set in server environment');
  }

  return {
    serviceRoleKey,
    supabaseUrl
  };
};