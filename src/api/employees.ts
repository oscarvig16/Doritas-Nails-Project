import { supabase } from '../lib/supabase';

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: 'employee' | 'admin';
  auth_user_id?: string;
  created_at: string;
  updated_at: string;
}

export const getCurrentEmployee = async (): Promise<Employee | null> => {
  console.log('=== GETTING CURRENT EMPLOYEE ===');
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) {
    console.log('❌ No authenticated user found');
    return null;
  }

  console.log('✅ Auth user found:', user.id, user.email);

  try {
    // Use direct query with auth_user_id
    console.log('🔍 Looking up employee by auth_user_id:', user.id);
    
    const { data: employee, error } = await supabase
      .from('employees')
      .select('id, name, email, role, auth_user_id, created_at, updated_at')
      .eq('auth_user_id', user.id)
      .single();

    if (error) {
      console.log('❌ Error fetching employee by auth_user_id:', error);
      
      // Fallback: Try to find by email and link if found
      console.log('🔄 Trying fallback lookup by email:', user.email);
      
      const { data: employeeByEmail, error: emailError } = await supabase
        .from('employees')
        .select('id, name, email, role, auth_user_id, created_at, updated_at')
        .eq('email', user.email)
        .single();

      if (emailError) {
        console.log('❌ Employee not found by email either:', emailError);
        return null;
      }

      if (employeeByEmail && !employeeByEmail.auth_user_id) {
        // Link the employee to the auth user
        console.log('🔗 Linking employee to auth user...');
        
        const { data: updatedEmployee, error: updateError } = await supabase
          .from('employees')
          .update({ auth_user_id: user.id })
          .eq('id', employeeByEmail.id)
          .select('id, name, email, role, auth_user_id, created_at, updated_at')
          .single();

        if (updateError) {
          console.log('❌ Error linking employee to auth:', updateError);
          return employeeByEmail; // Return unlinked employee as fallback
        }

        console.log('✅ Successfully linked employee to auth:', updatedEmployee.name);
        return updatedEmployee;
      }

      return employeeByEmail;
    }

    if (employee) {
      console.log('✅ Found employee:', employee.name, employee.id, 'Role:', employee.role);
      return employee;
    }

    console.log('❌ No employee found');
    return null;

  } catch (err) {
    console.error('❌ Error in getCurrentEmployee:', err);
    return null;
  }
};

export const getEmployeeBookings = async (employeeId: string, date?: string) => {
  console.log('=== GETTING EMPLOYEE BOOKINGS ===');
  console.log('Employee ID:', employeeId);
  console.log('Date filter:', date);

  // Validate employeeId is provided
  if (!employeeId) {
    console.error('❌ No employeeId provided to getEmployeeBookings');
    throw new Error('Employee ID is required');
  }

  try {
    console.log('🔍 Fetching bookings directly for employee_id:', employeeId);
    
    // Build the query step by step
    let query = supabase
      .from('bookings')
      .select(`
        id,
        customer_first_name,
        customer_last_name,
        customer_email,
        appointment_date,
        appointment_time,
        start_time,
        end_time,
        services,
        technicians,
        total_price,
        total_duration,
        payment_status,
        appointment_status,
        payment_method,
        employee_notes,
        created_at,
        updated_at,
        employee_id,
        last_updated_by,
        stripe_setup_intent_id,
        stripe_customer_id
      `)
      .eq('employee_id', employeeId)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true });

    // Apply date filter if provided
    if (date) {
      query = query.eq('appointment_date', date);
      console.log('Applied date filter:', date);
    }

    console.log('🚀 Executing direct query for employee bookings...');
    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching employee bookings:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }

    console.log('✅ Query executed successfully');
    console.log('📊 Number of bookings returned:', data?.length || 0);
    
    if (data && data.length > 0) {
      console.log('📋 Sample booking data:');
      data.slice(0, 3).forEach((booking, index) => {
        console.log(`  ${index + 1}. ${booking.customer_first_name} ${booking.customer_last_name} - ${booking.appointment_date} ${booking.appointment_time} - Payment: ${booking.payment_status} - Appointment: ${booking.appointment_status}`);
      });
    } else {
      console.log('⚠️ No bookings found for employee_id:', employeeId);
      
      // Debug: Check if there are ANY bookings with this employee_id
      const { data: allBookingsForEmployee } = await supabase
        .from('bookings')
        .select('id, customer_first_name, customer_last_name, appointment_date, employee_id')
        .eq('employee_id', employeeId);
      
      console.log('🔍 All bookings for this employee (bypassing date filter):', allBookingsForEmployee?.length || 0);
      
      if (allBookingsForEmployee && allBookingsForEmployee.length > 0) {
        console.log('📅 Available dates for this employee:');
        const uniqueDates = [...new Set(allBookingsForEmployee.map(b => b.appointment_date))];
        uniqueDates.forEach(date => console.log(`  - ${date}`));
      }
    }

    return data || [];
  } catch (err) {
    console.error('❌ Error in getEmployeeBookings:', err);
    throw err;
  }
};

