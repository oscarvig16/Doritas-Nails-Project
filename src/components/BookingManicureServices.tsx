import React, { useState } from 'react';
import { Clock, Plus, Minus, Check, Users2, Shield, Heart } from 'lucide-react';
import { ServiceWarning } from './ServiceWarning';

interface Service {
  title: string;
  category: 'manicure' | 'pedicure';
  subcategory: string;
  duration: string;
  price: string | number;
  description: string;
  options?: {
    twoNail?: {
      price: string | number;
      duration: string;
    };
    tenNail?: {
      price: string | number;
      duration: string;
    };
  };
  addOns?: string[];
  isRepairService?: boolean;
  isDesignService?: boolean;
}

interface ServiceOptionSelectorProps {
  service: Service;
  selectedOption: 'twoNail' | 'tenNail' | null;
  onSelect: (option: 'twoNail' | 'tenNail' | null) => void;
}

interface RepairQuantitySelectorProps {
  basePrice: number;
  onQuantityChange: (quantity: number) => void;
}

interface DesignSelectorProps {
  designs: string[];
  onDesignsChange: (selectedDesigns: string[]) => void;
  maxPrice: number;
  minPrice: number;
}

interface BookingManicureServicesProps {
  onServiceSelect: (service: any) => void;
  onServiceCancel: (serviceTitle: string, category: 'manicure' | 'pedicure') => void;
  selectedServices: any[];
}

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
                <Check className="w-4 h-4" />
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

const RepairQuantitySelector: React.FC<RepairQuantitySelectorProps> = ({ basePrice, onQuantityChange }) => {
  const [quantity, setQuantity] = useState(1);
  const maxNails = 10;

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1 && newQuantity <= maxNails) {
      setQuantity(newQuantity);
      onQuantityChange(newQuantity);
    }
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 p-4">
        <span className="font-medium">Number of nails:</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleQuantityChange(quantity - 1)}
            disabled={quantity <= 1}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              quantity <= 1 
                ? 'bg-gray-100 text-gray-400' 
                : 'bg-primary/10 text-primary hover:bg-primary/20'
            }`}
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-8 text-center font-semibold">{quantity}</span>
          <button
            onClick={() => handleQuantityChange(quantity + 1)}
            disabled={quantity >= maxNails}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              quantity >= maxNails 
                ? 'bg-gray-100 text-gray-400' 
                : 'bg-primary/10 text-primary hover:bg-primary/20'
            }`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="bg-secondary/10 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-700">Total price:</span>
          <span className="text-lg font-semibold text-primary">${basePrice * quantity}</span>
        </div>
        <div className="text-sm text-gray-600 mt-1">
          Estimated time: {quantity * 10} minutes
        </div>
      </div>
    </div>
  );
};

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

