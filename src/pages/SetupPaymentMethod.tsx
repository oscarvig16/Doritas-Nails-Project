import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { SetupPaymentMethodForm } from '../components/SetupPaymentMethodForm';
import { AlertTriangle } from 'lucide-react';

export const SetupPaymentMethod: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [payOnSiteData, setPayOnSiteData] = useState<any | null>(null);

  useEffect(() => {
    const loadSetupIntent = async () => {
      try {
        setIsLoading(true);
        
        // Get the setup data from sessionStorage
        const storedData = sessionStorage.getItem('payOnSiteData');
        
        if (!storedData) {
          setError('No payment setup data found. Please try booking again.');
          setIsLoading(false);
          return;
        }
        
        const data = JSON.parse(storedData);
        setPayOnSiteData(data);
        
        console.log('🔍 [SETUP PAGE] Loaded payOnSiteData from sessionStorage');
        console.log('🔍 [SETUP PAGE] SetupIntent client secret:', data.setupIntentClientSecret?.substring(0, 10) + '...');
        
        // If we already have a client secret, use it
        if (data.setupIntentClientSecret) {
          console.log('✅ [SETUP PAGE] Using client secret from sessionStorage');
          setClientSecret(data.setupIntentClientSecret);
          setIsLoading(false);
        } else {
          setError('Missing setup intent information. Please try booking again.');
          setIsLoading(false);
        }
      } catch (err) {
        console.error('❌ [SETUP PAGE] Error loading setup intent:', err);
        setError('Error loading payment setup. Please try booking again.');
        setIsLoading(false);
      }
    };
    
    loadSetupIntent();
  }, []);

  const handleSetupSuccess = async () => {
    console.log('✅ [SETUP] Payment method setup successful');
    
    try {
      // Navigate to success page with booking data
      navigate('/booking-success', { 
        state: { 
          payOnSite: true,
          booking: {
            customer_first_name: payOnSiteData.customerInfo.firstName,
            customer_last_name: payOnSiteData.customerInfo.lastName,
            customer_email: payOnSiteData.customerInfo.email,
            appointment_date: payOnSiteData.selectedDate,
            appointment_time: payOnSiteData.selectedTime,
            services: payOnSiteData.services,
            technicians: payOnSiteData.technicians,
            total_price: payOnSiteData.totalAmount,
            total_duration: payOnSiteData.totalDuration,
            payment_status: 'pending',
            appointment_status: 'pending',
            payment_method: 'pay_on_site',
            no_show_policy_accepted: true
          },
          paymentMethodSaved: true
        }
      });
    } catch (err) {
      console.error('❌ [SETUP] Error navigating to success page:', err);
      setError('An error occurred after saving your payment method. Your appointment is confirmed.');
    }
  };

  const handleSetupError = (errorMessage: string) => {
    console.error('❌ [SETUP] Payment method setup error:', errorMessage);
    setError(`Payment method setup error: ${errorMessage}`);
  };

  if (isLoading) {
    return (
      <div className="font-raleway text-gray-800">
        <Navbar />
        <main className="pt-20 pb-20">
          <div className="container">
            <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-600">Preparing payment method setup...</p>
              <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !clientSecret) {
    return (
      <div className="font-raleway text-gray-800">
        <Navbar />
        <main className="pt-20 pb-20">
          <div className="container">
            <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8 text-center">
              <div className="text-red-600 mb-4">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mt-4">Payment Setup Error</h2>
                <p className="text-gray-600 mt-2">
                  {error || 'Unable to set up payment method. Please try again.'}
                </p>
              </div>
              <button 
                onClick={() => navigate('/book')}
                className="btn btn-primary w-full"
              >
                Back to Booking
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="font-raleway text-gray-800">
      <Navbar />
      <main className="pt-20 pb-20">
        <div className="container">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-8 mb-6 text-center">
              <h1 className="text-3xl font-playfair font-semibold mb-4">
                Secure Your Appointment
              </h1>
              
              <p className="text-gray-600 mb-4">
                Please add a payment method to secure your appointment. You will only be charged if you miss your appointment without canceling.
              </p>
            </div>
            
            <div className="mb-6">
              <SetupPaymentMethodForm 
                clientSecret={clientSecret}
                onSuccess={handleSetupSuccess}
                onError={handleSetupError}
              />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};