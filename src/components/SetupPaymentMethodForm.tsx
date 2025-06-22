import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { createBooking } from '../api/bookings';
import { updateSetupIntentId } from '../api/payments';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface SetupFormProps {
  clientSecret: string;
  onSuccess: () => void;
  onError: (error: string) => void;
}

const SetupForm: React.FC<SetupFormProps> = ({ clientSecret, onSuccess, onError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!stripe) {
      return;
    }

    // Check the setup intent status right away
    const clientSecretParam = new URLSearchParams(window.location.search).get(
      'setup_intent_client_secret'
    );

    if (!clientSecretParam) {
      return;
    }

    console.log('🔍 [SETUP FORM] Found setup_intent_client_secret in URL:', clientSecretParam.substring(0, 10) + '...');

    stripe.retrieveSetupIntent(clientSecretParam).then(async (result) => {
      console.log("🧾 Raw SetupIntent object from retrieve:", result);
      console.log('🔍 [SETUP FORM] Retrieved SetupIntent status:', result?.setupIntent?.status);
      
      // Safely extract the setupIntent object and IDs
      const intent = result?.setupIntent || result;
      const setupIntentId = intent?.id || sessionStorage.getItem("setup_intent_id");
      
      // Get stored data from sessionStorage
      const storedData = sessionStorage.getItem('payOnSiteData');
      if (!storedData) {
        console.error('❌ [SETUP FORM] No payOnSiteData found in sessionStorage');
        setMessage('Missing booking data. Please try again.');
        return;
      }
      
      const payOnSiteData = JSON.parse(storedData);
      
      // Use customer ID from stored data, this is more reliable than from the intent
      const customerId = payOnSiteData.customerId;
      
      console.log('🔎 Supabase Save Debug:');
      console.log('💳 Stripe SetupIntent ID:', setupIntentId);
      console.log('👤 Stripe Customer ID:', customerId);
      
      switch (intent?.status) {
        case 'succeeded':
          setMessage('Payment method set up successfully!');
          
          try {
            // Verify we have all required IDs before proceeding
            if (!setupIntentId) {
              console.error('❌ [SETUP FORM] Missing setupIntentId');
              throw new Error('Missing SetupIntent ID');
            }
            
            if (!customerId) {
              console.error('❌ [SETUP FORM] Missing customerId');
              throw new Error('Missing Customer ID');
            }
            
            console.log('🧪 Creating booking with:', { 
              setupIntentId, 
              customerId
            });
            
            // Create booking data object with explicit field names
            const bookingData = {
              customer_first_name: payOnSiteData.customerInfo.firstName,
              customer_last_name: payOnSiteData.customerInfo.lastName,
              customer_email: payOnSiteData.customerInfo.email,
              appointment_date: payOnSiteData.selectedDate,
              appointment_time: payOnSiteData.selectedTime,
              services: payOnSiteData.services,
              technicians: payOnSiteData.technicians,
              total_price: payOnSiteData.totalAmount,
              total_duration: payOnSiteData.totalDuration,
              payment_status: 'pending' as const,
              appointment_status: 'pending' as const,
              payment_method: 'pay_on_site' as const,
              no_show_policy_accepted: true,
              stripe_setup_intent_id: setupIntentId,
              stripe_customer_id: customerId,
              stripe_session_id: null
            };
            
            // Log the exact booking data being sent to Supabase
            console.log('📝 [SETUP FORM] Creating booking with EXACT data:', JSON.stringify({
              customer_first_name: bookingData.customer_first_name,
              customer_last_name: bookingData.customer_last_name,
              customer_email: bookingData.customer_email,
              appointment_date: bookingData.appointment_date,
              appointment_time: bookingData.appointment_time,
              services: `[${bookingData.services.length} services]`,
              technicians: `[${bookingData.technicians.type} type]`,
              total_price: bookingData.total_price,
              total_duration: bookingData.total_duration,
              payment_status: bookingData.payment_status,
              appointment_status: bookingData.appointment_status,
              payment_method: bookingData.payment_method,
              no_show_policy_accepted: bookingData.no_show_policy_accepted,
              stripe_setup_intent_id: bookingData.stripe_setup_intent_id,
              stripe_customer_id: bookingData.stripe_customer_id,
              stripe_session_id: bookingData.stripe_session_id
            }, null, 2));
            
            // Create the booking with createBooking API
            const booking = await createBooking(bookingData);
            
            if (!booking?.id) {
              throw new Error('Failed to create booking record');
            }
            
            console.log('✅ [SETUP FORM] Booking created successfully:', booking.id);
            
            // Double-check the booking has the correct Stripe IDs with a direct Supabase query
            const { data, error } = await supabase
              .from('bookings')
              .select('id, stripe_setup_intent_id, stripe_customer_id, stripe_session_id')
              .eq('id', booking.id)
              .single();
              
            if (error) {
              console.error('❌ [SETUP FORM] Error verifying booking:', error);
            } else {
              console.log('✅ [SETUP FORM] Verified booking has correct IDs:', {
                id: data.id,
                stripe_setup_intent_id: data.stripe_setup_intent_id,
                stripe_customer_id: data.stripe_customer_id,
                stripe_session_id: data.stripe_session_id
              });
              
              // If stripe_setup_intent_id is still null, try using the Edge Function
              if (!data.stripe_setup_intent_id) {
                console.log('⚠️ [SETUP FORM] stripe_setup_intent_id is null, using Edge Function to update');
                
                // Guard clause to ensure both IDs are defined
                if (!booking.id || !setupIntentId) {
                  console.error("❌ Missing booking ID or SetupIntent ID:", { bookingId: booking.id, setupIntentId });
                  throw new Error('Missing required IDs for update');
                }
                
                console.log('⚠️ Attempting to update booking ID:', booking.id);
                console.log('🔄 [SETUP FORM] Using Edge Function with:', {
                  bookingId: booking.id,
                  setupIntentId: setupIntentId
                });
                
                try {
                  // Use the Edge Function to update with service role key
                  const success = await updateSetupIntentId(booking.id, setupIntentId);
                  
                  if (success) {
                    console.log('✅ [SETUP FORM] Edge Function update successful');
                  } else {
                    console.error('❌ [SETUP FORM] Edge Function update failed');
                  }
                } catch (updateErr) {
                  console.error('❌ [SETUP FORM] Error during Edge Function update:', updateErr);
                }
              }
            }
            
            // Clear the sessionStorage data
            sessionStorage.removeItem('payOnSiteData');
            sessionStorage.removeItem('setup_intent_id');
            
            onSuccess();
          } catch (err) {
            console.error('❌ [SETUP FORM] Error creating booking:', err);
            onError('Failed to create your booking. Please try again.');
          }
          break;
        case 'processing':
          setMessage('Your payment method is being processed.');
          break;
        case 'requires_payment_method':
          setMessage('Failed to set up payment method. Please try again.');
          onError('Failed to set up payment method');
          break;
        default:
          setMessage('Something went wrong.');
          onError('Something went wrong');
          break;
      }
    });
  }, [stripe, onSuccess, onError]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js hasn't yet loaded.
      console.log('❌ [SETUP FORM] Stripe or elements not loaded yet');
      return;
    }

    setIsLoading(true);
    setMessage(null);

    console.log('🔍 [SETUP FORM] Confirming setup with client secret:', clientSecret.substring(0, 10) + '...');
    
    // Get stored data from sessionStorage
    const storedData = sessionStorage.getItem('payOnSiteData');
    if (!storedData) {
      console.error('❌ [SETUP FORM] No payOnSiteData found in sessionStorage');
      setMessage('Missing booking data. Please try again.');
      setIsLoading(false);
      return;
    }
    
    const payOnSiteData = JSON.parse(storedData);
    const setupIntentId = payOnSiteData.setupIntentId;
    
    // Store setupIntentId in sessionStorage for retrieval after redirect
    sessionStorage.setItem('setup_intent_id', setupIntentId);
    
    console.log('💳 [SETUP FORM] SetupIntent ID from sessionStorage:', setupIntentId);

    // Get the payment element
    const paymentElement = elements.getElement('payment');
    if (!paymentElement) {
      console.error("❌ [SETUP FORM] Payment element not mounted.");
      setMessage("Something went wrong with loading the payment form. Please refresh and try again.");
      setIsLoading(false);
      return;
    }

    const { error, setupIntent } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
    });

    if (error) {
      console.error('❌ [SETUP FORM] Setup confirmation error:', error);
      console.error('❌ [SETUP FORM] Error type:', error.type);
      console.error('❌ [SETUP FORM] Error code:', error.code);
      console.error('❌ [SETUP FORM] Error message:', error.message);
      
      setMessage(error.message || 'An unexpected error occurred.');
      onError(error.message || 'An unexpected error occurred');
      setIsLoading(false);
    } else if (setupIntent && setupIntent.status === 'succeeded') {
      console.log("🧾 Raw SetupIntent object (immediate success):", setupIntent);
      
      try {
        // Verify we have all required IDs before proceeding
        const finalSetupIntentId = setupIntent.id || setupIntentId;
        const customerId = payOnSiteData.customerId;
        
        if (!finalSetupIntentId) {
          console.error('❌ [SETUP FORM] Missing setupIntentId');
          throw new Error('Missing SetupIntent ID');
        }
        
        if (!customerId) {
          console.error('❌ [SETUP FORM] Missing customerId');
          throw new Error('Missing Customer ID');
        }
        
        console.log('🧪 Creating booking with:', { 
          setupIntentId: finalSetupIntentId, 
          customerId
        });
        
        // Create booking data object with explicit field names
        const bookingData = {
          customer_first_name: payOnSiteData.customerInfo.firstName,
          customer_last_name: payOnSiteData.customerInfo.lastName,
          customer_email: payOnSiteData.customerInfo.email,
          appointment_date: payOnSiteData.selectedDate,
          appointment_time: payOnSiteData.selectedTime,
          services: payOnSiteData.services,
          technicians: payOnSiteData.technicians,
          total_price: payOnSiteData.totalAmount,
          total_duration: payOnSiteData.totalDuration,
          payment_status: 'pending' as const,
          appointment_status: 'pending' as const,
          payment_method: 'pay_on_site' as const,
          no_show_policy_accepted: true,
          stripe_setup_intent_id: finalSetupIntentId,
          stripe_customer_id: customerId,
          stripe_session_id: null
        };
        
        console.log('📝 [SETUP FORM] Creating booking with EXACT data:', JSON.stringify({
          customer_first_name: bookingData.customer_first_name,
          customer_last_name: bookingData.customer_last_name,
          customer_email: bookingData.customer_email,
          appointment_date: bookingData.appointment_date,
          appointment_time: bookingData.appointment_time,
          services: `[${bookingData.services.length} services]`,
          technicians: `[${bookingData.technicians.type} type]`,
          total_price: bookingData.total_price,
          total_duration: bookingData.total_duration,
          payment_status: bookingData.payment_status,
          appointment_status: bookingData.appointment_status,
          payment_method: bookingData.payment_method,
          no_show_policy_accepted: bookingData.no_show_policy_accepted,
          stripe_setup_intent_id: bookingData.stripe_setup_intent_id,
          stripe_customer_id: bookingData.stripe_customer_id,
          stripe_session_id: bookingData.stripe_session_id
        }, null, 2));
        
        // Create the booking with createBooking API
        const booking = await createBooking(bookingData);
        
        if (!booking?.id) {
          throw new Error('Failed to create booking record');
        }
        
        console.log('✅ [SETUP FORM] Booking created successfully:', booking.id);
        
        // Double-check the booking has the correct Stripe IDs with a direct Supabase query
        const { data, error } = await supabase
          .from('bookings')
          .select('id, stripe_setup_intent_id, stripe_customer_id, stripe_session_id')
          .eq('id', booking.id)
          .single();
          
        if (error) {
          console.error('❌ [SETUP FORM] Error verifying booking:', error);
        } else {
          console.log('✅ [SETUP FORM] Verified booking has correct IDs:', {
            id: data.id,
            stripe_setup_intent_id: data.stripe_setup_intent_id,
            stripe_customer_id: data.stripe_customer_id,
            stripe_session_id: data.stripe_session_id
          });
          
          // If stripe_setup_intent_id is still null, try using the Edge Function
          if (!data.stripe_setup_intent_id) {
            console.log('⚠️ [SETUP FORM] stripe_setup_intent_id is null, using Edge Function to update');
            
            // Guard clause to ensure both IDs are defined
            if (!booking.id || !finalSetupIntentId) {
              console.error("❌ Missing booking ID or SetupIntent ID:", { bookingId: booking.id, setupIntentId: finalSetupIntentId });
              throw new Error('Missing required IDs for update');
            }
            
            console.log('⚠️ Attempting to update booking ID:', booking.id);
            console.log('🔄 [SETUP FORM] Using Edge Function with:', {
              bookingId: booking.id,
              setupIntentId: finalSetupIntentId
            });
            
            try {
              // Use the Edge Function to update with service role key
              const success = await updateSetupIntentId(booking.id, finalSetupIntentId);
              
              if (success) {
                console.log('✅ [SETUP FORM] Edge Function update successful');
              } else {
                console.error('❌ [SETUP FORM] Edge Function update failed');
              }
            } catch (updateErr) {
              console.error('❌ [SETUP FORM] Error during Edge Function update:', updateErr);
            }
          }
        }
        
        // Clear the sessionStorage data
        sessionStorage.removeItem('payOnSiteData');
        sessionStorage.removeItem('setup_intent_id');
        
        setMessage('Payment method set up successfully!');
        onSuccess();
      } catch (err) {
        console.error('❌ [SETUP FORM] Error creating booking:', err);
        onError('Failed to create your booking. Please try again.');
      }
      
      setIsLoading(false);
    } else {
      // Your customer will be redirected to your `return_url`. For some payment
      // methods like iDEAL, your customer will be redirected to an intermediate
      // site first to authorize the payment, then redirected to the `return_url`.
      console.log('🔄 [SETUP FORM] Redirecting to Stripe...');
      setMessage('Redirecting...');
    }
  };

  return (
    <form id="payment-form" onSubmit={handleSubmit}>
      <div className="mb-6">
        {stripe && elements && clientSecret ? (
          <PaymentElement id="payment-element" />
        ) : (
          <div className="text-center text-sm text-gray-500 p-4 border border-gray-200 rounded-lg">
            Loading payment form...
          </div>
        )}
      </div>
      
      {message && (
        <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">
          {message}
        </div>
      )}
      
      <button
        disabled={isLoading || !stripe || !elements || !clientSecret}
        className={`w-full btn btn-primary flex items-center justify-center gap-2 ${
          isLoading || !stripe || !elements || !clientSecret ? 'opacity-70 cursor-not-allowed' : ''
        }`}
      >
        {isLoading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Processing...</span>
          </>
        ) : (
          'Save Payment Method'
        )}
      </button>
      
      <div className="mt-4 bg-yellow-50 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-yellow-800">
              Your card will only be charged the $40 no-show fee if you miss your appointment without canceling at least 4 hours prior.
            </p>
          </div>
        </div>
      </div>
    </form>
  );
};

