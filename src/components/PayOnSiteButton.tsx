import React, { useState } from 'react';
import { CreditCard } from 'lucide-react';
import { formatInTimezone } from '../lib/timezone';
import { setupPaymentMethod } from '../api/payments';
import { useNavigate } from 'react-router-dom';

interface PayOnSiteButtonProps {
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
  noShowPolicyAccepted: boolean;
  isLoading: boolean;
  onError: (error: string) => void;
  onSuccess: (booking: any) => void;
}

export const PayOnSiteButton: React.FC<PayOnSiteButtonProps> = ({
  services,
  technicians,
  selectedDate,
  selectedTime,
  customerInfo,
  totalAmount,
  totalDuration,
  noShowPolicyAccepted,
  isLoading: externalLoading,
  onError,
  onSuccess
}) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handlePayOnSite = async () => {
    if (!noShowPolicyAccepted) {
      onError('Please accept the No-Show Policy to continue with Pay On Site');
      return;
    }

    try {
      setIsLoading(true);

      console.log('🚀 [CLIENT] STARTING PAY ON SITE FLOW');
      console.log('Selected technicians:', JSON.stringify(technicians, null, 2));

      // CRITICAL: Ensure technicians data is properly formatted and not null
      const technicianData = technicians || {
        type: 'auto' as const,
        manicureTech: undefined,
        pedicureTech: undefined
      };

      console.log('🎯 Final technician data for setup intent:', JSON.stringify(technicianData, null, 2));

      // Create a SetupIntent for future no-show charging
      console.log('💳 [CLIENT] Creating SetupIntent for future no-show charging');
      
      const setupResult = await setupPaymentMethod({
        customerEmail: customerInfo.email,
        customerFirstName: customerInfo.firstName,
        customerLastName: customerInfo.lastName,
        appointmentDate: formatInTimezone(selectedDate, 'yyyy-MM-dd'),
        appointmentTime: selectedTime,
        services,
        technicians: technicianData,
        totalAmount,
        totalDuration
      });
      
      if (!setupResult.clientSecret) {
        throw new Error('Failed to create payment setup. Please try again.');
      }
      
      console.log('✅ [CLIENT] SetupIntent created successfully');
      console.log('✅ [CLIENT] Setup intent ID:', setupResult.setupIntentId);
      console.log('✅ [CLIENT] Customer ID:', setupResult.customerId);
      
      // Store the setup data in sessionStorage
      const payOnSiteData = {
        setupIntentClientSecret: setupResult.clientSecret,
        setupIntentId: setupResult.setupIntentId,
        customerId: setupResult.customerId,
        customerInfo,
        services,
        technicians: technicianData,
        selectedDate: formatInTimezone(selectedDate, 'yyyy-MM-dd'),
        selectedTime,
        totalAmount,
        totalDuration,
        noShowPolicyAccepted
      };
      
      sessionStorage.setItem('payOnSiteData', JSON.stringify(payOnSiteData));
      console.log('[DEBUG] Saved payOnSiteData to sessionStorage');
      console.log('[DEBUG] Customer ID saved:', setupResult.customerId);
      
      // Redirect to setup payment method page
      navigate('/setup-payment-method');
      
    } catch (err) {
      console.error('❌ Pay on site setup error:', err);
      
      // Enhanced error handling
      let errorMessage = 'An error occurred while setting up payment method';
      
      if (err instanceof Error) {
        errorMessage = err.message;
        
        // Check for specific error types
        if (err.message.includes('Validation failed')) {
          errorMessage = 'Please check all required fields are filled correctly';
        } else if (err.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection and try again';
        }
      }
      
      onError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <button 
      onClick={handlePayOnSite}
      disabled={!noShowPolicyAccepted || isLoading || externalLoading}
      className={`w-full btn ${
        noShowPolicyAccepted ? 'btn-primary' : 'btn-secondary opacity-50 cursor-not-allowed'
      } flex items-center justify-center gap-2`}
    >
      {isLoading || externalLoading ? (
        <>
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <span>Processing...</span>
        </>
      ) : (
        <>
          <CreditCard className="w-5 h-5" />
          <span>Pay On Site</span>
        </>
      )}
    </button>
  );
};