import React from 'react';
import { User } from 'lucide-react';

export interface Employee {
  id: string;
  name: string;
  image: string;
  services: ('manicure' | 'pedicure')[];
}

interface EmployeeSelectionProps {
  onSelect: (employee: Employee | null) => void;
  selectedEmployee: Employee | null;
}

export const EmployeeSelection: React.FC<EmployeeSelectionProps> = ({
  onSelect,
  selectedEmployee
}) => {
  const employees: Employee[] = [
    {
      id: '1',
      name: 'Dora Alviter',
      image: 'https://images.pexels.com/photos/3997383/pexels-photo-3997383.jpeg',
      services: ['manicure']
    },
    {
      id: '2',
      name: 'Aracely Orozco',
      image: 'https://images.pexels.com/photos/3997385/pexels-photo-3997385.jpeg',
      services: ['manicure', 'pedicure']
    },
    {
      id: '3',
      name: 'Anyone Available',
      image: '',
      services: ['manicure', 'pedicure']
    }
  ];

  return (
    <div className="py-12">
      <h2 className="text-2xl font-playfair font-semibold text-center mb-8">
        Choose Your Nail Artist
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {employees.map((employee) => (
          <button
            key={employee.id}
            onClick={() => onSelect(employee)}
            className={`relative group p-6 rounded-xl transition-all ${
              selectedEmployee?.id === employee.id
                ? 'bg-primary text-white shadow-lg scale-[1.02]'
                : 'bg-white hover:bg-gray-50 shadow-md hover:shadow-lg'
            }`}
          >
            <div className="text-center">
              {employee.id === '3' ? (
                <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <User className={`w-12 h-12 ${
                    selectedEmployee?.id === employee.id ? 'text-white' : 'text-gray-400'
                  }`} />
                </div>
              ) : (
                <img
                  src={employee.image}
                  alt={employee.name}
                  className="w-24 h-24 mx-auto mb-4 rounded-full object-cover"
                />
              )}

              <h3 className="text-lg font-medium mb-2">{employee.name}</h3>
              
              <div className={`text-sm ${
                selectedEmployee?.id === employee.id ? 'text-white/80' : 'text-gray-600'
              }`}>
                {employee.services.map((service) => (
                  <span key={service} className="capitalize">
                    {service}
                    {service !== employee.services[employee.services.length - 1] && ' • '}
                  </span>
                ))}
              </div>
            </div>

            {selectedEmployee?.id === employee.id && (
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-accent rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};