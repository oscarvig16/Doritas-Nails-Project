import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { CreditCard } from 'lucide-react';
import { formatInTimezone } from '../lib/timezone';

interface StripeCheckoutButtonProps {
  services: any[];
  technicians: {
    type: 'single' | 'split' | 'auto';
    manicureTech?: { id: string; name: string };
    pedicureTech?: { id: string; name: string };
  } | null;
  selectedDate: Date;
  selectedTime: string;
  customerInfo: {
    firstName: string;
    lastName: string;
    email: string;
  };
  totalAmount: number;
  totalDuration: number;
}

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export const StripeCheckoutButton: React.FC<StripeCheckoutButtonProps> = ({
  services,
  technicians,
  selectedDate,
  selectedTime,
  customerInfo,
  totalAmount,
  totalDuration
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('💳 [CLIENT] Creating Stripe checkout session (no booking creation yet)');
      console.log('Selected technicians:', JSON.stringify(technicians, null, 2));

      // CRITICAL: Ensure technicians data is properly formatted and not null
      const technicianData = technicians || {
        type: 'auto' as const,
        manicureTech: undefined,
        pedicureTech: undefined
      };

      console.log('🎯 Final technician data for session metadata:', JSON.stringify(technicianData, null, 2));

      // Calculate time slots for metadata
      const calculateTimeSlots = (startTime: string, services: any[]) => {
        const [time, period] = startTime.split(' ');
        const [hours, minutes] = time.split(':').map(Number);
        
        // Convert to 24-hour format
        let startHour = hours;
        if (period === 'PM' && hours !== 12) startHour += 12;
        if (period === 'AM' && hours === 12) startHour = 0;
        
        const startMinutes = startHour * 60 + minutes;
        
        // Calculate duration in minutes
        const totalDuration = services.reduce((total, service) => {
          const duration = service.duration || '0min';
          let mins = 0;
          const hourMatch = duration.match(/(\d+)\s*h/);
          const minuteMatch = duration.match(/(\d+)\s*min/);
          
          if (hourMatch) mins += parseInt(hourMatch[1]) * 60;
          if (minuteMatch) mins += parseInt(minuteMatch[1]);
          
          return total + mins;
        }, 0);
        
        const endMinutes = startMinutes + totalDuration;
        
        // Convert back to 12-hour format
        const formatTime = (totalMins: number) => {
          const hours = Math.floor(totalMins / 60);
          const mins = totalMins % 60;
          const period = hours >= 12 ? 'PM' : 'AM';
          const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
          return `${displayHour}:${mins.toString().padStart(2, '0')} ${period}`;
        };
        
        return {
          start_time: formatTime(startMinutes),
          end_time: formatTime(endMinutes)
        };
      };

      const timeSlots = calculateTimeSlots(selectedTime, services);

      // Create Stripe checkout session with comprehensive metadata (NO BOOKING CREATION)
      console.log('💳 [CLIENT] Creating Stripe checkout session with full metadata...');
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          // NO bookingId - booking will be created in webhook
          services,
          technicians: technicianData,
          date: formatInTimezone(selectedDate, 'MMMM d, yyyy'),
          appointmentDate: formatInTimezone(selectedDate, 'yyyy-MM-dd'),
          time: selectedTime,
          startTime: timeSlots.start_time,
          endTime: timeSlots.end_time,
          customer: customerInfo,
          totalAmount: Math.round(totalAmount * 100), // Convert to cents
          totalDuration,
          timezone: 'America/Los_Angeles',
          paymentMethod: 'stripe'
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('❌ [CLIENT] Stripe checkout session creation failed:', data);
        throw new Error(data.error || 'Failed to create checkout session');
      }

      if (!data?.url) {
        throw new Error('Invalid checkout session response');
      }

      console.log('✅ [CLIENT] Stripe checkout session created, redirecting...');
      console.log('✅ [CLIENT] Session will contain all booking data in metadata');
      console.log('✅ [CLIENT] Booking will be created by webhook after payment confirmation');
      
      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err) {
      console.error('❌ [CLIENT] Stripe payment error:', err);
      
      // Enhanced error handling
      let errorMessage = 'An error occurred during payment';
      
      if (err instanceof Error) {
        errorMessage = err.message;
        
        // Check for specific error types
        if (err.message.includes('checkout session')) {
          errorMessage = 'Payment system is temporarily unavailable. Please try again';
        } else if (err.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection and try again';
        }
      }
      
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <button
        onClick={handlePayment}
        disabled={isLoading}
        className={`w-full btn btn-primary flex items-center justify-center gap-2 ${
          isLoading ? 'opacity-75 cursor-not-allowed' : ''
        }`}
      >
        {isLoading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Creating Payment Session...</span>
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5" />
            <span>Pay Now (Secure Payment)</span>
          </>
        )}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-lg text-sm text-center">
          {error}
        </div>
      )}
    </div>
  );
};