interface SetupPaymentMethodFormProps {
  clientSecret: string;
  onSuccess: () => void;
  onError: (error: string) => void;
}

export const SetupPaymentMethodForm: React.FC<SetupPaymentMethodFormProps> = ({
  clientSecret,
  onSuccess,
  onError
}) => {
  console.log('🔍 [SETUP FORM] Rendering with client secret:', clientSecret.substring(0, 10) + '...');
  console.log('🔐 [Stripe Mount] clientSecret:', clientSecret);
  console.log('🔐 [Stripe Mount] publishable key:', import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

  // Guard against invalid clientSecret
  if (!clientSecret) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center text-red-500">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
          <h3 className="text-lg font-medium mb-2">Missing Payment Configuration</h3>
          <p className="mb-4">Unable to load payment form. Please try again later.</p>
          <button 
            onClick={() => window.location.href = '/book'}
            className="btn btn-primary"
          >
            Return to Booking
          </button>
        </div>
      </div>
    );
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#7B4B94',
      },
    },
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-semibold mb-4 text-center">Secure Your Appointment</h3>
      <p className="text-gray-600 mb-6 text-center">
        Please provide a payment method to secure your appointment. 
        You will only be charged the $40 no-show fee if you miss your appointment without canceling.
      </p>
      
      <Elements stripe={stripePromise} options={options}>
        <SetupForm 
          clientSecret={clientSecret}
          onSuccess={onSuccess}
          onError={onError}
        />
      </Elements>
    </div>
  );
};