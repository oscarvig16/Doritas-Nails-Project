import React, { useState, useRef, useEffect } from 'react';
import { BookingManicureServices } from './BookingManicureServices';
import { BookingPedicureServices } from './BookingPedicureServices';
import { BookingCalendar } from './BookingCalendar';
import { ShoppingBag, Calendar, Clock, Trash2, ArrowLeft, User, Check } from 'lucide-react';
import { format } from 'date-fns';
import { TechnicianAssignment } from './TechnicianAssignment';
import { CustomerInfoForm } from './CustomerInfoForm';
import { BookingConfirmation } from './BookingConfirmation';

interface SelectedService {
  id: string;
  title: string;
  category: 'manicure' | 'pedicure';
  subcategory: string;
  duration: string;
  price: number;
  options?: {
    type: string;
    value: string;
  };
}

export const BookingServices: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'manicure' | 'pedicure'>('manicure');
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedTechnicians, setSelectedTechnicians] = useState<{
    type: 'single' | 'split' | 'auto';
    manicureTech?: { id: string; name: string };
    pedicureTech?: { id: string; name: string };
  } | null>(null);
  const [step, setStep] = useState<'services' | 'technicians' | 'datetime' | 'personal-info' | 'confirmation'>('services');
  const [customerInfo, setCustomerInfo] = useState<{
    firstName: string;
    lastName: string;
    email: string;
  } | null>(null);

  // Refs for scrolling
  const technicianSectionRef = useRef<HTMLDivElement>(null);
  const dateTimeSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Smooth scroll to sections when step changes
    if (step === 'technicians' && technicianSectionRef.current) {
      technicianSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    } else if (step === 'datetime' && dateTimeSectionRef.current) {
      dateTimeSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [step]);

  const handleAddService = (service: any) => {
    const newService = {
      id: Math.random().toString(),
      title: service.title || service.name,
      category: activeTab,
      subcategory: service.subcategory,
      duration: service.duration,
      price: service.price,
      options: service.options
    };

    const existingServiceIndex = selectedServices.findIndex(s => 
      s.category === activeTab && s.title === newService.title
    );
    
    if (existingServiceIndex !== -1) {
      const updatedServices = [...selectedServices];
      updatedServices[existingServiceIndex] = newService;
      setSelectedServices(updatedServices);
    } else {
      setSelectedServices(prev => [...prev, newService]);
    }
  };

  const handleServiceCancel = (serviceTitle: string, category: 'manicure' | 'pedicure') => {
    setSelectedServices(prev => 
      prev.filter(service => !(service.category === category && service.title === serviceTitle))
    );
  };

  const handleRemoveService = (serviceId: string) => {
    setSelectedServices(prev => prev.filter(service => service.id !== serviceId));
  };

  const handleDateTimeSelect = (date: Date, time: string) => {
    setSelectedDate(date);
    setSelectedTime(time);
  };

  const handleTechnicianSelect = (technicians: any) => {
    console.log('🎯 TECHNICIAN SELECTED:', JSON.stringify(technicians, null, 2));
    setSelectedTechnicians(technicians);
  };

  const handleBackToServices = () => {
    setStep('services');
    setSelectedTechnicians(null);
  };

  const parseDuration = (duration: string): number => {
    if (!duration) return 0;

    let totalMinutes = 0;

    if (duration.includes('-')) {
      const parts = duration.split('-').map(part => part.trim());
      const minutes = parts.map(part => {
        if (part.includes('h')) {
          const [hours, mins] = part.split('h').map(n => parseInt(n) || 0);
          return (hours * 60) + mins;
        }
        return parseInt(part) || 0;
      });
      return Math.max(...minutes);
    }

    const hourMatch = duration.match(/(\d+)\s*h(?:our)?s?/i);
    if (hourMatch) {
      totalMinutes += parseInt(hourMatch[1]) * 60;
    }

    const minuteMatch = duration.match(/(\d+)\s*min(?:ute)?s?/i);
    if (minuteMatch) {
      totalMinutes += parseInt(minuteMatch[1]);
    }

    if (totalMinutes === 0 && /^\d+$/.test(duration)) {
      totalMinutes = parseInt(duration);
    }

    return totalMinutes;
  };

  const formatDuration = (minutes: number): string => {
    if (minutes === 0) return '0 min';
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) return `${mins}min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}min`;
  };

  const calculateTotalDuration = (services: SelectedService[]): number => {
    return services.reduce((total, service) => {
      return total + parseDuration(service.duration);
    }, 0);
  };

  const totalPrice = selectedServices.reduce((total, service) => total + service.price, 0);
  const totalDuration = calculateTotalDuration(selectedServices);

  const renderServiceOptions = (service: SelectedService) => {
    if (!service.options) return null;
    
    return (
      <div className="text-sm text-gray-600 mt-1">
        {service.options.type}: {service.options.value}
      </div>
    );
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
    }, {} as Record<string, SelectedService[]>);

    return (
      <div className="space-y-6">
        {Object.entries(servicesByCategory).map(([category, services]) => (
          <div key={category}>
            <h4 className="font-medium text-gray-900 mb-3">{category}</h4>
            <div className="space-y-3">
              {services.map(service => (
                <div key={service.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-medium">{service.title}</h3>
                      {renderServiceOptions(service)}
                      <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>{service.duration}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <span className="font-semibold text-primary">${service.price}</span>
                      <button
                        onClick={() => handleRemoveService(service.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderTechnicianSummary = () => {
    if (!selectedTechnicians) return null;

    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium mb-2">Selected Technicians:</h4>
        <div className="space-y-2 text-sm text-gray-600">
          {selectedTechnicians.type === 'auto' ? (
            <p>Auto-assigned at checkout</p>
          ) : selectedTechnicians.type === 'single' ? (
            <div>
              <p className="font-medium">{selectedTechnicians.manicureTech?.name}:</p>
              <ul className="ml-4 mt-1 space-y-1">
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
                  <ul className="ml-4 mt-1 space-y-1">
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
                  <ul className="ml-4 mt-1 space-y-1">
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
      </div>
    );
  };

  const progressSteps = [
    { id: 'services', label: 'Services' },
    { id: 'technicians', label: 'Technician' },
    { id: 'datetime', label: 'Date & Time' },
    { id: 'personal-info', label: 'Your Info' },
    { id: 'confirmation', label: 'Payment' }
  ];

  const getCurrentStepIndex = () => {
    return progressSteps.findIndex(s => s.id === step);
  };

  return (
    <section className="min-h-screen bg-gradient-to-br from-blush/30 via-white to-secondary/20">
      <div className="container py-12 md:py-20">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="relative text-center mb-16">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 bg-secondary/20 rounded-full blur-2xl"></div>
            </div>
            <h1 className="relative text-4xl md:text-5xl font-playfair font-semibold text-gray-900 mb-4">
              Book Your Services
            </h1>
            <p className="relative text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
              Choose from our wide range of professional nail care services
            </p>
          </div>

          {/* Progress Steps */}
          <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg z-50 py-4 px-6">
            <div className="max-w-6xl mx-auto">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  {progressSteps.map((s, index) => (
                    <div 
                      key={s.id}
                      className={`flex items-center ${
                        index < getCurrentStepIndex()
                          ? 'text-primary'
                          : step === s.id
                          ? 'text-primary font-medium'
                          : 'text-gray-400'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        index < getCurrentStepIndex()
                          ? 'bg-primary text-white'
                          : step === s.id
                          ? 'bg-primary/10 text-primary'
                          : 'bg-gray-100'
                      }`}>
                        {index < getCurrentStepIndex() ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <span className="ml-2">{s.label}</span>
                      {index < progressSteps.length - 1 && (
                        <div className={`w-12 h-0.5 mx-2 ${
                          index < getCurrentStepIndex()
                            ? 'bg-primary'
                            : 'bg-gray-200'
                        }`} />
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Action Button */}
                {step !== 'confirmation' && (
                  <button
                    onClick={() => {
                      if (step === 'services' && selectedServices.length > 0) {
                        setStep('technicians');
                      } else if (step === 'technicians' && selectedTechnicians) {
                        setStep('datetime');
                      } else if (step === 'datetime' && selectedDate && selectedTime) {
                        setStep('personal-info');
                      } else if (step === 'personal-info' && customerInfo) {
                        setStep('confirmation');
                      }
                    }}
                    className={`btn ${
                      (step === 'services' && selectedServices.length > 0) ||
                      (step === 'technicians' && selectedTechnicians) ||
                      (step === 'datetime' && selectedDate && selectedTime) ||
                      (step === 'personal-info' && customerInfo)
                        ? 'btn-primary'
                        : 'btn-secondary opacity-50 cursor-not-allowed'
                    }`}
                    disabled={
                      (step === 'services' && selectedServices.length === 0) ||
                      (step === 'technicians' && !selectedTechnicians) ||
                      (step === 'datetime' && (!selectedDate || !selectedTime)) ||
                      (step === 'personal-info' && !customerInfo)
                    }
                  >
                    {step === 'services' ? 'Choose Technician' :
                     step === 'technicians' ? 'Select Date & Time' :
                     step === 'datetime' ? 'Enter Your Info' :
                     'Review & Pay'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="pb-24">
            {step === 'services' ? (
              <>
                {/* Service Type Tabs */}
                <div className="flex justify-center mb-12">
                  <div className="inline-flex rounded-full bg-white shadow-lg p-1">
                    <button
                      onClick={() => setActiveTab('manicure')}
                      className={`px-6 py-3 rounded-full transition-all ${
                        activeTab === 'manicure'
                          ? 'bg-primary text-white shadow-sm'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      Manicure Services
                    </button>
                    <button
                      onClick={() => setActiveTab('pedicure')}
                      className={`px-6 py-3 rounded-full transition-all ${
                        activeTab === 'pedicure'
                          ? 'bg-primary text-white shadow-sm'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      Pedicure Services
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Service Selection */}
                  <div className="lg:col-span-2">
                    <div className="transition-all duration-300">
                      {activeTab === 'manicure' ? (
                        <BookingManicureServices 
                          onServiceSelect={handleAddService}
                          onServiceCancel={handleServiceCancel}
                          selectedServices={selectedServices}
                        />
                      ) : (
                        <BookingPedicureServices 
                          onServiceSelect={handleAddService}
                          onServiceCancel={handleServiceCancel}
                          selectedServices={selectedServices}
                        />
                      )}
                    </div>
                  </div>

                  {/* Booking Summary */}
                  <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl shadow-xl p-6 sticky top-24">
                      <div className="flex items-center gap-3 mb-6">
                        <ShoppingBag className="w-6 h-6 text-primary" />
                        <h2 className="text-2xl font-playfair font-semibold">Your Selection</h2>
                      </div>
                      
                      <div className="space-y-4">
                        {selectedServices.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <p>No services selected yet</p>
                            <p className="text-sm mt-2">Choose your desired services from the menu</p>
                          </div>
                        ) : (
                          <>
                            {renderServicesByCategory()}
                            
                            <div className="border-t border-gray-200 pt-4 space-y-3">
                              <div className="flex justify-between items-center text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4" />
                                  <span>Total Duration:</span>
                                </div>
                                <span>{formatDuration(totalDuration)}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="font-medium">Total Price:</span>
                                <span className="text-xl font-semibold text-primary">
                                  ${totalPrice}
                                </span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : step === 'technicians' ? (
              <div className="max-w-3xl mx-auto" ref={technicianSectionRef}>
                <button
                  onClick={handleBackToServices}
                  className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors mb-8"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Back to Services
                </button>

                <div className="grid grid-cols-1 gap-8">
                  <TechnicianAssignment
                    onSelect={handleTechnicianSelect}
                    selectedOption={selectedTechnicians}
                    hasManicure={selectedServices.some(s => s.category === 'manicure')}
                    hasPedicure={selectedServices.some(s => s.category === 'pedicure')}
                  />

                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <ShoppingBag className="w-6 h-6 text-primary" />
                      <h3 className="text-xl font-playfair font-semibold">Booking Summary</h3>
                    </div>

                    <div className="space-y-4">
                      {renderServicesByCategory()}
                      {renderTechnicianSummary()}

                      <div className="border-t border-gray-200 pt-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-gray-600">Duration:</span>
                          <span>{formatDuration(totalDuration)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Total:</span>
                          <span className="text-xl font-semibold text-primary">${totalPrice}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : step === 'datetime' ? (
              <div className="max-w-3xl mx-auto" ref={dateTimeSectionRef}>
                <button
                  onClick={() => setStep('technicians')}
                  className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors mb-8"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Back to Technician Selection
                </button>

                <div className="grid grid-cols-1 gap-8">
                  <BookingCalendar
                    onDateTimeSelect={handleDateTimeSelect}
                    selectedDate={selectedDate}
                    selectedTime={selectedTime}
                  />

                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <ShoppingBag className="w-6 h-6 text-primary" />
                      <h3 className="text-xl font-playfair font-semibold">Booking Summary</h3>
                    </div>

                    <div className="space-y-4">
                      {renderServicesByCategory()}
                      {renderTechnicianSummary()}

                      {selectedDate && selectedTime && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="font-medium mb-2">Appointment Time:</h4>
                          <div className="text-sm text-gray-600">
                            <p>{format(selectedDate, 'EEEE, MMMM d, yyyy')}</p>
                            <p>{selectedTime}</p>
                          </div>
                        </div>
                      )}

                      <div className="border-t border-gray-200 pt-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-gray-600">Duration:</span>
                          <span>{formatDuration(totalDuration)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Total:</span>
                          <span className="text-xl font-semibold text-primary">${totalPrice}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : step === 'personal-info' ? (
              <div className="max-w-3xl mx-auto">
                <button
                  onClick={() => setStep('datetime')}
                  className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors mb-8"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Back to Date & Time
                </button>

                <div className="grid grid-cols-1 gap-8">
                  <CustomerInfoForm
                    onSubmit={(info) => {
                      setCustomerInfo(info);
                      setStep('confirmation');
                    }}
                    initialValues={customerInfo || undefined}
                  />

                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <ShoppingBag className="w-6 h-6 text-primary" />
                      <h3 className="text-xl font-playfair font-semibold">Booking Summary</h3>
                    </div>

                    <div className="space-y-4">
                      {renderServicesByCategory()}
                      {renderTechnicianSummary()}

                      {selectedDate && selectedTime && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="font-medium mb-2">Appointment Time:</h4>
                          <div className="text-sm text-gray-600">
                            <p>{format(selectedDate, 'EEEE, MMMM d, yyyy')}</p>
                            <p>{selectedTime}</p>
                          </div>
                        </div>
                      )}

                      <div className="border-t border-gray-200 pt-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-gray-600">Duration:</span>
                          <span>{formatDuration(totalDuration)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Total:</span>
                          <span className="text-xl font-semibold text-primary">${totalPrice}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto">
                <button
                  onClick={() => setStep('personal-info')}
                  className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors mb-8"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Back to Personal Information
                </button>

                <BookingConfirmation
                  selectedServices={selectedServices}
                  selectedTechnicians={selectedTechnicians}
                  selectedDate={selectedDate!}
                  selectedTime={selectedTime!}
                  customerInfo={customerInfo!}
                  totalPrice={totalPrice}
                  totalDuration={totalDuration}
                  onBack={() => setStep('personal-info')}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};