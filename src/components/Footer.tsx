import React from 'react';
import { Phone, Mail, Clock, MapPin } from 'lucide-react';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer id="footer" className="bg-primary text-white pt-16 pb-6">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">
          {/* Brand */}
          <div>
            <div className="mb-4">
              <span className="text-xl font-playfair font-semibold">Dorita's Nails</span>
            </div>
            <p className="text-white/80 leading-relaxed">
              Where excellence meets beauty: Personalized nail care just for you.
            </p>
          </div>
          
          {/* Contact */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <Phone className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>(909) 838-7363</span>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>info@doritasnails.com</span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>202 N Riverside Ave Suite C, Rialto, CA 92376</span>
              </li>
            </ul>
          </div>
          
          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><a href="#services" className="hover:text-secondary transition-colors">Services</a></li>
              <li><a href="#gallery" className="hover:text-secondary transition-colors">Gallery</a></li>
              <li><a href="#about" className="hover:text-secondary transition-colors">About Us</a></li>
              <li><a href="#book" className="hover:text-secondary transition-colors">Book Appointment</a></li>
            </ul>
          </div>
          
          {/* Opening Hours */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Opening Hours</h3>
            <ul className="space-y-2">
              <li className="flex items-center justify-between">
                <span>Monday:</span>
                <span>8:00 am – 4:00 pm</span>
              </li>
              <li className="flex items-center justify-between text-red-300">
                <span>Tuesday:</span>
                <span>Closed</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Wed-Sat:</span>
                <span>8:00 am – 4:00 pm</span>
              </li>
              <li className="flex items-center justify-between text-red-300">
                <span>Sunday:</span>
                <span>Closed</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-white/20 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p>&copy; {currentYear} Dorita's Nails. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-secondary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-secondary transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};