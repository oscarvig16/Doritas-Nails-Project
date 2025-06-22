import React from 'react';
import { Link } from 'react-router-dom';

export const Services: React.FC = () => {
  return (
    <section id="services" className="py-20">
      <div className="container">
        <h2 className="section-title">We are excited to pamper you with our services!</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Manicure Card */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden transform transition hover:-translate-y-1 hover:shadow-xl">
            <div className="p-8">
              <div className="w-24 h-24 mx-auto mb-6 flex items-center justify-center bg-blush rounded-full">
                <img 
                  src="/images/icon-facebook.svg" 
                  alt="Manicure icon"
                  className="w-20 h-20"
                />
              </div>
              <h3 className="text-2xl font-semibold text-center mb-4">Manicure</h3>
              <p className="text-center text-gray-600 mb-6">
                Classic, gel, and artistic designs tailored to your style.
              </p>
              <div className="text-center space-y-3">
                <Link to="/manicure" className="btn btn-secondary w-full">View Services</Link>
                <Link to="/book" className="btn btn-primary w-full">Book Now</Link>
              </div>
            </div>
          </div>
          
          {/* Pedicure Card */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden transform transition hover:-translate-y-1 hover:shadow-xl">
            <div className="p-8">
              <div className="w-24 h-24 mx-auto mb-6 flex items-center justify-center bg-blush rounded-full">
                <img 
                  src="/images/icon-instagram.svg" 
                  alt="Pedicure icon"
                  className="w-[5.5rem] h-[5.5rem]"
                />
              </div>
              <h3 className="text-2xl font-semibold text-center mb-4">Pedicure</h3>
              <p className="text-center text-gray-600 mb-6">
                Relaxing treatments that leave you refreshed from heel to toe.
              </p>
              <div className="text-center space-y-3">
                <Link to="/pedicure" className="btn btn-secondary w-full">View Services</Link>
                <Link to="/book" className="btn btn-primary w-full">Book Now</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};