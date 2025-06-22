import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';

export const BookingCanceled: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="font-raleway text-gray-800">
      <Navbar />
      <main className="pt-20 pb-20">
        <div className="container">
          <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
            </div>
            
            <h1 className="text-3xl font-playfair font-semibold mb-4">
              Payment Canceled
            </h1>
            
            <p className="text-gray-600 mb-8">
              You canceled your payment. No charges were made. You can try booking again or contact us if you need assistance.
            </p>

            <div className="space-y-4">
              <button 
                onClick={() => navigate('/book')}
                className="btn btn-primary w-full"
              >
                Try Booking Again
              </button>
              
              <button 
                onClick={() => navigate('/')}
                className="btn btn-secondary w-full"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};