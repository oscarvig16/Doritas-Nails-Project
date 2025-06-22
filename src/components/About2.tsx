import React from 'react';
import { Award, Sparkles, Clock } from 'lucide-react';

export const About2: React.FC = () => {
  return (
    <section id="about" className="py-20 bg-white">
      <div className="container">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Left Column */}
            <div className="lg:col-span-5 space-y-8">
              <h2 className="text-4xl font-playfair font-semibold text-gray-900">
                About Us: Redefining the Nail Salon Experience
              </h2>
              
              <div className="prose prose-lg">
                <p className="text-gray-700 leading-relaxed">
                  Experience more than just a nail appointment – it's self-care, luxury, and confidence redefined. At Dorita's Nails, every detail is crafted with precision.
                </p>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Award className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Premium Quality</h3>
                    <p className="text-gray-600">Top-tier products and expert application techniques.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Personalized Service</h3>
                    <p className="text-gray-600">Customized treatments for your unique style.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Relaxing Environment</h3>
                    <p className="text-gray-600">A peaceful escape from your busy day.</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right Column */}
            <div className="lg:col-span-7">
              <div className="grid grid-cols-2 gap-4">
                <div className="aspect-square">
                  <img 
                    src="https://images.pexels.com/photos/3997384/pexels-photo-3997384.jpeg"
                    alt="Nail art detail" 
                    className="w-full h-full object-cover rounded-lg shadow-lg"
                  />
                </div>
                <div className="aspect-square mt-8">
                  <img 
                    src="https://images.pexels.com/photos/3997388/pexels-photo-3997388.jpeg"
                    alt="Salon atmosphere" 
                    className="w-full h-full object-cover rounded-lg shadow-lg"
                  />
                </div>
              </div>
              
              <div className="mt-8 bg-blush/30 p-6 rounded-lg">
                <h3 className="text-xl font-playfair font-semibold mb-4">The Dorita's Difference</h3>
                <p className="text-gray-700">
                  Step into an environment where time slows down, your preferences are honored, and every visit feels like a retreat designed just for you. You deserve to feel flawless, valued, and relaxed — every single time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};