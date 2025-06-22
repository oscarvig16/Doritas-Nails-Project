import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { Check, Clock, AlertTriangle, CreditCard } from 'lucide-react';
import { getBookingBySessionId, checkPaymentStatus, type Booking } from '../api/bookings';
import { sendBookingConfirmationEmail } from '../api/emails';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { formatInTimezone } from '../lib/timezone';
import { parseISO } from 'date-fns';

export const BookingSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [paymentMethodSaved, setPaymentMethodSaved] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const payOnSiteBooking = location.state?.booking;
    const isPayOnSite = location.state?.payOnSite;
    const paymentMethodSaved = location.state?.paymentMethodSaved;

    console.log('🔍 [SUCCESS PAGE] Initializing with:', {
      sessionId,
      isPayOnSite,
      hasPayOnSiteBooking: !!payOnSiteBooking,
      paymentMethodSaved
    });

    // Case 1: We have a Pay on Site booking from state
    if (payOnSiteBooking) {
      console.log('📋 [SUCCESS PAGE] Pay on Site booking received from state:', payOnSiteBooking.id);
      setBooking(payOnSiteBooking);
      setPaymentConfirmed(true); // Pay on site is considered "confirmed" for display
      setPaymentMethodSaved(!!paymentMethodSaved);
      setIsLoading(false);
      
      // Send confirmation email
      if (payOnSiteBooking.id && !emailSent) {
        sendBookingConfirmationEmail(payOnSiteBooking.id)
          .then(success => {
            console.log('📧 [SUCCESS PAGE] Confirmation email sent:', success);
            setEmailSent(true);
          })
          .catch(err => {
            console.error('❌ [SUCCESS PAGE] Error sending confirmation email:', err);
          });
      }
      return;
    }

    // Case 2: We have a session_id (Stripe checkout)
    if (sessionId) {
      console.log('🔍 [SUCCESS PAGE] Fetching booking by session ID:', sessionId);
      fetchBookingBySessionId(sessionId);
      return;
    }

    // Case 3: No identifiable information - try to find most recent booking
    if (!sessionId && !isPayOnSite) {
      console.log('🔍 [SUCCESS PAGE] No identifiers found, attempting to find most recent booking...');
      fetchMostRecentBooking();
      return;
    }
  }, [searchParams, location.state, emailSent]);

  const fetchMostRecentBooking = async () => {
    console.log('🔍 [SUCCESS PAGE] Attempting to fetch most recent booking');
    
    try {
      setIsLoading(true);
      setError(null);

      // Query for most recent booking with pending payment status
      const { data, error: queryError } = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-get-all-bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ filters: {} }),
      }).then(res => res.json());

      if (queryError) {
        console.error('❌ [SUCCESS PAGE] Error fetching most recent booking:', queryError);
        setError('Unable to find your booking. Please contact us if you need assistance.');
        setIsLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        console.log('⚠️ [SUCCESS PAGE] No recent bookings found');
        setError('No recent bookings found. Please contact us if you need assistance.');
        setIsLoading(false);
        return;
      }

      // Sort by created_at and get the most recent
      const sortedBookings = data.sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      const mostRecentBooking = sortedBookings[0];
      console.log('✅ [SUCCESS PAGE] Found most recent booking:', mostRecentBooking.id);
      
      setBooking(mostRecentBooking);
      setPaymentConfirmed(mostRecentBooking.payment_status === 'paid' || mostRecentBooking.payment_method === 'pay_on_site');
      
      // Send confirmation email
      if (mostRecentBooking.id && !emailSent) {
        sendBookingConfirmationEmail(mostRecentBooking.id)
          .then(success => {
            console.log('📧 [SUCCESS PAGE] Confirmation email sent:', success);
            setEmailSent(true);
          })
          .catch(err => {
            console.error('❌ [SUCCESS PAGE] Error sending confirmation email:', err);
          });
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('❌ [SUCCESS PAGE] Error in fetchMostRecentBooking:', err);
      setError('An unexpected error occurred. Please contact us if you need assistance.');
      setIsLoading(false);
    }
  };

  const fetchBookingBySessionId = async (sessionId: string) => {
    console.log('🔍 [SUCCESS PAGE] Fetching booking by session ID:', sessionId);
    
    try {
      setIsLoading(true);
      setError(null);

      // Wait a moment for webhook to process
      console.log('⏳ [SUCCESS PAGE] Waiting for webhook processing...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check payment status first
      console.log('💳 [SUCCESS PAGE] Checking payment status...');
      const paymentStatus = await checkPaymentStatus(sessionId);
      
      console.log('💳 [SUCCESS PAGE] Payment status:', paymentStatus);
      setPaymentConfirmed(paymentStatus === 'paid');

      // Fetch the booking by session ID
      console.log('🔍 [SUCCESS PAGE] Fetching booking details...');
      const bookingData = await getBookingBySessionId(sessionId);
      
      console.log('📋 [SUCCESS PAGE] Found booking:', bookingData?.id);
      setBooking(bookingData);
      
      // Send confirmation email
      if (bookingData?.id && !emailSent) {
        sendBookingConfirmationEmail(bookingData.id)
          .then(success => {
            console.log('📧 [SUCCESS PAGE] Confirmation email sent:', success);
            setEmailSent(true);
          })
          .catch(err => {
            console.error('❌ [SUCCESS PAGE] Error sending confirmation email:', err);
          });
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('❌ [SUCCESS PAGE] Error fetching booking:', err);
      
      if (err instanceof Error) {
        if (err.message.includes('No rows')) {
          console.log('⚠️ [SUCCESS PAGE] No booking found with session ID, trying most recent booking...');
          fetchMostRecentBooking();
          return;
        } else {
          setError('Unable to retrieve booking details. Please contact us if you need assistance.');
        }
      } else {
        setError('An unexpected error occurred. Please contact us if you need assistance.');
      }
      
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="font-raleway text-gray-800">
        <Navbar />
        <main className="pt-20 pb-20">
          <div className="container">
            <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-600">Confirming your booking details...</p>
              <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !booking) {
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
                Processing Your Booking
              </h1>
              
              <p className="text-gray-600 mb-8">
                {error || 'We are still processing your booking. Please check back in a few minutes or contact us if you need immediate assistance.'}
              </p>

              <div className="space-y-4">
                <button 
                  onClick={() => navigate('/')}
                  className="btn btn-primary w-full"
                >
                  Back to Home
                </button>
                
                <a 
                  href="tel:+1 (909) 838-7363"
                  className="btn btn-secondary w-full"
                >
                  Contact Us
                </a>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Handle split booking display
  const isSplitBooking = booking.splitBooking || (booking.bookingsCreated && booking.bookingsCreated.length > 1);
  const displayBookings = isSplitBooking ? booking.bookingsCreated : [booking];

  // Helper function to get status display
  const getStatusDisplay = (status: string, type: 'payment' | 'appointment') => {
    if (type === 'payment') {
      switch (status) {
        case 'paid':
          return 'text-green-600 bg-green-100';
        case 'pending':
          return 'text-yellow-600 bg-yellow-100';
        case 'failed':
          return 'text-red-600 bg-red-100';
        default:
          return 'text-gray-600 bg-gray-100';
      }
    } else {
      switch (status) {
        case 'completed':
          return 'text-green-600 bg-green-100';
        case 'pending':
          return 'text-yellow-600 bg-yellow-100';
        case 'cancelled':
          return 'text-red-600 bg-red-100';
        case 'no_show':
          return 'text-orange-600 bg-orange-100';
        default:
          return 'text-gray-600 bg-gray-100';
      }
    }
  };

  const getPaymentMethodDisplay = (method: string) => {
    switch (method) {
      case 'pay_on_site':
        return 'Pay on Site';
      case 'stripe':
        return 'Card Payment';
      default:
        return method;
    }
  };

  const getTechnicianDisplay = (booking: Booking) => {
    // First check if we have the assigned_employee from the admin query
    if (booking.assigned_employee) {
      return booking.assigned_employee.name;
    }
    
    // Fallback to technicians data
    const technicians = booking.technicians;
    if (!technicians) return 'Not assigned';
    
    // For auto-assigned bookings, show the actual employee name
    if (technicians.type === 'auto') {
      return 'Auto-assigned at your appointment';
    } else if (technicians.type === 'single') {
      return technicians.manicureTech?.name || 'Not specified';
    } else if (technicians.type === 'split') {
      const parts = [];
      if (technicians.manicureTech?.name) {
        parts.push(`${technicians.manicureTech.name} (Manicure)`);
      }
      if (technicians.pedicureTech?.name) {
        parts.push(`${technicians.pedicureTech.name} (Pedicure)`);
      }
      return parts.join(', ') || 'Not specified';
    }
    
    return 'Not specified';
  };

  const getTimeSlotDisplay = (booking: Booking) => {
    if (booking.start_time && booking.end_time) {
      return `${booking.start_time} - ${booking.end_time}`;
    }
    return booking.appointment_time;
  };

  return (
    <div className="font-raleway text-gray-800">
      <Navbar />
      <main className="pt-20 pb-20">
        <div className="container">
          <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              
              <h1 className="text-3xl font-playfair font-semibold mb-4">
                Thank You! Your Booking is Confirmed
              </h1>
              
              <p className="text-gray-600 mb-8">
                {booking.payment_method === 'pay_on_site' ? (
                  <>
                    Your appointment{isSplitBooking ? 's are' : ' is'} confirmed. You chose to pay on site. 
                    Please note that our no-show policy applies.
                  </>
                ) : paymentConfirmed ? (
                  <>
                    We've received your payment and your appointment{isSplitBooking ? 's are' : ' is'} confirmed. 
                    A confirmation email has been sent to {booking.customer_email}.
                  </>
                ) : (
                  <>
                    Your booking has been created. We're processing your payment confirmation.
                    You'll receive an email once everything is finalized.
                  </>
                )}
              </p>
            </div>

            {/* Display each booking */}
            {displayBookings.map((bookingItem, index) => {
              const statusDisplay = getStatusDisplay(
                bookingItem.appointment_status, 
                'appointment'
              );
              const paymentStatusDisplay = getStatusDisplay(
                bookingItem.payment_status,
                'payment'
              );

              return (
                <div key={bookingItem.id || index} className="bg-gray-50 rounded-lg p-6 mb-6 last:mb-8">
                  {isSplitBooking && (
                    <h2 className="text-xl font-playfair font-semibold mb-4">
                      Appointment {index + 1} - {bookingItem.services?.[0]?.category === 'manicure' ? 'Manicure' : 'Pedicure'} Services
                    </h2>
                  )}
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-gray-900">Date & Time</h3>
                      <p className="text-gray-600">
                        {formatInTimezone(parseISO(bookingItem.appointment_date), 'EEEE, MMMM d, yyyy')}
                      </p>
                      <p className="text-gray-600">
                        {getTimeSlotDisplay(bookingItem)} (Pacific Time)
                      </p>
                    </div>

                    {/* Dual Status Display */}
                    <div>
                      <h3 className="font-medium text-gray-900">Status</h3>
                      <div className="flex gap-4 mt-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">Payment:</span>
                          <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${paymentStatusDisplay}`}>
                            {bookingItem.payment_method === 'pay_on_site' ? 'Pay on Site' : bookingItem.payment_status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">Appointment:</span>
                          <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${statusDisplay}`}>
                            {bookingItem.appointment_status}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium text-gray-900">Services</h3>
                      <div className="space-y-2 mt-2">
                        {bookingItem.services?.map((service: any, serviceIndex: number) => (
                          <div key={serviceIndex} className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{service.title}</p>
                              {service.options && (
                                <p className="text-sm text-gray-600">
                                  {service.options.type}: {service.options.value}
                                </p>
                              )}
                            </div>
                            <span className="font-medium">${service.price}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium text-gray-900">Technician Assignment</h3>
                      <div className="text-gray-600">
                        {getTechnicianDisplay(bookingItem)}
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>Duration: {bookingItem.total_duration} minutes</span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Amount:</span>
                        <span className="ml-2 text-xl font-semibold text-primary">${bookingItem.total_price}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Total for split bookings */}
            {isSplitBooking && (
              <div className="bg-primary/5 rounded-lg p-6 mb-8">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total Amount:</span>
                  <span className="text-2xl font-bold text-primary">
                    ${displayBookings.reduce((total, b) => total + (b.total_price || 0), 0)}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  Total Duration: {displayBookings.reduce((total, b) => total + (b.total_duration || 0), 0)} minutes
                </div>
                {isSplitBooking && (
                  <div className="text-sm text-gray-600 mt-1">
                    Sequential appointments with optimized time slots
                  </div>
                )}
              </div>
            )}

            {/* Email confirmation message */}
            <div className="bg-blue-50 rounded-lg p-6 mb-8">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-blue-800 mb-1">Confirmation Email Sent</h3>
                  <p className="text-blue-700">
                    A confirmation email has been sent to {booking.customer_email}. You'll also receive a reminder 24 hours before your appointment.
                  </p>
                </div>
              </div>
            </div>

            {/* Payment method saved message */}
            {paymentMethodSaved && (
              <div className="bg-green-50 rounded-lg p-6 mb-8">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-green-800 mb-1">Payment Method Saved</h3>
                    <p className="text-green-700">
                      Your payment method has been securely saved. It will only be charged if you miss your appointment without canceling.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <button 
                onClick={() => navigate('/')}
                className="btn btn-primary w-full"
              >
                Back to Home
              </button>
              
              <a 
                href="https://www.instagram.com/dorita_nails1?igsh=NTc4MTIwNjQ2YQ=="
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary w-full"
              >
                Follow us on Instagram
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};