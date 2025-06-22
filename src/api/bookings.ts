import { supabase } from '../lib/supabase';
import { formatInTimezone } from '../lib/timezone';

export interface Booking {
  id?: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  appointment_date: string;
  appointment_time: string;
  start_time?: string;
  end_time?: string;
  services: any[];
  technicians: {
    type: 'single' | 'split' | 'auto';
    manicureTech?: { id: string; name: string };
    pedicureTech?: { id: string; name: string };
  };
  total_price: number;
  total_duration: number;
  payment_status: 'pending' | 'paid' | 'failed';
  appointment_status?: 'pending' | 'completed' | 'cancelled' | 'no_show'; // Cleaned up statuses
  payment_method?: 'stripe' | 'pay_on_site';
  no_show_policy_accepted?: boolean;
  stripe_session_id?: string;
  stripe_customer_id?: string;
  employee_id?: string;
  bookingsCreated?: Booking[];
  splitBooking?: boolean;
}

// Helper function to calculate time slots for split bookings
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
    end_time: formatTime(endMinutes),
    duration: totalDuration
  };
};

// Secure employee assignment using Edge Function
const assignEmployeeSecurely = async (technicianName: string | null, serviceTypes: string[], bookingType: string) => {
  console.log(`🔒 [CLIENT] Calling secure employee assignment Edge Function`);
  console.log(`  - Technician: "${technicianName}"`);
  console.log(`  - Service Types: ${JSON.stringify(serviceTypes)}`);
  console.log(`  - Booking Type: ${bookingType}`);

  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assign-employee`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        technicianName,
        serviceTypes,
        bookingType
      })
    });

    if (!response.ok) {
      throw new Error(`Edge Function request failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.success && result.employee) {
      console.log(`✅ [CLIENT] Employee assignment successful:`, {
        name: result.employee.name,
        id: result.employee.id,
        assignmentType: result.assignmentType
      });
      return result.employee;
    } else {
      console.log(`❌ [CLIENT] Employee assignment failed:`, result);
      return null;
    }
  } catch (error) {
    console.error(`❌ [CLIENT] Error calling employee assignment Edge Function:`, error);
    return null;
  }
};

// Helper function to get services by category
const getServicesByCategory = (services: any[], category: string) => {
  return services.filter(service => 
    service.category?.toLowerCase() === category.toLowerCase()
  );
};

// Helper function to calculate total for services
const calculateServicesTotal = (services: any[]) => {
  return services.reduce((total, service) => total + (service.price || 0), 0);
};

// Helper function to calculate duration for services
const calculateServicesDuration = (services: any[]) => {
  return services.reduce((total, service) => {
    const duration = service.duration || '0min';
    let minutes = 0;
    const hourMatch = duration.match(/(\d+)\s*h/);
    const minuteMatch = duration.match(/(\d+)\s*min/);
    
    if (hourMatch) minutes += parseInt(hourMatch[1]) * 60;
    if (minuteMatch) minutes += parseInt(minuteMatch[1]);
    
    return total + minutes;
  }, 0);
};

// Extract service types from booking data
const extractServiceTypes = (services: any[]) => {
  const types = new Set<string>();
  services.forEach(service => {
    if (service.category) {
      types.add(service.category.toLowerCase());
    }
  });
  return Array.from(types);
};