export const BookingManicureServices: React.FC<BookingManicureServicesProps> = ({
  onServiceSelect,
  onServiceCancel,
  selectedServices
}) => {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, 'twoNail' | 'tenNail' | null>>({});
  const [repairQuantity, setRepairQuantity] = useState(1);
  const [selectedDesigns, setSelectedDesigns] = useState<Record<string, string[]>>({});
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

  const isMainService = (subcategory: string): boolean => {
    return [
      'Square Size',
      'Color Acrylic',
      'Sculpted Acrylic',
      'Main Services',
      'Fills'
    ].includes(subcategory);
  };

  const isCutDownService = (title: string): boolean => {
    return title === "Cut-Down";
  };

  const hasExistingMainService = (): boolean => {
    return selectedServices.some(s => 
      s.category === 'manicure' && isMainService(s.subcategory)
    );
  };

  const handleServiceSelect = (service: Service) => {
    if (isCutDownService(service.title)) {
      onServiceSelect({
        ...service,
        category: 'manicure'
      });
      return;
    }

    if ((service.subcategory === 'Designs' || service.subcategory === 'Add-ons') && !hasExistingMainService()) {
      setWarningModal({
        isOpen: true,
        title: 'Main Service Required',
        message: 'Please select a main manicure service first.',
        requirements: ['Select any manicure service from the main category'],
        onAccept: () => setWarningModal(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    if (isMainService(service.subcategory) && hasExistingMainService()) {
      setWarningModal({
        isOpen: true,
        title: 'Service Already Selected',
        message: 'You can only select one main manicure service at a time.',
        onAccept: () => setWarningModal(prev => ({ ...prev, isOpen: false }))
      });
      return;
    }

    onServiceSelect({
      ...service,
      category: 'manicure'
    });
  };

  const handleOptionSelect = (serviceTitle: string, option: 'twoNail' | 'tenNail' | null) => {
    setSelectedOptions(prev => ({
      ...prev,
      [serviceTitle]: option
    }));

    if (option) {
      const service = services.find(s => s.title === serviceTitle);
      if (service && service.options) {
        const selectedOption = service.options[option];
        onServiceSelect({
          ...service,
          category: 'manicure',
          price: selectedOption.price,
          duration: selectedOption.duration,
          options: {
            type: option === 'twoNail' ? '2 Nails' : '10 Nails',
            value: `${selectedOption.price}`
          }
        });
      }
    }
  };

  const handleRepairQuantityChange = (quantity: number) => {
    setRepairQuantity(quantity);
    const service = services.find(s => s.isRepairService);
    if (service) {
      onServiceSelect({
        ...service,
        category: 'manicure',
        price: Number(service.price) * quantity,
        options: {
          type: 'Quantity',
          value: `${quantity} nails`
        }
      });
    }
  };

  const handleDesignsChange = (serviceTitle: string, designs: string[]) => {
    setSelectedDesigns(prev => ({
      ...prev,
      [serviceTitle]: designs
    }));

    const service = services.find(s => s.title === serviceTitle);
    if (service && service.isDesignService) {
      const price = designs.length >= 3 
        ? (serviceTitle === "2 Nails Design" ? 8 : 20)
        : (serviceTitle === "2 Nails Design" ? 5 : 15);
      
      onServiceSelect({
        ...service,
        category: 'manicure',
        price,
        options: {
          type: 'Designs',
          value: designs.join(', ')
        }
      });
    }
  };

  const services: Service[] = [
    // Square Size
    {
      title: "Short Square (S)",
      category: 'manicure',
      subcategory: "Square Size",
      duration: "1h 30min",
      price: 50,
      description: "Includes gel top coat, nail & cuticle treatment."
    },
    {
      title: "Medium Square (M)",
      category: 'manicure',
      subcategory: "Square Size",
      duration: "1h 30min",
      price: 55,
      description: "Includes gel top coat, nail & cuticle treatment."
    },
    {
      title: "Large Square (L)",
      category: 'manicure',
      subcategory: "Square Size",
      duration: "1h 30min",
      price: 60,
      description: "Includes gel top coat, nail & cuticle treatment."
    },
    {
      title: "XL Square",
      category: 'manicure',
      subcategory: "Square Size",
      duration: "1h 30min",
      price: 65,
      description: "Includes gel top coat, nail & cuticle treatment."
    },
    {
      title: "2XL Square",
      category: 'manicure',
      subcategory: "Square Size",
      duration: "1h 30min",
      price: 70,
      description: "Includes gel top coat, nail & cuticle treatment."
    },
    {
      title: "3XL Square",
      category: 'manicure',
      subcategory: "Square Size",
      duration: "1h 30min",
      price: 75,
      description: "Includes gel top coat, nail & cuticle treatment."
    },
    {
      title: "Glamorous Square",
      category: 'manicure',
      subcategory: "Square Size",
      duration: "1h 30min",
      price: 80,
      description: "Includes gel top coat, nail & cuticle treatment."
    },
    // Color Acrylic
    {
      title: "Short Color Acrylic",
      category: 'manicure',
      subcategory: "Color Acrylic",
      duration: "1h 20min",
      price: 45,
      description: "Short color acrylic set for a clean, minimal look. Includes gel top coat."
    },
    {
      title: "Medium Color Acrylic",
      category: 'manicure',
      subcategory: "Color Acrylic",
      duration: "1h 30min",
      price: 50,
      description: "Balanced length with bold color. Includes gel top coat."
    },
    {
      title: "Large Color Acrylic",
      category: 'manicure',
      subcategory: "Color Acrylic",
      duration: "1h 30min",
      price: 55,
      description: "More dramatic length for standout styles. Includes gel top coat."
    },
    {
      title: "XL Color Acrylic",
      category: 'manicure',
      subcategory: "Color Acrylic",
      duration: "1h 30min",
      price: 60,
      description: "Extra length for extended elegance. Includes gel top coat."
    },
    {
      title: "2XL Color Acrylic",
      category: 'manicure',
      subcategory: "Color Acrylic",
      duration: "1h 30min",
      price: 65,
      description: "Statement length with full color finish. Includes gel top coat."
    },
    {
      title: "3XL Color Acrylic",
      category: 'manicure',
      subcategory: "Color Acrylic",
      duration: "1h 30min",
      price: 70,
      description: "High glam look with extra length. Includes gel top coat."
    },
    {
      title: "Glamorous Color Acrylic",
      category: 'manicure',
      subcategory: "Color Acrylic",
      duration: "1h 30min",
      price: 75,
      description: "Maximum length and style. Includes gel top coat."
    },
    // Sculpted Acrylic
    {
      title: "Short Sculpted",
      category: 'manicure',
      subcategory: "Sculpted Acrylic",
      duration: "1h 30min",
      price: 58,
      description: "Hand-sculpted acrylic without tips for short length. Includes gel top coat."
    },
    {
      title: "Medium Sculpted",
      category: 'manicure',
      subcategory: "Sculpted Acrylic",
      duration: "1h 30min",
      price: 63,
      description: "Sculpted set with medium length. Sleek and natural. Includes gel top coat."
    },
    {
      title: "Large Sculpted",
      category: 'manicure',
      subcategory: "Sculpted Acrylic",
      duration: "1h 30min",
      price: 68,
      description: "Sculpted acrylic for bold, long looks. Includes gel top coat."
    },
    {
      title: "XL Sculpted",
      category: 'manicure',
      subcategory: "Sculpted Acrylic",
      duration: "1h 30min",
      price: 73,
      description: "Long sculpted nails for elegance and drama. Includes gel top coat."
    },
    {
      title: "2XL Sculpted",
      category: 'manicure',
      subcategory: "Sculpted Acrylic",
      duration: "1h 30min",
      price: 78,
      description: "Extra long sculpted set for glamorous impact. Includes gel top coat."
    },
    {
      title: "3XL Sculpted",
      category: 'manicure',
      subcategory: "Sculpted Acrylic",
      duration: "1h 30min",
      price: 83,
      description: "High fashion sculpted nails. Designed for runway or everyday glam. Includes gel top coat."
    },
    {
      title: "Glamorous Sculpted",
      category: 'manicure',
      subcategory: "Sculpted Acrylic",
      duration: "1h 30min",
      price: 88,
      description: "Our most luxurious sculpted set. Maximum length, maximum shine. Includes gel top coat."
    },
    // Fills
    {
      title: "Acrylic Fill (2 weeks)",
      category: 'manicure',
      subcategory: "Fills",
      duration: "1h 25min",
      price: 40,
      description: "Recommended for clients returning within 2 weeks of previous service. Helps maintain shape and strength."
    },
    {
      title: "Acrylic Fill (3 weeks)",
      category: 'manicure',
      subcategory: "Fills",
      duration: "1h 25min",
      price: 45,
      description: "Ideal for clients returning after 3 weeks. Includes more reshaping and acrylic build-up."
    },
    {
      title: "Acrylic Fill (4 weeks)",
      category: 'manicure',
      subcategory: "Fills",
      duration: "1h 30min",
      price: 50,
      description: "Best for long regrowth. Includes shaping, restructuring, and fresh acrylic application."
    },
    // Removals
    {
      title: "Removal (Our Work)",
      category: 'manicure',
      subcategory: "Removals",
      duration: "30 min",
      price: 15,
      description: "Gentle removal of our own product using professional techniques to preserve nail health."
    },
    {
      title: "Removal (Other Work)",
      category: 'manicure',
      subcategory: "Removals",
      duration: "30 min",
      price: 20,
      description: "Removal of product from other salons. May require more time depending on material."
    },
    // Add-ons
    {
      title: "Almond Shape",
      category: 'manicure',
      subcategory: "Add-ons",
      duration: "15 min",
      price: 7,
      description: "A soft, tapered nail shape for a natural and elegant look. Add-on to any set."
    },
    {
      title: "French Tip",
      category: 'manicure',
      subcategory: "Add-ons",
      duration: "20 min",
      price: 8,
      description: "Classic and clean. Adds a white tip over your acrylic or gel base."
    },
    {
      title: "Cut-Down",
      category: 'manicure',
      subcategory: "Add-ons",
      duration: "5 min",
      price: 5,
      description: "Shortens the length of your existing nails while maintaining shape."
    },
    // Main Services
    {
      title: "Gel Manicure",
      category: 'manicure',
      subcategory: "Main Services",
      duration: "1h",
      price: 38,
      description: "Includes nail cut, cuticle care, short massage, and gel color of your choice."
    },
    {
      title: "Construction Gel",
      category: 'manicure',
      subcategory: "Main Services",
      duration: "10 min",
      price: 10,
      description: "Strengthens nails with a durable gel layer. Perfect for added longevity before polish."
    },
    {
      title: "Acrylic Over Natural Nail",
      category: 'manicure',
      subcategory: "Main Services",
      duration: "1h 10min",
      price: 40,
      description: "Protects and strengthens your natural nails while keeping a clean, polished finish."
    },
    // Designs
    {
      title: "2 Nails Design",
      category: 'manicure',
      subcategory: "Designs",
      duration: "15–20 min",
      price: "5 and up",
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
      title: "10 Nails Design",
      category: 'manicure',
      subcategory: "Designs",
      duration: "25 min",
      price: "15–20",
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
      title: "3D Flowers",
      category: 'manicure',
      subcategory: "Designs",
      duration: "20-30 min",
      price: "8-30",
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
      title: "Encapsulated",
      category: 'manicure',
      subcategory: "Designs",
      duration: "10-20 min",
      price: "8-25",
      description: "Encased nail art between acrylic layers. Preserves shine and design.",
      options: {
        twoNail: {
          price: 8,
          duration: "10 min"
        },
        tenNail: {
          price: 25,
          duration: "20 min"
        }
      }
    },
    {
      title: "Free-Hand Design",
      category: 'manicure',
      subcategory: "Designs",
      duration: "15-20 min",
      price: "7-25",
      description: "Custom designs drawn completely by hand. One-of-a-kind art.",
      options: {
        twoNail: {
          price: 7,
          duration: "15 min"
        },
        tenNail: {
          price: 25,
          duration: "20 min"
        }
      }
    },
    {
      title: "Acrylic Ombre",
      category: 'manicure',
      subcategory: "Designs",
      duration: "15-25 min",
      price: "4-8",
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
      title: "Gel Blur",
      category: 'manicure',
      subcategory: "Designs",
      duration: "15-20 min",
      price: "3-7",
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
      title: "Diamonds",
      category: 'manicure',
      subcategory: "Designs",
      duration: "15-30 min",
      price: "8-30",
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
      title: "Matte Finish",
      category: 'manicure',
      subcategory: "Designs",
      duration: "10-20 min",
      price: "2-5",
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
      title: "Repairs",
      category: 'manicure',
      subcategory: "Designs",
      duration: "10 min per nail",
      price: 5,
      description: "Repair cracked, chipped, or lifted nails. Priced per nail.",
      isRepairService: true
    },
    {
      title: "Gel Ombre",
      category: 'manicure',
      subcategory: "Designs",
      duration: "15-25 min",
      price: "4-8",
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
    }
  ];

  const categories = Array.from(new Set(services.map(service => service.subcategory)));

  return (
    <div className="space-y-8">
      {categories.map((category, categoryIndex) => (
        <div key={categoryIndex}>
          <h2 className="text-2xl font-playfair font-semibold text-gray-900 mb-6">
            {category}
          </h2>
          
          <div className="grid grid-cols-1 gap-6">
            {services
              .filter(service => service.subcategory === category)
              .map((service, index) => {
                const isSelected = selectedServices.some(s => 
                  s.category === 'manicure' && s.title === service.title
                );
                const isDisabled = isMainService(service.subcategory) && hasExistingMainService() &&
                  !selectedServices.some(s => s.title === service.title);

                return (
                  <div
                    key={index}
                    className={`bg-white rounded-xl shadow-lg overflow-hidden ${
                      isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                    
                    }`}
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <h3 className="text-xl font-playfair font-semibold text-gray-900">
                          {service.title}
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

                      {isSelected ? (
                        <div className="mt-4 space-y-4">
                          {service.isRepairService && (
                            <RepairQuantitySelector
                              basePrice={Number(service.price)}
                              onQuantityChange={handleRepairQuantityChange}
                            />
                          )}
                          
                          {service.isDesignService && service.addOns && (
                            <DesignSelector
                              designs={service.addOns}
                              onDesignsChange={(designs) => handleDesignsChange(service.title, designs)}
                              maxPrice={service.title === "2 Nails Design" ? 8 : 20}
                              minPrice={service.title === "2 Nails Design" ? 5 : 15}
                            />
                          )}
                          
                          {service.options && !service.isDesignService && (
                            <ServiceOptionSelector
                              service={service}
                              selectedOption={selectedOptions[service.title] || null}
                              onSelect={(option) => handleOptionSelect(service.title, option)}
                            />
                          )}

                          <button
                            onClick={() => onServiceCancel(service.title, 'manicure')}
                            className="w-full btn btn-secondary"
                          >
                            Remove Service
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleServiceSelect(service)}
                          disabled={isDisabled}
                          className={`mt-4 w-full btn ${isDisabled ? 'btn-secondary' : 'btn-primary'}`}
                        >
                          Select Service
                        </button>
                      )}
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