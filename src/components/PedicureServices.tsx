import React from 'react';
import { Clock, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PedicureService {
  name: string;
  price: number;
  duration: string;
  description: string;
}

export const PedicureServices: React.FC = () => {
  const services: PedicureService[] = [
    {
      name: "Basic Pedicure",
      price: 30,
      duration: "45 minutes",
      description: "Foot soak, cuticle cleaning, nail shaping, polishing, and foot massage with hot towel."
    },
    {
      name: "Special Dorita's Pedicure",
      price: 35,
      duration: "45 minutes",
      description: "Foot soak, cuticle cleaning, nail shaping, polishing. Callus treatment and foot massage with hot towel."
    },
    {
      name: "Paraffin Pedicure",
      price: 40,
      duration: "50 minutes",
      description: "Foot soak, cuticle cleaning, nail shaping, polishing. Callus treatment, paraffin wax, and foot massage with hot towel."
    },
    {
      name: "Pedicure Spa Deluxe",
      price: 55,
      duration: "1 hour 15 minutes",
      description: "Foot soak, cuticle cleaning, nail shaping, polishing. Callus treatment, sugar scrub, foot mask, paraffin wax. Foot massage with hot towel and gel polish included."
    },
    {
      name: "Acrylic (10 Toes)",
      price: 30,
      duration: "35 minutes",
      description: "Full acrylic application on all toes. Includes nail and cuticle treatment."
    },
    {
      name: "2 Thumbs Acrylic",
      price: 10,
      duration: "20 minutes",
      description: "Acrylic application on both thumbs. Includes foot soak, cuticle cleaning, nail shaping, polishing, and foot massage with hot towel."
    }
  ];

  return (
    <section className="min-h-screen bg-gradient-to-br from-blush/30 via-white to-secondary/20">
      <div className="container py-12 md:py-20">
        <Link 
          to="/" 
          className="inline-flex items-center text-primary hover:text-primary/80 transition-colors mb-8"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Home
        </Link>

        <div className="max-w-6xl mx-auto">
          <div className="relative text-center mb-16">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 bg-secondary/20 rounded-full blur-2xl"></div>
            </div>
            <h1 className="relative text-4xl md:text-5xl font-playfair font-semibold text-gray-900 mb-4">
              Revitalize Your Steps
            </h1>
            <p className="relative text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
              Pampering Pedicures That Inspire Confidence
            </p>
            <Link
              to="/book"
              className="relative inline-block px-8 py-4 bg-gradient-to-r from-primary to-accent text-white rounded-full text-lg font-medium transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl mt-8"
            >
              Book Your Service Now
            </Link>
          </div>

          <div className="relative w-full h-[300px] md:h-[400px] mb-16 rounded-2xl overflow-hidden shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent"></div>
            <img 
              src="https://images.pexels.com/photos/3997391/pexels-photo-3997391.jpeg"
              alt="Luxury pedicure service" 
              className="w-full h-full object-cover"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <div
                key={index}
                className="group bg-white rounded-xl shadow-lg overflow-hidden transform transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
              >
                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <h3 className="text-2xl font-playfair font-semibold text-gray-900 group-hover:text-primary transition-colors">
                      {service.name}
                    </h3>
                    <span className="text-2xl font-playfair font-semibold text-primary group-hover:scale-110 transition-transform">
                      ${service.price}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-gray-600">
                    <div className="flex items-center group-hover:text-primary/80 transition-colors">
                      <Clock className="w-4 h-4 mr-1" />
                      {service.duration}
                    </div>
                  </div>
                  
                  <div className="text-gray-700 border-t border-gray-100 pt-4 group-hover:border-primary/20 transition-colors">
                    <p>{service.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="relative mt-16 text-center">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 bg-accent/10 rounded-full blur-3xl"></div>
            </div>
            <Link
              to="/book"
              className="relative inline-block px-8 py-4 bg-gradient-to-r from-primary to-accent text-white rounded-full text-lg font-medium transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Book Your Service Now
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};