export const updateBookingStatus = async (
  bookingId: string,
  appointmentStatus?: string,
  paymentStatus?: string,
  notes?: string
) => {
  console.log('=== UPDATING BOOKING STATUS ===');
  console.log('Booking ID:', bookingId);
  console.log('New appointment status:', appointmentStatus);
  console.log('New payment status:', paymentStatus);
  console.log('Notes:', notes);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No authenticated user');

  // Get current employee
  const employee = await getCurrentEmployee();
  if (!employee) throw new Error('Employee not found');

  console.log('Current employee:', employee.name, employee.id);

  // Validate appointment status if provided (cleaned up statuses only)
  if (appointmentStatus && !['pending', 'completed', 'cancelled', 'no_show'].includes(appointmentStatus)) {
    throw new Error(`Invalid appointment status: ${appointmentStatus}. Must be one of: pending, completed, cancelled, no_show`);
  }

  // Validate payment status if provided
  if (paymentStatus && !['pending', 'paid', 'failed'].includes(paymentStatus)) {
    throw new Error(`Invalid payment status: ${paymentStatus}. Must be one of: pending, paid, failed`);
  }

  // Get current booking to log the change
  const { data: currentBooking } = await supabase
    .from('bookings')
    .select('appointment_status, payment_status')
    .eq('id', bookingId)
    .single();

  if (!currentBooking) throw new Error('Booking not found');

  console.log('Current booking statuses:', {
    appointment: currentBooking.appointment_status,
    payment: currentBooking.payment_status
  });

  // Prepare update object
  const updateData: any = {
    last_updated_by: employee.id,
    updated_at: new Date().toISOString()
  };

  if (appointmentStatus) {
    updateData.appointment_status = appointmentStatus;
  }

  if (paymentStatus) {
    updateData.payment_status = paymentStatus;
  }

  if (notes) {
    updateData.employee_notes = notes;
  }

  // Update booking
  const { error: updateError } = await supabase
    .from('bookings')
    .update(updateData)
    .eq('id', bookingId);

  if (updateError) {
    console.error('Error updating booking:', updateError);
    throw updateError;
  }

  // Determine status type for audit log
  let statusType = 'appointment';
  if (appointmentStatus && paymentStatus) {
    statusType = 'both';
  } else if (paymentStatus) {
    statusType = 'payment';
  }

  // Create audit log
  const auditData: any = {
    booking_id: bookingId,
    employee_id: employee.id,
    status_type: statusType,
    notes
  };

  if (appointmentStatus) {
    auditData.previous_status = currentBooking.appointment_status;
    auditData.new_status = appointmentStatus;
  }

  if (paymentStatus) {
    auditData.payment_previous_status = currentBooking.payment_status;
    auditData.payment_new_status = paymentStatus;
  }

  const { error: logError } = await supabase
    .from('booking_updates')
    .insert(auditData);

  if (logError) {
    console.error('Error creating audit log:', logError);
    throw logError;
  }

  console.log('✅ Booking status updated successfully');
  return true;
};