import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, subDays } from 'date-fns';
import { 
  Calendar, Search, Filter, Clock, User, CreditCard, 
  CheckCircle2, XCircle, AlertTriangle, Edit2, LogOut, Users,
  ToggleLeft, ToggleRight, BarChart3, DollarSign
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { 
  getCurrentEmployee, 
  getEmployeeBookings, 
  updateBookingStatus, 
  type Employee 
} from '../api/employees';
import { 
  getAllBookingsSecure,
  getWorkloadStatsSecure,
  getAllEmployeesSecure,
  type AdminBookingFilters,
  type WorkloadStats
} from '../api/admin';
import { getCurrentDateInTimezone, formatInTimezone } from '../lib/timezone';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { NoShowFeeModal } from '../components/NoShowFeeModal';

interface Booking {
  id: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  appointment_date: string;
  appointment_time: string;
  start_time?: string;
  end_time?: string;
  services: any[];
  technicians: any;
  total_price: number;
  total_duration: number;
  payment_status: string;
  appointment_status: string;
  payment_method: string;
  employee_notes?: string;
  employee?: { name: string; email: string };
  updated_by?: { name: string; email: string };
  assigned_employee?: { id: string; name: string; email: string };
  stripe_setup_intent_id?: string;
  stripe_customer_id?: string;
  stripe_session_id?: string;
  no_show_policy_accepted?: boolean;
}

export const EmployeePanel: React.FC = () => {
  const navigate = useNavigate();
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [workloadStats, setWorkloadStats] = useState<WorkloadStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // View toggle state
  const [isAdminView, setIsAdminView] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>(getCurrentDateInTimezone());
  const [dateFromFilter, setDateFromFilter] = useState<string>(() => {
    // Default to 7 days ago
    const sevenDaysAgo = subDays(new Date(), 7);
    return format(sevenDaysAgo, 'yyyy-MM-dd');
  });
  const [dateToFilter, setDateToFilter] = useState<string>(getCurrentDateInTimezone());
  
  // Modal states
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isNoShowFeeModalOpen, setIsNoShowFeeModalOpen] = useState(false);
  const [newAppointmentStatus, setNewAppointmentStatus] = useState<string>('');
  const [newPaymentStatus, setNewPaymentStatus] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  useEffect(() => {
    if (currentEmployee) {
      if (isAdminView) {
        fetchAllBookingsSecure();
        fetchWorkloadStatsSecure();
      } else {
        fetchEmployeeBookings();
      }
    }
  }, [dateFilter, dateFromFilter, dateToFilter, statusFilter, paymentFilter, employeeFilter, currentEmployee, isAdminView]);

  const checkAuthAndLoadData = async () => {
    console.log('=== CHECKING AUTH AND LOADING DATA ===');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('❌ No session found, redirecting to login');
        navigate('/employee/login');
        return;
      }

      console.log('✅ Session found, getting current employee...');
      const employee = await getCurrentEmployee();
      
      console.log('📋 Current employee result:', employee);
      
      if (!employee) {
        console.log('❌ No employee profile found');
        setError('Employee profile not found. Please contact administrator.');
        await supabase.auth.signOut();
        navigate('/employee/login');
        return;
      }

      console.log('✅ Employee found:', employee.name, employee.id, 'Role:', employee.role);
      setCurrentEmployee(employee);
      
      // Load all employees for admin filtering
      if (employee.role === 'admin') {
        try {
          const employees = await getAllEmployeesSecure();
          setAllEmployees(employees);
        } catch (err) {
          console.error('❌ Error fetching all employees:', err);
          // Non-critical error, don't block the UI
        }
      }
      
    } catch (err) {
      console.error('❌ Auth check error:', err);
      setError('Authentication failed. Please try logging in again.');
      navigate('/employee/login');
    }
  };

  const fetchEmployeeBookings = async () => {
    if (!currentEmployee) {
      console.log('❌ No current employee, skipping booking fetch');
      return;
    }

    console.log('=== FETCHING EMPLOYEE BOOKINGS ===');

    try {
      setLoading(true);
      setError(null);

      console.log('🚀 Calling getEmployeeBookings with employee ID:', currentEmployee.id);
      
      let data = await getEmployeeBookings(currentEmployee.id, dateFilter);

      console.log('📊 Raw bookings returned:', data?.length || 0);

      // Apply status filter
      if (statusFilter !== 'all') {
        data = data.filter(booking => booking.appointment_status === statusFilter);
        console.log('📊 After status filter:', data?.length || 0);
      }

      // Apply payment filter
      if (paymentFilter !== 'all') {
        data = data.filter(booking => booking.payment_status === paymentFilter);
        console.log('📊 After payment filter:', data?.length || 0);
      }

      console.log('✅ Setting bookings state with', data?.length || 0, 'bookings');
      setBookings(data || []);
      
    } catch (err) {
      console.error('❌ Error fetching bookings:', err);
      setError('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllBookingsSecure = async () => {
    if (!currentEmployee || currentEmployee.role !== 'admin') {
      console.log('❌ Not an admin, skipping admin bookings fetch');
      return;
    }

    console.log('=== FETCHING ALL BOOKINGS (ADMIN) ===');

    try {
      setLoading(true);
      setError(null);

      const filters: AdminBookingFilters = {};
      
      if (employeeFilter !== 'all') {
        filters.employeeId = employeeFilter;
        console.log('🔍 Using employee filter:', employeeFilter);
      }
      
      if (dateFromFilter) {
        filters.dateFrom = dateFromFilter;
        console.log('🔍 Using date from filter:', dateFromFilter);
      }
      
      if (dateToFilter) {
        filters.dateTo = dateToFilter;
        console.log('🔍 Using date to filter:', dateToFilter);
      }
      
      if (statusFilter !== 'all') {
        filters.appointmentStatus = statusFilter;
        console.log('🔍 Using appointment status filter:', statusFilter);
      }
      
      if (paymentFilter !== 'all') {
        filters.paymentStatus = paymentFilter;
        console.log('🔍 Using payment status filter:', paymentFilter);
      }
      
      if (searchTerm) {
        filters.searchTerm = searchTerm;
        console.log('🔍 Using search term filter:', searchTerm);
      }

      console.log('🚀 Calling getAllBookingsSecure with filters:', filters);
      const data = await getAllBookingsSecure(filters);
      
      console.log('📊 Admin bookings returned:', data?.length || 0);
      setBookings(data || []);
      
    } catch (err) {
      console.error('❌ Error fetching all bookings:', err);
      setError('Failed to load appointments. Please ensure you have admin access.');
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkloadStatsSecure = async () => {
    if (!currentEmployee || currentEmployee.role !== 'admin') {
      console.log('❌ Not an admin, skipping workload stats');
      return;
    }

    try {
      console.log('=== FETCHING WORKLOAD STATS ===');
      const dateFrom = dateFromFilter || getCurrentDateInTimezone();
      const dateTo = dateToFilter || getCurrentDateInTimezone();
      
      console.log('🔍 Date range:', dateFrom, 'to', dateTo);
      console.log('🚀 Calling getWorkloadStatsSecure...');
      
      const stats = await getWorkloadStatsSecure(dateFrom, dateTo);
      console.log('📊 Workload stats returned for', stats.length, 'employees');
      
      setWorkloadStats(stats);
    } catch (err) {
      console.error('❌ Error fetching workload stats:', err);
      // Non-critical error, don't block the UI
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedBooking || (!newAppointmentStatus && !newPaymentStatus) || isUpdating) return;

    try {
      setIsUpdating(true);
      await updateBookingStatus(
        selectedBooking.id, 
        newAppointmentStatus || undefined,
        newPaymentStatus || undefined,
        notes || undefined
      );
      
      setIsUpdateModalOpen(false);
      setSelectedBooking(null);
      setNewAppointmentStatus('');
      setNewPaymentStatus('');
      setNotes('');
      
      // Refresh bookings
      if (isAdminView) {
        await fetchAllBookingsSecure();
      } else {
        await fetchEmployeeBookings();
      }
    } catch (err) {
      console.error('Error updating booking:', err);
      setError('Failed to update appointment status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleNoShowFeeCharge = async () => {
    // Refresh bookings after successful charge
    if (isAdminView) {
      await fetchAllBookingsSecure();
    } else {
      await fetchEmployeeBookings();
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/employee/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleViewToggle = () => {
    if (currentEmployee?.role === 'admin') {
      setIsAdminView(!isAdminView);
      // Reset filters when switching views
      setSearchTerm('');
      setStatusFilter('all');
      setPaymentFilter('all');
      setEmployeeFilter('all');
      setDateFilter(getCurrentDateInTimezone());
      
      if (!isAdminView) {
        // When switching to admin view, set default date range to last 7 days
        const sevenDaysAgo = subDays(new Date(), 7);
        setDateFromFilter(format(sevenDaysAgo, 'yyyy-MM-dd'));
        setDateToFilter(getCurrentDateInTimezone());
      } else {
        setDateFromFilter('');
        setDateToFilter('');
      }
    }
  };

  const getStatusColor = (status: string, type: 'payment' | 'appointment') => {
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
      return currentEmployee?.name || 'Auto-assigned';
    } else if (technicians.type === 'single') {
      return technicians.manicureTech?.name || currentEmployee?.name || 'Not specified';
    } else if (technicians.type === 'split') {
      const parts = [];
      if (technicians.manicureTech?.name) {
        parts.push(`${technicians.manicureTech.name} (Manicure)`);
      }
      if (technicians.pedicureTech?.name) {
        parts.push(`${technicians.pedicureTech.name} (Pedicure)`);
      }
      return parts.join(', ') || currentEmployee?.name || 'Not specified';
    }
    
    return currentEmployee?.name || 'Not specified';
  };

  const getTimeSlotDisplay = (booking: Booking) => {
    if (booking.start_time && booking.end_time) {
      return `${booking.start_time} - ${booking.end_time}`;
    }
    return booking.appointment_time;
  };

  const isBookingFulfilled = (booking: Booking) => {
    return booking.payment_status === 'paid' && booking.appointment_status === 'completed';
  };

  // Check if a booking is eligible for no-show fee charging
  const canChargeNoShowFee = (booking: Booking) => {
    console.log('🔍 [ADMIN] Checking if booking can be charged no-show fee:', booking.id);
    console.log('  - appointment_status:', booking.appointment_status);
    console.log('  - payment_status:', booking.payment_status);
    console.log('  - payment_method:', booking.payment_method);
    console.log('  - stripe_setup_intent_id:', booking.stripe_setup_intent_id ? 'exists' : 'missing');
    console.log('  - stripe_customer_id:', booking.stripe_customer_id ? 'exists' : 'missing');
    console.log('  - stripe_session_id:', booking.stripe_session_id ? 'exists' : 'null');
    console.log('  - no_show_policy_accepted:', booking.no_show_policy_accepted);
    
    const canCharge = (
      booking.appointment_status === 'no_show' && 
      booking.payment_status === 'pending' &&
      booking.payment_method === 'pay_on_site' &&
      booking.stripe_setup_intent_id !== null &&
      booking.stripe_setup_intent_id !== undefined &&
      booking.stripe_customer_id !== null &&
      booking.stripe_customer_id !== undefined &&
      booking.stripe_session_id === null &&
      booking.no_show_policy_accepted === true
    );
    
    console.log('  - Can charge no-show fee:', canCharge);
    return canCharge;
  };

  const filteredBookings = bookings.filter(booking => {
    const searchString = `${booking.customer_first_name} ${booking.customer_last_name} ${booking.customer_email}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  // CRITICAL FIX: Show clear error if no currentEmployee
  if (!currentEmployee && !loading && !error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="container py-8 mt-16">
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-red-600 mb-4">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
              <h2 className="text-xl font-semibold">Employee Profile Not Found</h2>
              <p className="text-gray-600 mt-2">
                Unable to load your employee profile. Please contact administrator.
              </p>
            </div>
            <button 
              onClick={() => navigate('/employee/login')}
              className="btn btn-primary w-full"
            >
              Back to Login
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading employee profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="container py-8 mt-16">
        <div className="bg-white rounded-lg shadow-lg p-6">
          {/* Header with Employee Info, View Toggle, and Logout */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h1 className="text-2xl font-semibold">
                {isAdminView ? 'Owner Dashboard' : 'Appointment Management'}
              </h1>
              {currentEmployee && (
                <div className="flex items-center gap-2 text-gray-600 mt-1">
                  <User className="w-4 h-4" />
                  <span>
                    {currentEmployee.name} ({currentEmployee.role}) • {formatInTimezone(new Date(), 'EEEE, MMMM d, yyyy')}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              {/* Admin View Toggle - Only for Dora */}
              {currentEmployee?.role === 'admin' && (
                <button
                  onClick={handleViewToggle}
                  className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                >
                  {isAdminView ? (
                    <>
                      <ToggleRight className="w-5 h-5" />
                      <span>Switch to Employee View</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-5 h-5" />
                      <span>Switch to Owner Panel</span>
                    </>
                  )}
                </button>
              )}
              
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>

          {/* Admin View: Workload Statistics */}
          {isAdminView && workloadStats.length > 0 && (
            <div className="mb-8 bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Technician Workload Overview
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workloadStats.map((stat) => (
                  <div key={stat.employeeId} className="bg-white rounded-lg p-4 shadow-sm">
                    <h4 className="font-medium text-gray-900 mb-2">{stat.employeeName}</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Appointments:</span>
                        <span className="font-medium">{stat.totalAppointments}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Duration:</span>
                        <span className="font-medium">{Math.round(stat.totalDuration / 60)}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-600">Completed:</span>
                        <span className="font-medium">{stat.completedAppointments}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-yellow-600">Pending:</span>
                        <span className="font-medium">{stat.pendingAppointments}</span>
                      </div>
                      {stat.noShowAppointments > 0 && (
                        <div className="flex justify-between">
                          <span className="text-orange-600">No Shows:</span>
                          <span className="font-medium">{stat.noShowAppointments}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div className="flex flex-wrap gap-4">
              {/* Date Filters - Different for Admin vs Employee */}
              {isAdminView ? (
                <>
                  <div className="relative">
                    <label className="block text-xs text-gray-500 mb-1">From Date</label>
                    <Calendar className="absolute left-3 top-8 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="date"
                      value={dateFromFilter}
                      onChange={(e) => setDateFromFilter(e.target.value)}
                      className="pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none text-sm"
                    />
                  </div>
                  <div className="relative">
                    <label className="block text-xs text-gray-500 mb-1">To Date</label>
                    <Calendar className="absolute left-3 top-8 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="date"
                      value={dateToFilter}
                      onChange={(e) => setDateToFilter(e.target.value)}
                      className="pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none text-sm"
                    />
                  </div>
                </>
              ) : (
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                  />
                </div>
              )}

              {/* Employee Filter - Only for Admin */}
              {isAdminView && (
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <select
                    value={employeeFilter}
                    onChange={(e) => setEmployeeFilter(e.target.value)}
                    className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none appearance-none bg-white"
                  >
                    <option value="all">All Technicians</option>
                    {allEmployees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Status Filters */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none appearance-none bg-white"
                >
                  <option value="all">All Appointment Status</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="no_show">No Show</option>
                </select>
              </div>

              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none appearance-none bg-white"
                >
                  <option value="all">All Payment Status</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading appointments...</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {searchTerm 
                  ? 'No appointments found matching your search' 
                  : isAdminView 
                  ? 'No appointments found for the selected filters'
                  : 'No appointments assigned to you for this date'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Time Slot</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Client</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Services</th>
                    {isAdminView && (
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Technician</th>
                    )}
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Payment</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Appointment</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredBookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <div className="text-sm">
                            <div>{getTimeSlotDisplay(booking)}</div>
                            {booking.start_time && booking.end_time && (
                              <div className="text-xs text-gray-500">
                                Duration: {booking.total_duration} min
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <div className="font-medium">
                            {booking.customer_first_name} {booking.customer_last_name}
                          </div>
                          <div className="text-sm text-gray-500">{booking.customer_email}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          {booking.services.map((service: any, index: number) => (
                            <div key={index} className="text-sm">
                              {service.title}
                              {service.options && (
                                <span className="text-gray-500 text-xs block">
                                  {service.options.type}: {service.options.value}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>
                      {isAdminView && (
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-gray-400" />
                            <div className="text-sm">
                              {getTechnicianDisplay(booking)}
                            </div>
                          </div>
                        </td>
                      )}
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(booking.payment_status, 'payment')}`}>
                            {booking.payment_status}
                          </span>
                          <div className="text-xs text-gray-500">
                            {getPaymentMethodDisplay(booking.payment_method)} • ${booking.total_price}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(booking.appointment_status, 'appointment')}`}>
                          {booking.appointment_status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {isBookingFulfilled(booking) && (
                            <div className="flex items-center gap-1 text-green-600 text-xs">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Fulfilled</span>
                            </div>
                          )}
                          {/* No-Show Charge Button - Only for Admin and eligible bookings */}
                          {isAdminView && 
                           currentEmployee?.role === 'admin' && 
                           canChargeNoShowFee(booking) && (
                            <button
                              className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs hover:bg-orange-200 transition-colors"
                              onClick={() => {
                                console.log('🔍 [ADMIN] Clicked charge no-show fee for booking:', booking.id);
                                console.log('  - appointment_status:', booking.appointment_status);
                                console.log('  - payment_status:', booking.payment_status);
                                console.log('  - payment_method:', booking.payment_method);
                                console.log('  - stripe_setup_intent_id:', booking.stripe_setup_intent_id);
                                console.log('  - stripe_customer_id:', booking.stripe_customer_id);
                                console.log('  - stripe_session_id:', booking.stripe_session_id);
                                setSelectedBooking(booking);
                                setIsNoShowFeeModalOpen(true);
                              }}
                            >
                              <DollarSign className="w-3 h-3" />
                              <span>Charge No-Show</span>
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <button
                          onClick={() => {
                            setSelectedBooking(booking);
                            setNewAppointmentStatus(booking.appointment_status);
                            setNewPaymentStatus(booking.payment_status);
                            setNotes(booking.employee_notes || '');
                            setIsUpdateModalOpen(true);
                          }}
                          className="text-primary hover:text-primary/80 transition-colors"
                          title="Update status"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Enhanced Status Update Modal */}
      {isUpdateModalOpen && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-4">Update Appointment Status</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client
                </label>
                <p className="text-sm text-gray-600">
                  {selectedBooking.customer_first_name} {selectedBooking.customer_last_name}
                </p>
                <p className="text-xs text-gray-500">
                  {getTimeSlotDisplay(selectedBooking)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Status
                  </label>
                  <select
                    value={newPaymentStatus}
                    onChange={(e) => setNewPaymentStatus(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Appointment Status
                  </label>
                  <select
                    value={newAppointmentStatus}
                    onChange={(e) => setNewAppointmentStatus(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                  >
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="no_show">No Show</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                  rows={3}
                  placeholder="Add any notes about this update..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setIsUpdateModalOpen(false)}
                  disabled={isUpdating}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStatusUpdate}
                  disabled={isUpdating || (newAppointmentStatus === selectedBooking.appointment_status && newPaymentStatus === selectedBooking.payment_status)}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isUpdating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Updating...
                    </>
                  ) : (
                    'Update Status'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No-Show Fee Modal */}
      {isNoShowFeeModalOpen && selectedBooking && currentEmployee && (
        <NoShowFeeModal
          isOpen={isNoShowFeeModalOpen}
          onClose={() => setIsNoShowFeeModalOpen(false)}
          bookingId={selectedBooking.id}
          employeeId={currentEmployee.id}
          customerName={`${selectedBooking.customer_first_name} ${selectedBooking.customer_last_name}`}
          appointmentDate={selectedBooking.appointment_date}
          appointmentTime={selectedBooking.appointment_time}
          onSuccess={handleNoShowFeeCharge}
        />
      )}

      <Footer />
    </div>
  );
};