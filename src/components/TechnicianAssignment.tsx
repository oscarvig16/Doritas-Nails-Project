import React from 'react';
import { User } from 'lucide-react';

export interface Technician {
  id: string;
  name: string;
  image: string;
  services: ('manicure' | 'pedicure')[];
}

interface TechnicianAssignmentProps {
  onSelect: (selection: {
    type: 'single' | 'split' | 'auto';
    manicureTech?: Technician;
    pedicureTech?: Technician;
  }) => void;
  selectedOption: {
    type: 'single' | 'split' | 'auto';
    manicureTech?: Technician;
    pedicureTech?: Technician;
  } | null;
  hasManicure: boolean;
  hasPedicure: boolean;
}

export const TechnicianAssignment: React.FC<TechnicianAssignmentProps> = ({
  onSelect,
  selectedOption,
  hasManicure,
  hasPedicure
}) => {
  // CRITICAL: These names must match EXACTLY with the employees table
  // Database has: 'Dora Alviter' and 'Aracely Orozco'
  const technicians: Technician[] = [
    {
      id: '1',
      name: 'Dora Alviter', // Exact match with database
      image: 'https://images.pexels.com/photos/3997383/pexels-photo-3997383.jpeg',
      services: ['manicure']
    },
    {
      id: '2',
      name: 'Aracely Orozco', // Exact match with database
      image: 'https://images.pexels.com/photos/3997385/pexels-photo-3997385.jpeg',
      services: ['manicure', 'pedicure']
    }
  ];

  const handleSingleTechnicianSelect = (tech: Technician) => {
    // Check if technician is qualified for all selected services
    if (hasPedicure && !tech.services.includes('pedicure')) {
      return; // Cannot select this technician for all services
    }
    
    console.log('Selected single technician:', tech.name);
    
    onSelect({
      type: 'single',
      manicureTech: tech,
      pedicureTech: tech
    });
  };

  const handleSplitTechnicianSelect = (service: 'manicure' | 'pedicure', tech: Technician) => {
    if (!tech.services.includes(service)) {
      return; // Technician not qualified for this service
    }

    console.log('Selected technician for', service, ':', tech.name);

    onSelect({
      type: 'split',
      manicureTech: service === 'manicure' ? tech : selectedOption?.manicureTech,
      pedicureTech: service === 'pedicure' ? tech : selectedOption?.pedicureTech
    });
  };

  const canSelectService = (tech: Technician, service: 'manicure' | 'pedicure'): boolean => {
    return tech.services.includes(service);
  };

  const isDisabled = (tech: Technician, type: 'single' | 'split', service?: 'manicure' | 'pedicure'): boolean => {
    if (type === 'single') {
      if (hasPedicure && !tech.services.includes('pedicure')) return true;
      if (hasManicure && !tech.services.includes('manicure')) return true;
    } else if (type === 'split' && service) {
      return !tech.services.includes(service);
    }
    return false;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-playfair font-semibold mb-6">
        Choose Your Technician
      </h3>

      <div className="space-y-6">
        {/* Single Technician Option */}
        <div className={`bg-gray-50 rounded-xl p-6 ${
          selectedOption?.type === 'single' ? 'ring-2 ring-primary' : 'border border-gray-200'
        }`}>
          <button
            onClick={() => onSelect({ type: 'single' })}
            className="w-full text-left"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedOption?.type === 'single' 
                  ? 'border-primary' 
                  : 'border-gray-300'
              }`}>
                {selectedOption?.type === 'single' && (
                  <div className="w-3 h-3 rounded-full bg-primary" />
                )}
              </div>
              <span className="font-medium">One technician for all services</span>
            </div>
          </button>

          {selectedOption?.type === 'single' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {technicians.map(tech => (
                <button
                  key={tech.id}
                  onClick={() => handleSingleTechnicianSelect(tech)}
                  disabled={isDisabled(tech, 'single')}
                  className={`p-4 rounded-lg border transition-all ${
                    selectedOption?.manicureTech?.id === tech.id
                      ? 'border-primary bg-primary/5'
                      : isDisabled(tech, 'single')
                      ? 'border-gray-200 opacity-50 cursor-not-allowed'
                      : 'border-gray-200 hover:border-primary/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={tech.image}
                      alt={tech.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div className="text-left">
                      <div className="font-medium">{tech.name}</div>
                      <div className="text-sm text-gray-600">
                        {tech.services.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' • ')}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Split Technicians Option */}
        <div className={`bg-gray-50 rounded-xl p-6 ${
          selectedOption?.type === 'split' ? 'ring-2 ring-primary' : 'border border-gray-200'
        }`}>
          <button
            onClick={() => onSelect({ type: 'split' })}
            className="w-full text-left"
            disabled={!hasManicure || !hasPedicure}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedOption?.type === 'split' 
                  ? 'border-primary' 
                  : 'border-gray-300'
              }`}>
                {selectedOption?.type === 'split' && (
                  <div className="w-3 h-3 rounded-full bg-primary" />
                )}
              </div>
              <span className="font-medium">Different technicians for manicure and pedicure</span>
              {(!hasManicure || !hasPedicure) && (
                <span className="text-sm text-gray-500">(Requires both manicure and pedicure services)</span>
              )}
            </div>
          </button>

          {selectedOption?.type === 'split' && (
            <div className="space-y-4 mt-4">
              {hasManicure && (
                <div>
                  <h4 className="font-medium mb-2">Manicure Technician:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {technicians
                      .filter(tech => tech.services.includes('manicure'))
                      .map(tech => (
                        <button
                          key={tech.id}
                          onClick={() => handleSplitTechnicianSelect('manicure', tech)}
                          disabled={isDisabled(tech, 'split', 'manicure')}
                          className={`p-4 rounded-lg border transition-all ${
                            selectedOption?.manicureTech?.id === tech.id
                              ? 'border-primary bg-primary/5'
                              : isDisabled(tech, 'split', 'manicure')
                              ? 'border-gray-200 opacity-50 cursor-not-allowed'
                              : 'border-gray-200 hover:border-primary/60'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={tech.image}
                              alt={tech.name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                            <div className="text-left">
                              <div className="font-medium">{tech.name}</div>
                              <div className="text-sm text-gray-600">Manicure</div>
                            </div>
                          </div>
                        </button>
                    ))}
                  </div>
                </div>
              )}

              {hasPedicure && (
                <div>
                  <h4 className="font-medium mb-2">Pedicure Technician:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {technicians
                      .filter(tech => tech.services.includes('pedicure'))
                      .map(tech => (
                        <button
                          key={tech.id}
                          onClick={() => handleSplitTechnicianSelect('pedicure', tech)}
                          disabled={isDisabled(tech, 'split', 'pedicure')}
                          className={`p-4 rounded-lg border transition-all ${
                            selectedOption?.pedicureTech?.id === tech.id
                              ? 'border-primary bg-primary/5'
                              : isDisabled(tech, 'split', 'pedicure')
                              ? 'border-gray-200 opacity-50 cursor-not-allowed'
                              : 'border-gray-200 hover:border-primary/60'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={tech.image}
                              alt={tech.name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                            <div className="text-left">
                              <div className="font-medium">{tech.name}</div>
                              <div className="text-sm text-gray-600">Pedicure</div>
                            </div>
                          </div>
                        </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Auto-assign Option */}
        <div className={`bg-gray-50 rounded-xl p-6 ${
          selectedOption?.type === 'auto' ? 'ring-2 ring-primary' : 'border border-gray-200'
        }`}>
          <button
            onClick={() => {
              console.log('Selected auto-assignment');
              onSelect({ type: 'auto' });
            }}
            className="w-full text-left"
          >
            <div className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedOption?.type === 'auto' 
                  ? 'border-primary' 
                  : 'border-gray-300'
              }`}>
                {selectedOption?.type === 'auto' && (
                  <div className="w-3 h-3 rounded-full bg-primary" />
                )}
              </div>
              <div>
                <span className="font-medium block">Let us assign the best available technician</span>
                <span className="text-sm text-gray-600">
                  We'll assign the most suitable technician(s) for your services
                </span>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};