// Validate booking data before creation
const validateBookingData = (bookingData: Booking) => {
  const errors: string[] = [];

  // Required fields validation
  if (!bookingData.customer_first_name?.trim()) {
    errors.push('Customer first name is required');
  }
  if (!bookingData.customer_last_name?.trim()) {
    errors.push('Customer last name is required');
  }
  if (!bookingData.customer_email?.trim()) {
    errors.push('Customer email is required');
  }
  if (!bookingData.appointment_date) {
    errors.push('Appointment date is required');
  }
  if (!bookingData.appointment_time) {
    errors.push('Appointment time is required');
  }
  if (!bookingData.services || bookingData.services.length === 0) {
    errors.push('At least one service is required');
  }
  if (!bookingData.technicians) {
    errors.push('Technician assignment is required');
  }
  if (!bookingData.total_price || bookingData.total_price <= 0) {
    errors.push('Valid total price is required');
  }
  if (!bookingData.total_duration || bookingData.total_duration <= 0) {
    errors.push('Valid total duration is required');
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (bookingData.customer_email && !emailRegex.test(bookingData.customer_email)) {
    errors.push('Valid email address is required');
  }

  // Appointment status validation (cleaned up)
  if (bookingData.appointment_status && !['pending', 'completed', 'cancelled', 'no_show'].includes(bookingData.appointment_status)) {
    errors.push('Invalid appointment status. Must be: pending, completed, cancelled, or no_show');
  }

  return errors;
};

export const createBooking = async (bookingData: Booking) => {
  console.log('🔥 [CLIENT] Booking request received:', JSON.stringify(bookingData, null, 2));
  console.log('🔒 [CLIENT] Using secure Edge Function for employee assignment');
  
  try {
    // STEP 1: Validate booking data
    const validationErrors = validateBookingData(bookingData);
    if (validationErrors.length > 0) {
      console.error('❌ [CLIENT] Booking validation failed:', validationErrors);
      throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
    }

    // STEP 2: Set default status values if not provided (cleaned up statuses)
    const processedBookingData = {
      ...bookingData,
      appointment_status: bookingData.appointment_status || 'pending', // Only valid statuses
      payment_status: bookingData.payment_status || 'pending',
      payment_method: bookingData.payment_method || 'pay_on_site',
      no_show_policy_accepted: bookingData.no_show_policy_accepted || false,
      technicians: bookingData.technicians || { type: 'auto' as const }
    };

    console.log('🔍 [CLIENT] PROCESSED BOOKING DATA:');
    console.log('  Appointment Status:', processedBookingData.appointment_status);
    console.log('  Payment Status:', processedBookingData.payment_status);
    console.log('  Payment Method:', processedBookingData.payment_method);
    console.log('  Technician Type:', processedBookingData.technicians.type);

    // STEP 3: Handle different technician assignment types
    if (processedBookingData.technicians.type === 'split') {
      console.log('🔄 [CLIENT] SPLIT TECHNICIANS: Creating separate bookings for manicure and pedicure');
      const results = await createSplitBookings(processedBookingData);
      
      // Return consistent response format for split bookings
      return {
        ...processedBookingData,
        id: results.length > 0 ? results[0].id : null,
        bookingsCreated: results,
        splitBooking: true
      };
    } else {
      console.log('🔄 [CLIENT] SINGLE/AUTO BOOKING: Creating one booking');
      const result = await createSingleBooking(processedBookingData);
      
      // Return the booking data directly for single bookings
      return result;
    }
  } catch (error) {
    console.error('❌ [CLIENT] Error in createBooking:', error);
    
    // Enhanced error logging
    if (error instanceof Error) {
      console.error('❌ [CLIENT] Error details:', {
        message: error.message,
        stack: error.stack,
        bookingData: JSON.stringify(bookingData, null, 2)
      });
    }
    
    throw error;
  }
};

// Create separate bookings for split technicians with secure employee assignment and time slots
const createSplitBookings = async (bookingData: Booking) => {
  const manicureServices = getServicesByCategory(bookingData.services, 'manicure');
  const pedicureServices = getServicesByCategory(bookingData.services, 'pedicure');
  
  console.log('📋 [CLIENT] Split booking analysis:');
  console.log('  Manicure services:', manicureServices.length);
  console.log('  Pedicure services:', pedicureServices.length);

  const createdBookings = [];
  let currentTime = bookingData.appointment_time;

  try {
    // Create manicure booking if there are manicure services
    if (manicureServices.length > 0 && bookingData.technicians.manicureTech) {
      console.log('💅 [CLIENT] Creating manicure booking...');
      
      const manicureEmployee = await assignEmployeeSecurely(
        bookingData.technicians.manicureTech.name,
        ['manicure'],
        'specific'
      );

      // Calculate time slot for manicure
      const manicureTimeSlot = calculateTimeSlots(currentTime, manicureServices);
      
      const manicureBooking = {
        customer_first_name: bookingData.customer_first_name,
        customer_last_name: bookingData.customer_last_name,
        customer_email: bookingData.customer_email,
        appointment_date: bookingData.appointment_date,
        appointment_time: currentTime,
        start_time: manicureTimeSlot.start_time,
        end_time: manicureTimeSlot.end_time,
        services: manicureServices,
        technicians: {
          type: 'single' as const,
          manicureTech: {
            ...bookingData.technicians.manicureTech,
            // Use actual employee name from Edge Function if available
            name: manicureEmployee?.name || bookingData.technicians.manicureTech.name
          }
        },
        total_price: calculateServicesTotal(manicureServices),
        total_duration: calculateServicesDuration(manicureServices),
        payment_status: bookingData.payment_status,
        appointment_status: bookingData.appointment_status,
        payment_method: bookingData.payment_method,
        no_show_policy_accepted: bookingData.no_show_policy_accepted,
        stripe_session_id: bookingData.stripe_session_id,
        stripe_customer_id: bookingData.stripe_customer_id,
        employee_id: manicureEmployee?.id || null
      };

      console.log('📝 [CLIENT] Manicure booking payload:', JSON.stringify(manicureBooking, null, 2));

      const { data: manicureResult, error: manicureError } = await supabase
        .from('bookings')
        .insert([manicureBooking])
        .select()
        .single();

      if (manicureError) {
        console.error('❌ [CLIENT] Manicure booking creation error:', manicureError);
        console.error('❌ [CLIENT] Manicure booking payload that failed:', JSON.stringify(manicureBooking, null, 2));
        throw manicureError;
      }

      console.log('✅ [CLIENT] Manicure booking created:', {
        id: manicureResult.id,
        employee_id: manicureResult.employee_id,
        employee_name: manicureEmployee?.name || 'Unknown',
        time_slot: `${manicureTimeSlot.start_time} - ${manicureTimeSlot.end_time}`
      });
      createdBookings.push(manicureResult);

      // Update current time for next booking (pedicure starts after manicure ends)
      currentTime = manicureTimeSlot.end_time;
    }

    // Create pedicure booking if there are pedicure services
    if (pedicureServices.length > 0 && bookingData.technicians.pedicureTech) {
      console.log('🦶 [CLIENT] Creating pedicure booking...');
      
      const pedicureEmployee = await assignEmployeeSecurely(
        bookingData.technicians.pedicureTech.name,
        ['pedicure'],
        'specific'
      );

      // Calculate time slot for pedicure (starts after manicure ends)
      const pedicureTimeSlot = calculateTimeSlots(currentTime, pedicureServices);
      
      const pedicureBooking = {
        customer_first_name: bookingData.customer_first_name,
        customer_last_name: bookingData.customer_last_name,
        customer_email: bookingData.customer_email,
        appointment_date: bookingData.appointment_date,
        appointment_time: currentTime,
        start_time: pedicureTimeSlot.start_time,
        end_time: pedicureTimeSlot.end_time,
        services: pedicureServices,
        technicians: {
          type: 'single' as const,
          pedicureTech: {
            ...bookingData.technicians.pedicureTech,
            // Use actual employee name from Edge Function if available
            name: pedicureEmployee?.name || bookingData.technicians.pedicureTech.name
          }
        },
        total_price: calculateServicesTotal(pedicureServices),
        total_duration: calculateServicesDuration(pedicureServices),
        payment_status: bookingData.payment_status,
        appointment_status: bookingData.appointment_status,
        payment_method: bookingData.payment_method,
        no_show_policy_accepted: bookingData.no_show_policy_accepted,
        stripe_session_id: bookingData.stripe_session_id,
        stripe_customer_id: bookingData.stripe_customer_id,
        employee_id: pedicureEmployee?.id || null
      };

      console.log('📝 [CLIENT] Pedicure booking payload:', JSON.stringify(pedicureBooking, null, 2));

      const { data: pedicureResult, error: pedicureError } = await supabase
        .from('bookings')
        .insert([pedicureBooking])
        .select()
        .single();

      if (pedicureError) {
        console.error('❌ [CLIENT] Pedicure booking creation error:', pedicureError);
        console.error('❌ [CLIENT] Pedicure booking payload that failed:', JSON.stringify(pedicureBooking, null, 2));
        throw pedicureError;
      }

      console.log('✅ [CLIENT] Pedicure booking created:', {
        id: pedicureResult.id,
        employee_id: pedicureResult.employee_id,
        employee_name: pedicureEmployee?.name || 'Unknown',
        time_slot: `${pedicureTimeSlot.start_time} - ${pedicureTimeSlot.end_time}`
      });
      createdBookings.push(pedicureResult);
    }

    console.log(`🎉 [CLIENT] Split bookings completed: ${createdBookings.length} bookings created`);
    
    // Return all created bookings for split flow
    return createdBookings;
  } catch (error) {
    console.error('❌ [CLIENT] Error in createSplitBookings:', error);
    throw error;
  }
};

// Create single booking with secure auto-assign logic
const createSingleBooking = async (bookingData: Booking) => {
  let finalEmployeeRecord = null;
  let technicianName = '';

  try {
    const serviceTypes = extractServiceTypes(bookingData.services);
    
    if (bookingData.technicians.type === 'auto') {
      console.log('🤖 [CLIENT] AUTO-ASSIGN: Using Edge Function for auto-assignment');
      
      finalEmployeeRecord = await assignEmployeeSecurely(
        null,
        serviceTypes,
        'auto'
      );
      technicianName = finalEmployeeRecord?.name || 'Auto-assigned';

    } else if (bookingData.technicians.type === 'single') {
      console.log(`👤 [CLIENT] SINGLE TECHNICIAN: Using Edge Function for specific assignment`);
      
      if (bookingData.technicians.manicureTech?.name) {
        technicianName = bookingData.technicians.manicureTech.name.trim();
        console.log('✅ [CLIENT] Single technician extracted:', technicianName);
        
        finalEmployeeRecord = await assignEmployeeSecurely(
          technicianName,
          serviceTypes,
          'specific'
        );
      }
    }

    // Calculate time slot for single booking
    const timeSlot = calculateTimeSlots(bookingData.appointment_time, bookingData.services);

    // STEP 3: Log final employee record and employee_id
    console.log('🎯 [CLIENT] FINAL finalEmployeeRecord for booking:', finalEmployeeRecord);
    console.log('✅ [CLIENT] Final employee_id to insert:', finalEmployeeRecord?.id || null);

    // STEP 4: Create booking payload with EXPLICIT employee_id and dual status
    const bookingPayload = {
      customer_first_name: bookingData.customer_first_name,
      customer_last_name: bookingData.customer_last_name,
      customer_email: bookingData.customer_email,
      appointment_date: bookingData.appointment_date,
      appointment_time: bookingData.appointment_time,
      start_time: timeSlot.start_time,
      end_time: timeSlot.end_time,
      services: bookingData.services,
      technicians: {
        ...bookingData.technicians,
        // Update technician name with actual employee name if auto-assigned
        ...(bookingData.technicians.type === 'auto' && finalEmployeeRecord && {
          manicureTech: { id: finalEmployeeRecord.id, name: finalEmployeeRecord.name }
        }),
        // Update technician name with actual employee name if single assignment
        ...(bookingData.technicians.type === 'single' && finalEmployeeRecord && bookingData.technicians.manicureTech && {
          manicureTech: { 
            ...bookingData.technicians.manicureTech,
            name: finalEmployeeRecord.name 
          }
        })
      },
      total_price: bookingData.total_price,
      total_duration: bookingData.total_duration,
      payment_status: bookingData.payment_status,
      appointment_status: bookingData.appointment_status, // Cleaned up status
      payment_method: bookingData.payment_method,
      no_show_policy_accepted: bookingData.no_show_policy_accepted,
      stripe_session_id: bookingData.stripe_session_id,
      stripe_customer_id: bookingData.stripe_customer_id,
      employee_id: finalEmployeeRecord?.id || null
    };

    console.log('📝 [CLIENT] COMPLETE BOOKING PAYLOAD:', JSON.stringify(bookingPayload, null, 2));

    // STEP 5: INSERT booking with the resolved employee_id
    const { data, error } = await supabase
      .from('bookings')
      .insert([bookingPayload])
      .select()
      .single();

    if (error) {
      console.error('❌ [CLIENT] Booking creation error:', error);
      console.error('❌ [CLIENT] Full error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      console.error('❌ [CLIENT] Booking payload that failed:', JSON.stringify(bookingPayload, null, 2));
      throw error;
    }
    
    // STEP 6: Verify the booking was created with correct data
    console.log('✅ [CLIENT] BOOKING CREATED SUCCESSFULLY:', {
      id: data.id,
      employee_id: data.employee_id,
      employee_name: finalEmployeeRecord?.name || 'Unknown',
      payment_status: data.payment_status,
      appointment_status: data.appointment_status,
      payment_method: data.payment_method,
      time_slot: `${timeSlot.start_time} - ${timeSlot.end_time}`
    });
    console.log('  - Customer:', data.customer_first_name, data.customer_last_name);
    console.log('  - Date/Time:', data.appointment_date, data.appointment_time);
    
    // CRITICAL: Verify the booking was created with correct employee_id
    if (data.employee_id) {
      console.log('🎉 [CLIENT] SUCCESS: Booking created with employee_id =', data.employee_id);
      console.log('🎉 [CLIENT] This booking will now appear in the employee panel!');
      
      // Additional verification: Check which employee this booking is assigned to
      if (finalEmployeeRecord) {
        console.log('🎉 [CLIENT] Booking assigned to:', finalEmployeeRecord.name, '(' + finalEmployeeRecord.email + ')');
      }
    } else {
      console.warn('⚠️ [CLIENT] WARNING: Booking created but employee_id is NULL');
      console.warn('⚠️ [CLIENT] This booking will NOT appear in employee panels!');
      console.warn('⚠️ [CLIENT] Technician data was:', JSON.stringify(bookingData.technicians, null, 2));
      console.warn('⚠️ [CLIENT] Extracted technician name was:', `"${technicianName}"`);
      console.warn('⚠️ [CLIENT] Final employee record was:', finalEmployeeRecord);
    }
    
    return data;
  } catch (error) {
    console.error('❌ [CLIENT] Error in createSingleBooking:', error);
    throw error;
  }
};

export const getBookingBySessionId = async (sessionId: string) => {
  console.log('🔍 [CLIENT] Looking up booking by session ID:', sessionId);
  
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('stripe_session_id', sessionId)
    .single();

  if (error) {
    console.error('❌ [CLIENT] Error fetching booking by session ID:', error);
    throw error;
  }

  console.log('✅ [CLIENT] Found booking:', data?.id);
  return data;
};

// Check payment status by session ID
export const checkPaymentStatus = async (sessionId: string): Promise<'paid' | 'pending' | 'failed'> => {
  try {
    console.log('🔍 [CLIENT] Checking payment status for session:', sessionId);
    
    const { data, error } = await supabase
      .from('bookings')
      .select('payment_status')
      .eq('stripe_session_id', sessionId)
      .single();

    if (error) {
      console.error('❌ [CLIENT] Error checking payment status:', error);
      return 'pending';
    }

    console.log('✅ [CLIENT] Payment status:', data?.payment_status);
    return data?.payment_status as 'paid' | 'pending' | 'failed';
  } catch (err) {
    console.error('❌ [CLIENT] Error in checkPaymentStatus:', err);
    return 'pending';
  }
};