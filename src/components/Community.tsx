import React from 'react';
import { Instagram, Router as Butterfly, Phone } from 'lucide-react';

export const Community: React.FC = () => {
  return (
    <section id="community" className="py-20 bg-gradient-to-br from-secondary/30 via-blush/30 to-tertiary/20 relative overflow-hidden">
      {/* Decorative butterfly */}
      <div className="absolute top-10 right-10 text-primary/10">
        <Butterfly className="w-24 h-24 animate-float" />
      </div>
      
      <div className="container text-center relative z-10">
        <h2 className="section-title mb-10">Join the community and stay tuned!</h2>
        
        <a 
          href="https://www.instagram.com/dorita_nails1?igsh=NTc4MTIwNjQ2YQ==" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-full hover:scale-110 transition-transform mb-6"
        >
          <Instagram className="w-8 h-8 text-white" />
        </a>
        
        <p className="text-lg max-w-2xl mx-auto text-gray-700 mb-16">
          Follow us for exclusive designs, promotions, and nail care tips!
        </p>

        <div className="max-w-3xl mx-auto bg-white/80 backdrop-blur-sm rounded-2xl p-8 md:p-12 shadow-xl">
          <p className="text-2xl font-playfair text-gray-800 mb-8">
            We don't just create nails, we craft confidence.
          </p>

          <div className="space-y-4">
            <a 
              href="https://www.instagram.com/dorita_nails1?igsh=NTc4MTIwNjQ2YQ==" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block w-full md:w-auto px-8 py-4 bg-gradient-to-r from-primary to-accent text-white rounded-full text-lg font-medium transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Let your nails tell your story — follow us @dorita_nails1
            </a>

            <a 
              href="tel:+1 (909) 838-7363"
              className="inline-block w-full md:w-auto px-8 py-4 bg-white text-primary border-2 border-primary rounded-full text-lg font-medium transition-all duration-300 hover:bg-primary/5 hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <span className="flex items-center justify-center gap-2">
                <Phone className="w-5 h-5" />
                Call us now
              </span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};