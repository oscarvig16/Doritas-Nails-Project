import React, { useState } from 'react';
import { Clock } from 'lucide-react';
import { ServiceWarning } from './ServiceWarning';

interface PedicureService {
  name: string;
  category: 'manicure' | 'pedicure';
  price: number | string;
  duration: string;
  description: string;
  gelUpgrade?: {
    price: number;
    duration: string;
  };
  isDesignService?: boolean;
  addOns?: string[];
  options?: {
    twoNail?: {
      price: number;
      duration: string;
    };
    tenNail?: {
      price: number;
      duration: string;
    };
  };
  subcategory?: string;
}

interface ServiceOptionProps {
  service: PedicureService;
  isGelSelected: boolean;
  onToggle: () => void;
}

interface BookingPedicureServicesProps {
  onServiceSelect: (service: any) => void;
  onServiceCancel: (serviceTitle: string, category: 'manicure' | 'pedicure') => void;
  selectedServices: any[];
}

interface DesignSelectorProps {
  designs: string[];
  onDesignsChange: (selectedDesigns: string[]) => void;
  maxPrice: number;
  minPrice: number;
}

interface ServiceOptionSelectorProps {
  service: PedicureService;
  selectedOption: 'twoNail' | 'tenNail' | null;
  onSelect: (option: 'twoNail' | 'tenNail' | null) => void;
}

const ServiceOptionSelector: React.FC<ServiceOptionSelectorProps> = ({ service, selectedOption, onSelect }) => {
  return (
    <div className="mt-4 space-y-2">
      <div className="flex flex-col gap-2">
        <button
          onClick={() => onSelect(selectedOption === 'twoNail' ? null : 'twoNail')}
          className={`w-full px-4 py-3 rounded-lg border transition-all ${
            selectedOption === 'twoNail'
              ? 'border-primary bg-primary/5 shadow-sm'
              : 'border-gray-200 hover:border-primary/60 hover:bg-gray-50'
          }`}
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full border ${
                selectedOption === 'twoNail'
                  ? 'border-primary bg-primary'
                  : 'border-gray-400'
              }`}>
                {selectedOption === 'twoNail' && (
                  <div className="w-full h-full rounded-full bg-white transform scale-[0.4]" />
                )}
              </div>
              <span className="font-medium">2 Nails</span>
            </div>
            <div className="text-right">
              <span className="block text-sm font-medium">
                ${service.options?.twoNail?.price}
              </span>
              <span className="block text-xs text-gray-500">
                {service.options?.twoNail?.duration}
              </span>
            </div>
          </div>
        </button>

        <button
          onClick={() => onSelect(selectedOption === 'tenNail' ? null : 'tenNail')}
          className={`w-full px-4 py-3 rounded-lg border transition-all ${
            selectedOption === 'tenNail'
              ? 'border-primary bg-primary/5 shadow-sm'
              : 'border-gray-200 hover:border-primary/60 hover:bg-gray-50'
          }`}
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full border ${
                selectedOption === 'tenNail'
                  ? 'border-primary bg-primary'
                  : 'border-gray-400'
              }`}>
                {selectedOption === 'tenNail' && (
                  <div className="w-full h-full rounded-full bg-white transform scale-[0.4]" />
                )}
              </div>
              <span className="font-medium">10 Nails</span>
            </div>
            <div className="text-right">
              <span className="block text-sm font-medium">
                ${service.options?.tenNail?.price}
              </span>
              <span className="block text-xs text-gray-500">
                {service.options?.tenNail?.duration}
              </span>
            </div>
          </div>
        </button>
      </div>

      {selectedOption && (
        <div className="px-4 py-2 bg-secondary/10 rounded-lg text-sm text-primary">
          Selected: {selectedOption === 'twoNail' ? '2 Nails' : '10 Nails'} - 
          ${selectedOption === 'twoNail' 
            ? service.options?.twoNail?.price 
            : service.options?.tenNail?.price
          }
        </div>
      )}
    </div>
  );
};

