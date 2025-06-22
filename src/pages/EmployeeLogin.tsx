import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../lib/supabase';
import { getCurrentEmployee } from '../api/employees';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';

export const EmployeeLogin: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authState, setAuthState] = useState<'checking' | 'unauthenticated' | 'authenticating' | 'authenticated'>('checking');

  useEffect(() => {
    console.log('[EMPLOYEE LOGIN] Component mounted, checking initial session...');
    
    // Check if already logged in
    const checkSession = async () => {
      try {
        setAuthState('checking');
        console.log('[EMPLOYEE LOGIN] Checking existing session...');
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('[EMPLOYEE LOGIN] Session check error:', sessionError);
          setError('Session check failed. Please try again.');
          setAuthState('unauthenticated');
          return;
        }

        console.log('[EMPLOYEE LOGIN] Session:', session ? 'Found' : 'None');
        console.log('[EMPLOYEE LOGIN] User ID:', session?.user?.id || 'None');
        console.log('[EMPLOYEE LOGIN] User email:', session?.user?.email || 'None');

        if (session?.user) {
          console.log('[EMPLOYEE LOGIN] Session found, checking employee profile...');
          setIsLoading(true);
          
          try {
            const employee = await getCurrentEmployee();
            console.log('[EMPLOYEE LOGIN] Employee profile:', employee);
            
            if (employee) {
              console.log('[EMPLOYEE LOGIN] Employee found:', employee.name, employee.role);
              console.log('[EMPLOYEE LOGIN] Redirecting to employee panel...');
              navigate('/employee/panel');
            } else {
              console.log('[EMPLOYEE LOGIN] No employee profile found for user');
              setError('Access denied. Employee profile not found. Please contact administrator.');
              await supabase.auth.signOut();
              setAuthState('unauthenticated');
            }
          } catch (employeeError) {
            console.error('[EMPLOYEE LOGIN] Employee lookup error:', employeeError);
            setError('Failed to verify employee access. Please try again.');
            await supabase.auth.signOut();
            setAuthState('unauthenticated');
          } finally {
            setIsLoading(false);
          }
        } else {
          console.log('[EMPLOYEE LOGIN] No session found, showing login form');
          setAuthState('unauthenticated');
        }
      } catch (err) {
        console.error('[EMPLOYEE LOGIN] Initial session check failed:', err);
        setError('Failed to check authentication status. Please refresh the page.');
        setAuthState('unauthenticated');
      }
    };

    checkSession();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[EMPLOYEE LOGIN] Auth state change:', event);
      console.log('[EMPLOYEE LOGIN] Session:', session ? 'Present' : 'None');
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('[EMPLOYEE LOGIN] User signed in:', session.user.email);
        setAuthState('authenticating');
        setIsLoading(true);
        setError(null);
        
        try {
          // Wait a moment for the session to be fully established
          console.log('[EMPLOYEE LOGIN] Waiting for session to stabilize...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          console.log('[EMPLOYEE LOGIN] Checking employee profile...');
          const employee = await getCurrentEmployee();
          
          if (employee) {
            console.log('[EMPLOYEE LOGIN] Employee verified:', employee.name, employee.role);
            setAuthState('authenticated');
            navigate('/employee/panel');
          } else {
            console.log('[EMPLOYEE LOGIN] Employee profile not found');
            setError('Access denied. Only authorized employees can access this panel.');
            await supabase.auth.signOut();
            setAuthState('unauthenticated');
          }
        } catch (err) {
          console.error('[EMPLOYEE LOGIN] Post-login verification failed:', err);
          setError('Login verification failed. Please try again.');
          await supabase.auth.signOut();
          setAuthState('unauthenticated');
        } finally {
          setIsLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('[EMPLOYEE LOGIN] User signed out');
        setError(null);
        setIsLoading(false);
        setAuthState('unauthenticated');
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('[EMPLOYEE LOGIN] Token refreshed');
      }
    });

    return () => {
      console.log('[EMPLOYEE LOGIN] Cleaning up auth listener');
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  // Show loading spinner during authentication checks
  if (authState === 'checking' || isLoading || authState === 'authenticating') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="container py-8 mt-16">
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">
              {authState === 'checking' && 'Checking authentication status...'}
              {authState === 'authenticating' && 'Verifying employee access...'}
              {isLoading && 'Loading employee profile...'}
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="container py-8 mt-16">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-semibold text-center mb-2">Employee Login</h1>
          <p className="text-gray-600 text-center mb-8">
            Access the appointment management panel
          </p>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}
          
          <Auth
            supabaseClient={supabase}
            appearance={{ 
              theme: ThemeSupa,
              style: {
                button: {
                  background: '#7B4B94',
                  color: 'white',
                },
                anchor: {
                  color: '#7B4B94',
                },
              }
            }}
            providers={[]}
            redirectTo={`${window.location.origin}/employee/panel`}
            onlyThirdPartyProviders={false}
            magicLink={false}
            showLinks={false}
          />
          
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Authorized employees only</p>
            <p>Contact administrator for access</p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};