import React, { useState } from 'react';
import { User, Mail } from 'lucide-react';

interface CustomerInfo {
  firstName: string;
  lastName: string;
  email: string;
}

interface CustomerInfoFormProps {
  onSubmit: (info: CustomerInfo) => void;
  initialValues?: CustomerInfo;
}

export const CustomerInfoForm: React.FC<CustomerInfoFormProps> = ({
  onSubmit,
  initialValues = { firstName: '', lastName: '', email: '' }
}) => {
  const [info, setInfo] = useState<CustomerInfo>(initialValues);
  const [errors, setErrors] = useState<Partial<CustomerInfo>>({});

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<CustomerInfo> = {};

    if (!info.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!info.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!info.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(info.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(info);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <User className="w-6 h-6 text-primary" />
        <h3 className="text-xl font-playfair font-semibold">Your Information</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
              First Name *
            </label>
            <input
              type="text"
              id="firstName"
              value={info.firstName}
              onChange={(e) => setInfo({ ...info, firstName: e.target.value })}
              className={`w-full px-4 py-2 rounded-lg border ${
                errors.firstName ? 'border-red-500' : 'border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-primary/50`}
              placeholder="Enter your first name"
            />
            {errors.firstName && (
              <p className="mt-1 text-sm text-red-500">{errors.firstName}</p>
            )}
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
              Last Name *
            </label>
            <input
              type="text"
              id="lastName"
              value={info.lastName}
              onChange={(e) => setInfo({ ...info, lastName: e.target.value })}
              className={`w-full px-4 py-2 rounded-lg border ${
                errors.lastName ? 'border-red-500' : 'border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-primary/50`}
              placeholder="Enter your last name"
            />
            {errors.lastName && (
              <p className="mt-1 text-sm text-red-500">{errors.lastName}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="email"
              id="email"
              value={info.email}
              onChange={(e) => setInfo({ ...info, email: e.target.value })}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-primary/50`}
              placeholder="you@example.com"
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-sm text-red-500">{errors.email}</p>
          )}
        </div>

        <div className="text-sm text-gray-500">
          * Required fields
        </div>

        <button 
          type="submit"
          className="w-full btn btn-primary"
        >
          Continue to Payment
        </button>
      </form>
    </div>
  );
};