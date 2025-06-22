import { supabase } from '../lib/supabase';
import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface SetupPaymentMethodParams {
  customerEmail: string;
  customerName?: string;
  appointmentDate: string;
  appointmentTime: string;
  customerFirstName?: string;
  customerLastName?: string;
  services?: any[];
  technicians?: any;
  totalAmount?: number;
  totalDuration?: number;
}

interface SetupPaymentMethodResult {
  clientSecret: string;
  setupIntentId: string;
  customerId: string;
}

export const setupPaymentMethod = async (params: SetupPaymentMethodParams): Promise<SetupPaymentMethodResult> => {
  console.log('💳 [CLIENT] Setting up payment method');
  console.log('📋 [CLIENT] Setup params:', {
    customerEmail: params.customerEmail,
    appointmentDate: params.appointmentDate,
    appointmentTime: params.appointmentTime
  });
  
  try {
    // Call the Edge Function to create a SetupIntent
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-setup-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ [CLIENT] Setup payment method error:', errorData);
      throw new Error(errorData.error || 'Failed to set up payment method');
    }

    const data = await response.json();
    console.log('✅ [CLIENT] Setup payment method success:', data.setupIntentId);
    console.log('✅ [CLIENT] Client secret received:', data.clientSecret?.substring(0, 10) + '...');
    console.log('✅ [CLIENT] Customer ID received:', data.customerId);
    
    return {
      clientSecret: data.clientSecret,
      setupIntentId: data.setupIntentId,
      customerId: data.customerId
    };
  } catch (error) {
    console.error('❌ [CLIENT] Error in setupPaymentMethod:', error);
    throw error;
  }
};

export const updateSetupIntentId = async (bookingId: string, setupIntentId: string): Promise<boolean> => {
  console.log('🔄 [CLIENT] Updating SetupIntent ID for booking:', bookingId);
  console.log('🔄 [CLIENT] SetupIntent ID:', setupIntentId);
  
  try {
    // Call the Edge Function to update the SetupIntent ID
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-setup-intent-id`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ bookingId, setupIntentId })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ [CLIENT] Update SetupIntent ID error:', errorData);
      throw new Error(errorData.error || 'Failed to update SetupIntent ID');
    }

    const data = await response.json();
    console.log('✅ [CLIENT] Update SetupIntent ID success:', data);
    
    return true;
  } catch (error) {
    console.error('❌ [CLIENT] Error in updateSetupIntentId:', error);
    return false;
  }
};

interface ChargeNoShowFeeParams {
  bookingId: string;
  employeeId: string;
  notes?: string;
}

interface ChargeNoShowFeeResult {
  success: boolean;
  paymentIntentId?: string;
  paymentStatus?: string;
  amount?: number;
  error?: string;
}

export const chargeNoShowFee = async (params: ChargeNoShowFeeParams): Promise<ChargeNoShowFeeResult> => {
  console.log('💰 [CLIENT] Charging no-show fee for booking:', params.bookingId);
  
  try {
    // Call the Edge Function to charge the no-show fee
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/charge-no-show-fee`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify(params)
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ [CLIENT] Charge no-show fee error:', data);
      return {
        success: false,
        error: data.error || 'Failed to charge no-show fee'
      };
    }

    console.log('✅ [CLIENT] Charge no-show fee success:', data);
    
    return {
      success: true,
      paymentIntentId: data.paymentIntentId,
      paymentStatus: data.paymentStatus,
      amount: data.amount
    };
  } catch (error) {
    console.error('❌ [CLIENT] Error in chargeNoShowFee:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

export const getSetupIntentSecret = async (setupIntentId: string): Promise<string | null> => {
  console.log('🔍 [CLIENT] Getting setup intent secret for:', setupIntentId);
  
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-setup-intent-secret`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ setupIntentId })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ [CLIENT] Get setup intent secret error:', errorData);
      return null;
    }

    const data = await response.json();
    console.log('✅ [CLIENT] Got setup intent secret:', data.clientSecret?.substring(0, 10) + '...');
    console.log('✅ [CLIENT] Setup intent status:', data.status);
    console.log('✅ [CLIENT] Setup intent created:', data.created);
    
    return data.clientSecret;
  } catch (error) {
    console.error('❌ [CLIENT] Error in getSetupIntentSecret:', error);
    return null;
  }
};