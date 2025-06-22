import React from 'react';
import { Star, Heart, Smile } from 'lucide-react';
import { Link } from 'react-router-dom';

export const About3: React.FC = () => {
  return (
    <section id="about" className="py-20 bg-gradient-to-br from-blush/30 via-white to-secondary/20">
      <div className="container">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <h2 className="text-4xl md:text-5xl font-playfair font-semibold text-gray-900 mb-16 text-center">
            About Us: Redefining the Nail Salon Experience
          </h2>
          
          {/* Image Grid */}
          <div className="grid grid-cols-3 gap-4 mb-16">
            <div className="col-span-2">
              <img 
                src="https://images.pexels.com/photos/3997377/pexels-photo-3997377.jpeg"
                alt="Luxury nail care" 
                className="w-full h-[400px] object-cover rounded-lg shadow-lg"
              />
            </div>
            <div className="space-y-4">
              <img 
                src="https://images.pexels.com/photos/3997380/pexels-photo-3997380.jpeg"
                alt="Nail art detail" 
                className="w-full h-[190px] object-cover rounded-lg shadow-lg"
              />
              <img 
                src="https://images.pexels.com/photos/3997382/pexels-photo-3997382.jpeg"
                alt="Salon atmosphere" 
                className="w-full h-[190px] object-cover rounded-lg shadow-lg"
              />
            </div>
          </div>
          
          {/* Content Blocks */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white p-8 rounded-lg shadow-lg">
              <Star className="w-8 h-8 text-primary mb-4" />
              <h3 className="text-xl font-playfair font-semibold mb-4">Expert Care</h3>
              <p className="text-gray-700">
                Experience more than just a nail appointment – it's self-care, luxury, and confidence redefined. At Dorita's Nails, every detail is crafted with precision.
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-lg shadow-lg">
              <Heart className="w-8 h-8 text-primary mb-4" />
              <h3 className="text-xl font-playfair font-semibold mb-4">Personal Touch</h3>
              <p className="text-gray-700">
                Step into an environment where time slows down and your preferences are honored. Every visit feels like a retreat designed just for you.
              </p>
            </div>
            
            <div className="bg-white p-8 rounded-lg shadow-lg">
              <Smile className="w-8 h-8 text-primary mb-4" />
              <h3 className="text-xl font-playfair font-semibold mb-4">Your Happiness</h3>
              <p className="text-gray-700">
                You deserve to feel flawless, valued, and relaxed — every single time. That's our commitment to your satisfaction.
              </p>
            </div>
          </div>
          
          {/* Call to Action */}
          <div className="text-center">
            <Link 
              to="/about" 
              className="inline-flex items-center text-primary hover:text-primary/80 transition-colors group text-lg"
            >
              Discover Dorita's Difference
              <svg 
                className="w-5 h-5 ml-2 transform group-hover:translate-x-1 transition-transform" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};