const DesignSelector: React.FC<DesignSelectorProps> = ({ 
  designs, 
  onDesignsChange, 
  maxPrice, 
  minPrice 
}) => {
  const [selectedDesigns, setSelectedDesigns] = useState<string[]>([]);

  const handleDesignToggle = (design: string) => {
    const newSelection = selectedDesigns.includes(design)
      ? selectedDesigns.filter(d => d !== design)
      : [...selectedDesigns, design];
    
    setSelectedDesigns(newSelection);
    onDesignsChange(newSelection);
  };

  const currentPrice = selectedDesigns.length >= 3 ? maxPrice : minPrice;

  return (
    <div className="mt-4 space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="font-medium mb-3">Select Your Designs:</h4>
        <div className="space-y-2">
          {designs.map((design, index) => (
            <button
              key={index}
              onClick={() => handleDesignToggle(design)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                selectedDesigns.includes(design)
                  ? 'bg-primary text-white'
                  : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <span>{design}</span>
              {selectedDesigns.includes(design) && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-secondary/10 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600">
              Selected: {selectedDesigns.length} design{selectedDesigns.length !== 1 ? 's' : ''}
            </p>
            <p className="text-sm text-gray-600">
              {selectedDesigns.length >= 3 ? '3+ designs selected' : 'Less than 3 designs'}
            </p>
          </div>
          <span className="text-lg font-semibold text-primary">
            ${currentPrice}
          </span>
        </div>
      </div>
    </div>
  );
};

const ServiceOption: React.FC<ServiceOptionProps> = ({ service, isGelSelected, onToggle }) => {
  const currentPrice = isGelSelected ? service.gelUpgrade!.price : service.price;
  const currentDuration = isGelSelected ? service.gelUpgrade!.duration : service.duration;

  return (
    <div className="space-y-4">
      {service.gelUpgrade && (
        <div className="flex flex-col gap-2">
          <button
            onClick={() => onToggle()}
            className={`w-full px-4 py-3 rounded-lg border transition-all ${
              !isGelSelected
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-gray-200 hover:border-primary/60 hover:bg-gray-50'
            }`}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full border ${
                  !isGelSelected
                    ? 'border-primary bg-primary'
                    : 'border-gray-400'
                }`}>
                  {!isGelSelected && (
                    <div className="w-full h-full rounded-full bg-white transform scale-[0.4]" />
                  )}
                </div>
                <span className="font-medium">Regular Polish</span>
              </div>
              <div className="text-right">
                <span className="block text-sm font-medium">${service.price}</span>
                <span className="block text-xs text-gray-500">{service.duration}</span>
              </div>
            </div>
          </button>

          <button
            onClick={() => onToggle()}
            className={`w-full px-4 py-3 rounded-lg border transition-all ${
              isGelSelected
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-gray-200 hover:border-primary/60 hover:bg-gray-50'
            }`}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full border ${
                  isGelSelected
                    ? 'border-primary bg-primary'
                    : 'border-gray-400'
                }`}>
                  {isGelSelected && (
                    <div className="w-full h-full rounded-full bg-white transform scale-[0.4]" />
                  )}
                </div>
                <span className="font-medium">Gel Polish Upgrade</span>
              </div>
              <div className="text-right">
                <span className="block text-sm font-medium">${service.gelUpgrade.price}</span>
                <span className="block text-xs text-gray-500">{service.gelUpgrade.duration}</span>
              </div>
            </div>
          </button>
        </div>
      )}

      <div className="px-4 py-2 bg-secondary/10 rounded-lg text-sm">
        <div className="flex justify-between items-center text-primary">
          <span>Selected: {isGelSelected ? 'Gel Polish' : 'Regular Polish'}</span>
          <span className="font-medium">${currentPrice}</span>
        </div>
        <div className="text-gray-600 text-xs mt-1">
          Duration: {currentDuration}
        </div>
      </div>
    </div>
  );
};

export const BookingPedicureServices: React.FC<BookingPedicureServicesProps> = ({
  onServiceSelect,
  onServiceCancel,
  selectedServices
}) => {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, boolean>>({});
  const [selectedDesigns, setSelectedDesigns] = useState<Record<string, string[]>>({});
  const [selectedNailOptions, setSelectedNailOptions] = useState<Record<string, 'twoNail' | 'tenNail' | null>>({});
  const [warningModal, setWarningModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    requirements?: string[];
    onAccept: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onAccept: () => {}
  });

  const hasMainPedicureService = () => {
    return selectedServices.some(s => 
      s.category === 'pedicure' && 
      !s.subcategory?.includes('Designs') && 
      !s.subcategory?.includes('Add-ons')
    );
  };

  const handleServiceSelect = (service: PedicureService) => {
    // For designs and add-ons, check if a main service exists
    if ((service.subcategory === 'Designs' || service.subcategory === 'Add-ons') && !hasMainPedicureService()) {
      setWarningModal({
        isOpen: true,
        title: 'Main Service Required',
        message: 'Please select a main pedicure service first.',
        requirements: ['Select any pedicure service from the main category'],
        onAccept: () => setWarningModal(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    // For main services, check if one already exists
    if (!service.subcategory && hasMainPedicureService()) {
      setWarningModal({
        isOpen: true,
        title: 'Service Already Selected',
        message: 'You can only select one main pedicure service at a time.',
        onAccept: () => setWarningModal(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    const serviceToAdd = {
      ...service,
      category: 'pedicure',
      title: service.name,
      options: service.options || undefined
    };

    onServiceSelect(serviceToAdd);
  };

  const handleDesignsChange = (serviceTitle: string, designs: string[]) => {
    setSelectedDesigns(prev => ({
      ...prev,
      [serviceTitle]: designs
    }));

    const service = services.find(s => s.name === serviceTitle);
    if (service && service.isDesignService) {
      const price = designs.length >= 3 
        ? (serviceTitle === "2 Nails Design" ? 8 : 20)
        : (serviceTitle === "2 Nails Design" ? 5 : 15);
      
      onServiceSelect({
        ...service,
        category: 'pedicure',
        title: service.name,
        price,
        options: {
          type: 'Designs',
          value: designs.join(', ')
        }
      });
    }
  };

  const handleOptionSelect = (serviceTitle: string, option: 'twoNail' | 'tenNail' | null) => {
    setSelectedNailOptions(prev => ({
      ...prev,
      [serviceTitle]: option
    }));

    const service = services.find(s => s.name === serviceTitle);
    if (service && service.options) {
      const selectedOption = service.options[option || 'twoNail'];
      onServiceSelect({
        ...service,
        category: 'pedicure',
        title: service.name,
        price: selectedOption?.price,
        duration: selectedOption?.duration,
        options: {
          type: option === 'twoNail' ? '2 Nails' : '10 Nails',
          value: `${selectedOption?.price}`
        }
      });
    }
  };

  const services: PedicureService[] = [
    {
      name: "Basic Pedicure",
      category: 'pedicure',
      price: 30,
      duration: "45 minutes",
      description: "Foot soak, cuticle cleaning, nail shaping, polishing, and foot massage with hot towel.",
      gelUpgrade: {
        price: 40,
        duration: "1 hour"
      }
    },
    {
      name: "Special Dorita's Pedicure",
      category: 'pedicure',
      price: 35,
      duration: "45 minutes",
      description: "Foot soak, cuticle cleaning, nail shaping, polishing. Callus treatment and foot massage with hot towel.",
      gelUpgrade: {
        price: 45,
        duration: "1 hour 10 minutes"
      }
    },
    {
      name: "Paraffin Pedicure",
      category: 'pedicure',
      price: 40,
      duration: "50 minutes",
      description: "Foot soak, cuticle cleaning, nail shaping, polishing. Callus treatment, paraffin wax, and foot massage with hot towel.",
      gelUpgrade: {
        price: 50,
        duration: "1 hour"
      }
    },
    {
      name: "Pedicure Spa Deluxe",
      category: 'pedicure',
      price: 55,
      duration: "1 hour 15 minutes",
      description: "Foot soak, cuticle cleaning, nail shaping, polishing. Callus treatment, sugar scrub, foot mask, paraffin wax. Foot massage with hot towel and gel polish included."
    },
    {
      name: "Acrylic (10 Toes)",
      category: 'pedicure',
      price: 30,
      duration: "35 minutes",
      description: "Full acrylic application on all toes. Includes nail and cuticle treatment."
    },
    {
      name: "2 Thumbs Acrylic",
      category: 'pedicure',
      price: 10,
      duration: "20 minutes",
      description: "Acrylic application on both thumbs. Includes foot soak, cuticle cleaning, nail shaping, polishing, and foot massage with hot towel."
    },
    {
      name: "2 Nails Design",
      category: 'pedicure',
      subcategory: "Designs",
      price: "5 and up",
      duration: "15–20 min",
      description: "Select 2 designs from: Glitter, Basic Lines, Cat Eye, Stickers, or Foils.",
      isDesignService: true,
      addOns: [
        "Glitter",
        "Basic Lines",
        "Cat Eye",
        "Stickers",
        "Foils"
      ]
    },
    {
      name: "10 Nails Design",
      category: 'pedicure',
      subcategory: "Designs",
      price: "15–20",
      duration: "25 min",
      description: "Full set designs available with Glitter, Basic Lines, Cat Eye, Stickers, or Foils.",
      isDesignService: true,
      addOns: [
        "Glitter",
        "Basic Lines",
        "Cat Eye",
        "Stickers",
        "Foils"
      ]
    },
    {
      name: "3D Flowers",
      category: 'pedicure',
      subcategory: "Designs",
      price: "8-30",
      duration: "20-30 min",
      description: "Elegant floral accents raised from the nail for dimension and texture.",
      options: {
        twoNail: {
          price: 8,
          duration: "20 min"
        },
        tenNail: {
          price: 30,
          duration: "30 min"
        }
      }
    },
    {
      name: "Encapsulated (2x)",
      category: 'pedicure',
      subcategory: "Designs",
      price: 8,
      duration: "10 min",
      description: "Encased nail art between acrylic layers. Preserves shine and design on 2 nails."
    },
    {
      name: "Encapsulated (10x)",
      category: 'pedicure',
      subcategory: "Designs",
      price: 25,
      duration: "20 min",
      description: "Full encapsulated design on every nail. Protected under crystal-clear acrylic."
    },
    {
      name: "Free-Hand Design (2x)",
      category: 'pedicure',
      subcategory: "Designs",
      price: 7,
      duration: "15 min",
      description: "Custom designs on 2 nails drawn completely by hand. One-of-a-kind art."
    },
    {
      name: "Free-Hand Design (10x)",
      category: 'pedicure',
      subcategory: "Designs",
      price: 25,
      duration: "20 min",
      description: "Every nail becomes a canvas. Intricate art drawn by our nail artists."
    },
    {
      name: "Acrylic Ombre",
      category: 'pedicure',
      subcategory: "Designs",
      price: "4-8",
      duration: "15-25 min",
      description: "Create a seamless ombre fade. Choose 2 nails for subtle detail or upgrade to all 10.",
      options: {
        twoNail: {
          price: 4,
          duration: "15 min"
        },
        tenNail: {
          price: 8,
          duration: "25 min"
        }
      }
    },
    {
      name: "Gel Blur",
      category: 'pedicure',
      subcategory: "Designs",
      price: "3-7",
      duration: "15-20 min",
      description: "Dreamy blurred gel effect. Try it on 2 nails or elevate your full set.",
      options: {
        twoNail: {
          price: 3,
          duration: "15 min"
        },
        tenNail: {
          price: 7,
          duration: "20 min"
        }
      }
    },
    {
      name: "Diamonds",
      category: 'pedicure',
      subcategory: "Designs",
      price: "8-30",
      duration: "15-30 min",
      description: "Luxury crystal placement. Choose 2 accents or go full glam.",
      options: {
        twoNail: {
          price: 8,
          duration: "15 min"
        },
        tenNail: {
          price: 30,
          duration: "30 min"
        }
      }
    },
    {
      name: "Matte Finish",
      category: 'pedicure',
      subcategory: "Designs",
      price: "2-5",
      duration: "10-20 min",
      description: "Modern matte coating. Great for subtle or full-set looks.",
      options: {
        twoNail: {
          price: 2,
          duration: "10 min"
        },
        tenNail: {
          price: 5,
          duration: "20 min"
        }
      }
    },
    {
      name: "Gel Ombre",
      category: 'pedicure',
      subcategory: "Designs",
      price: "4-8",
      duration: "15-25 min",
      description: "Soft gel-based ombre fade for a natural gradient look.",
      options: {
        twoNail: {
          price: 4,
          duration: "15 min"
        },
        tenNail: {
          price: 8,
          duration: "25 min"
        }
      }
    },
    {
      name: "Cut-Down",
      category: 'pedicure',
      subcategory: "Add-ons",
      price: 5,
      duration: "5 min",
      description: "Shortens the length of your existing nails while maintaining shape."
    },
    {
      name: "French Tip",
      category: 'pedicure',
      subcategory: "Add-ons",
      price: 8,
      duration: "20 min",
      description: "Classic and clean. Adds a white tip over your acrylic or gel base."
    }
  ];

  const categories = ["Pedicure Services", "Designs", "Add-ons"];

  return (
    <div className="space-y-12">
      {categories.map((category, categoryIndex) => (
        <div key={categoryIndex}>
          <h2 className="text-2xl font-playfair font-semibold text-gray-900 mb-6">
            {category}
          </h2>
          
          <div className="grid grid-cols-1 gap-6">
            {services
              .filter(service => 
                (service.subcategory === category) || 
                (!service.subcategory && category === "Pedicure Services")
              )
              .map((service, index) => {
                const isSelected = selectedServices.some(s => 
                  s.category === 'pedicure' && s.title === service.name
                );

                return (
                  <div
                    key={index}
                    className="bg-white rounded-xl shadow-lg overflow-hidden"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <h3 className="text-xl font-playfair font-semibold text-gray-900">
                          {service.name}
                        </h3>
                        <span className="text-xl font-playfair font-semibold text-primary">
                          ${service.price}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-gray-600 mt-2">
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {service.duration}
                        </div>
                      </div>
                      
                      <p className="text-gray-700 mt-4">{service.description}</p>

                      <div className="mt-4">
                        {isSelected ? (
                          <div className="space-y-4">
                            {service.gelUpgrade && (
                              <ServiceOption
                                service={service}
                                isGelSelected={selectedOptions[service.name] || false}
                                onToggle={() => {
                                  const newValue = !selectedOptions[service.name];
                                  setSelectedOptions(prev => ({
                                    ...prev,
                                    [service.name]: newValue
                                  }));
                                  onServiceSelect({
                                    ...service,
                                    category: 'pedicure',
                                    title: service.name,
                                    price: newValue ? service.gelUpgrade?.price : service.price,
                                    duration: newValue ? service.gelUpgrade?.duration : service.duration,
                                    options: {
                                      type: 'Polish Type',
                                      value: newValue ? 'Gel Polish' : 'Regular Polish'
                                    }
                                  });
                                }}
                              />
                            )}

                            {service.isDesignService && service.addOns && (
                              <DesignSelector
                                designs={service.addOns}
                                onDesignsChange={(designs) => handleDesignsChange(service.name, designs)}
                                maxPrice={service.name === "2 Nails Design" ? 8 : 20}
                                minPrice={service.name === "2 Nails Design" ? 5 : 15}
                              />
                            )}

                            {service.options && !service.isDesignService && (
                              <ServiceOptionSelector
                                service={service}
                                selectedOption={selectedNailOptions[service.name] || null}
                                onSelect={(option) => handleOptionSelect(service.name, option)}
                              />
                            )}

                            <button
                              onClick={() => onServiceCancel(service.name, 'pedicure')}
                              className="w-full btn btn-secondary"
                            >
                              Remove Service
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleServiceSelect(service)}
                            className="w-full btn btn-primary"
                          >
                            Select Service
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ))}

      <ServiceWarning
        isOpen={warningModal.isOpen}
        onClose={() => setWarningModal(prev => ({ ...prev, isOpen: false }))}
        onAccept={warningModal.onAccept}
        title={warningModal.title}
        message={warningModal.message}
        requirements={warningModal.requirements}
      />
    </div>
  );
};