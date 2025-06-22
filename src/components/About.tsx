import React from 'react';
import { Users2, Shield, Heart } from 'lucide-react';

export const About: React.FC = () => {
  const features = [
    {
      icon: <Users2 className="w-6 h-6" />,
      title: "Expert Care",
      description: "Our skilled technicians bring years of expertise to every service."
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Safety First",
      description: "We maintain the highest standards of hygiene and sterilization."
    },
    {
      icon: <Heart className="w-6 h-6" />,
      title: "Personal Touch",
      description: "Every treatment is tailored to your unique preferences."
    }
  ];

  return (
    <section id="about" className="py-20 bg-gradient-to-b from-blush/20 to-white">
      <div className="container">
        <div className="max-w-6xl mx-auto">
          <h2 className="section-title mb-16">About Us: Redefining the Nail Salon Experience</h2>
          
          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            <div className="order-2 lg:order-1 space-y-6">
              <div className="space-y-4">
                <h3 className="text-2xl font-playfair font-semibold text-primary">Our Promise to You</h3>
                <p className="text-gray-700 leading-relaxed">
                  Experience more than just a nail appointment – it's self-care, luxury, and confidence redefined. At Dorita's Nails, every detail is crafted with precision, from the spotless hygiene standards to the personalized care you deserve.
                </p>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-2xl font-playfair font-semibold text-primary">The Dorita's Difference</h3>
                <p className="text-gray-700 leading-relaxed">
                  Step into an environment where time slows down, your preferences are honored, and every visit feels like a retreat designed just for you. You deserve to feel flawless, valued, and relaxed — every single time.
                </p>
              </div>
              
              <a 
                href="#services" 
                className="inline-flex items-center text-primary hover:text-primary/80 transition-colors group"
              >
                Discover our signature services
                <svg 
                  className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
            
            <div className="order-1 lg:order-2">
              <div className="relative">
                <img 
                  src="https://images.pexels.com/photos/3997378/pexels-photo-3997378.jpeg"
                  alt="Luxury nail care experience" 
                  className="rounded-lg shadow-xl w-full h-[500px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent rounded-lg"></div>
              </div>
            </div>
          </div>
          
          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-playfair font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};