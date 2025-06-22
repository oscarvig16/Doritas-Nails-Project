import React, { useState } from 'react';
import { Clock, Calendar, User, Mail, CreditCard, AlertTriangle } from 'lucide-react';
import { StripeCheckoutButton } from './StripeCheckoutButton';
import { PayOnSiteButton } from './PayOnSiteButton';
import { createBooking } from '../api/bookings';
import { useNavigate } from 'react-router-dom';
import { formatInTimezone } from '../lib/timezone';

interface BookingConfirmationProps {
  selectedServices: any[];
  selectedTechnicians: {
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
  totalPrice: number;
  totalDuration: number;
  onBack: () => void;
}

export const BookingConfirmation: React.FC<BookingConfirmationProps> = ({
  selectedServices,
  selectedTechnicians,
  selectedDate,
  selectedTime,
  customerInfo,
  totalPrice,
  totalDuration,
  onBack
}) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noShowPolicyAccepted, setNoShowPolicyAccepted] = useState(false);

  const formatDuration = (minutes: number): string => {
    if (minutes === 0) return '0 min';
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) return `${mins}min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}min`;
  };

  const renderServicesByCategory = () => {
    const servicesByCategory = selectedServices.reduce((acc, service) => {
      const category = service.category;
      const type = service.subcategory?.includes('Designs') 
        ? `${category === 'manicure' ? 'Designs (Manicure)' : 'Designs (Pedicure)'}` 
        : service.subcategory?.includes('Add-ons')
        ? `${category === 'manicure' ? 'Add-ons (Manicure)' : 'Add-ons (Pedicure)'}` 
        : category === 'manicure' ? 'Manicure Services' : 'Pedicure Services';

      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(service);
      return acc;
    }, {} as Record<string, any[]>);

    return Object.entries(servicesByCategory).map(([category, services]) => (
      <div key={category} className="mb-6 last:mb-0">
        <h4 className="font-medium text-gray-900 mb-3">{category}</h4>
        <div className="space-y-3">
          {services.map((service) => (
            <div key={service.id} className="flex justify-between items-start">
              <div>
                <p className="font-medium">{service.title}</p>
                {service.options && (
                  <p className="text-sm text-gray-600">
                    {service.options.type}: {service.options.value}
                  </p>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                  <Clock className="w-4 h-4" />
                  <span>{service.duration}</span>
                </div>
              </div>
              <span className="font-medium">${service.price}</span>
            </div>
          ))}
        </div>
      </div>
    ));
  };

  const renderTechnicianSummary = () => {
    if (!selectedTechnicians) {
      return <p>Auto-assigned at checkout</p>;
    }

    return (
      <div className="space-y-2">
        {selectedTechnicians.type === 'auto' ? (
          <p>Auto-assigned at checkout</p>
        ) : selectedTechnicians.type === 'single' ? (
          <div>
            <p className="font-medium">{selectedTechnicians.manicureTech?.name}:</p>
            <ul className="ml-4 mt-1 space-y-1 text-sm text-gray-600">
              {selectedServices
                .filter(s => s.category === 'manicure')
                .map(s => (
                  <li key={s.id}>- {s.title}</li>
                ))}
              {selectedServices
                .filter(s => s.category === 'pedicure')
                .map(s => (
                  <li key={s.id}>- {s.title}</li>
                ))}
            </ul>
          </div>
        ) : (
          <>
            {selectedTechnicians.manicureTech && (
              <div>
                <p className="font-medium">{selectedTechnicians.manicureTech.name} (Manicure):</p>
                <ul className="ml-4 mt-1 space-y-1 text-sm text-gray-600">
                  {selectedServices
                    .filter(s => s.category === 'manicure')
                    .map(s => (
                      <li key={s.id}>- {s.title}</li>
                    ))}
                </ul>
              </div>
            )}
            {selectedTechnicians.pedicureTech && (
              <div className="mt-2">
                <p className="font-medium">{selectedTechnicians.pedicureTech.name} (Pedicure):</p>
                <ul className="ml-4 mt-1 space-y-1 text-sm text-gray-600">
                  {selectedServices
                    .filter(s => s.category === 'pedicure')
                    .map(s => (
                      <li key={s.id}>- {s.title}</li>
                    ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const handlePayOnSiteSuccess = (booking: any) => {
    navigate('/booking-success', { 
      state: { 
        payOnSite: true,
        booking,
        paymentMethodSaved: true
      }
    });
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-playfair font-semibold mb-2">
            Review & Payment
          </h2>
          <p className="text-gray-600">
            Please review your booking details and choose your payment method
          </p>
        </div>

        <div className="space-y-6">
          {/* Services */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-medium mb-4">Selected Services</h3>
            {renderServicesByCategory()}
          </div>

          {/* Technicians */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-medium mb-4">Your Technician(s)</h3>
            {renderTechnicianSummary()}
          </div>

          {/* Date & Time */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-medium mb-4">Appointment Details</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-500" />
                <span>{formatInTimezone(selectedDate, 'EEEE, MMMM d, yyyy')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-500" />
                <span>{selectedTime} (Pacific Time)</span>
              </div>
              <div className="text-sm text-gray-600">
                Total Duration: {formatDuration(totalDuration)}
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-medium mb-4">Your Information</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-gray-500" />
                <span>{customerInfo.firstName} {customerInfo.lastName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-gray-500" />
                <span>{customerInfo.email}</span>
              </div>
            </div>
          </div>

          {/* Total */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex justify-between items-center text-xl font-semibold">
              <span>Total Amount:</span>
              <span className="text-primary">${totalPrice}</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Payment Options */}
          <div className="space-y-4">
            {/* Back Button and Pay Now */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={onBack}
                className="btn btn-secondary"
              >
                Back
              </button>
              <StripeCheckoutButton
                services={selectedServices}
                technicians={selectedTechnicians}
                selectedDate={selectedDate}
                selectedTime={selectedTime}
                customerInfo={customerInfo}
                totalAmount={totalPrice}
                totalDuration={totalDuration}
              />
            </div>

            {/* Pay On Site Option */}
            <div className="border-t border-gray-200 pt-4">
              <p className="text-gray-600 mb-4 text-center">
                Choose this option to pay in person. Our No-Show Policy will apply.
              </p>
              <PayOnSiteButton
                services={selectedServices}
                technicians={selectedTechnicians}
                selectedDate={selectedDate}
                selectedTime={selectedTime}
                customerInfo={customerInfo}
                totalAmount={totalPrice}
                totalDuration={totalDuration}
                noShowPolicyAccepted={noShowPolicyAccepted}
                isLoading={isLoading}
                onError={setError}
                onSuccess={handlePayOnSiteSuccess}
              />

              {/* No-Show Policy */}
              <div className="mt-4 bg-yellow-50 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-medium text-yellow-800 mb-2">No-Show Policy</h4>
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="noShowPolicy"
                        checked={noShowPolicyAccepted}
                        onChange={(e) => setNoShowPolicyAccepted(e.target.checked)}
                        className="mt-1"
                      />
                      <label htmlFor="noShowPolicy" className="text-sm text-yellow-800">
                        I understand that if I do not cancel or reschedule my appointment at least <strong>4 hours prior</strong> to the scheduled time, I will be charged a <strong>$40 no-show fee</strong> to the payment method on file.
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};