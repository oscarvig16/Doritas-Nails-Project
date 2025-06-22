// Admin API client for secure data access
// This module handles all admin-only operations through secure API routes

export interface AdminBookingFilters {
  employeeId?: string;
  dateFrom?: string;
  dateTo?: string;
  appointmentStatus?: string;
  paymentStatus?: string;
  searchTerm?: string;
}

export interface WorkloadStats {
  employeeId: string;
  employeeName: string;
  totalAppointments: number;
  totalDuration: number;
  completedAppointments: number;
  pendingAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
}

// Secure API call to get all bookings (admin only)
export const getAllBookingsSecure = async (filters?: AdminBookingFilters) => {
  console.log('🔒 [ADMIN API] Calling secure getAllBookings endpoint');
  console.log('🔍 [ADMIN API] Filters:', filters);

  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-get-all-bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ filters: filters || {} }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [ADMIN API] getAllBookings failed:', response.status, errorText);
      throw new Error(`Admin API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ [ADMIN API] getAllBookings success:', result.data?.length || 0, 'bookings');
    
    return result.data || [];
  } catch (error) {
    console.error('❌ [ADMIN API] Error in getAllBookingsSecure:', error);
    throw error;
  }
};

// Secure API call to get workload statistics (admin only)
export const getWorkloadStatsSecure = async (dateFrom: string, dateTo: string) => {
  console.log('📊 [ADMIN API] Calling secure getWorkloadStats endpoint');
  console.log('📅 [ADMIN API] Date range:', dateFrom, 'to', dateTo);

  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-get-workload-stats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ dateFrom, dateTo }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [ADMIN API] getWorkloadStats failed:', response.status, errorText);
      throw new Error(`Admin API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ [ADMIN API] getWorkloadStats success:', result.data?.length || 0, 'employees');
    
    return result.data || [];
  } catch (error) {
    console.error('❌ [ADMIN API] Error in getWorkloadStatsSecure:', error);
    throw error;
  }
};

// Get all employees for admin filtering
export const getAllEmployeesSecure = async () => {
  console.log('👥 [ADMIN API] Calling secure getAllEmployees endpoint');

  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-get-all-employees`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [ADMIN API] getAllEmployees failed:', response.status, errorText);
      throw new Error(`Admin API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ [ADMIN API] getAllEmployees success:', result.data?.length || 0, 'employees');
    
    return result.data || [];
  } catch (error) {
    console.error('❌ [ADMIN API] Error in getAllEmployeesSecure:', error);
    throw error;
  }
};