import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    if (!isHome) {
      window.location.href = `/#${id}`;
      return;
    }
    
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <nav 
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white shadow-md py-2' : 'bg-transparent py-4'
      }`}
    >
      <div className="container flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2">
          <img 
            src="/images/logo-doritas.svg" 
            alt="Dorita's Nails Logo" 
            className="h-10 w-10"
          />
          <span className="text-xl font-playfair font-semibold">Dorita's Nails</span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8">
          <a 
            href="#services" 
            onClick={(e) => handleNavClick(e, 'services')}
            className="hover:text-primary transition-colors"
          >
            Services
          </a>
          <a 
            href="#gallery" 
            onClick={(e) => handleNavClick(e, 'gallery')}
            className="hover:text-primary transition-colors"
          >
            Gallery
          </a>
          <a 
            href="#about" 
            onClick={(e) => handleNavClick(e, 'about')}
            className="hover:text-primary transition-colors"
          >
            About
          </a>
          <a 
            href="#location" 
            onClick={(e) => handleNavClick(e, 'location')}
            className="hover:text-primary transition-colors"
          >
            Location
          </a>
          <Link to="/book" className="btn btn-primary">Book Now</Link>
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden text-gray-600"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isMobileMenuOpen ? (
              <path strokeLinecap="round\" strokeLinejoin="round\" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white shadow-lg py-4 px-6 absolute w-full">
          <div className="flex flex-col gap-4">
            <a 
              href="#services" 
              onClick={(e) => handleNavClick(e, 'services')}
              className="hover:text-primary transition-colors py-2"
            >
              Services
            </a>
            <a 
              href="#gallery" 
              onClick={(e) => handleNavClick(e, 'gallery')}
              className="hover:text-primary transition-colors py-2"
            >
              Gallery
            </a>
            <a 
              href="#about" 
              onClick={(e) => handleNavClick(e, 'about')}
              className="hover:text-primary transition-colors py-2"
            >
              About
            </a>
            <a 
              href="#location" 
              onClick={(e) => handleNavClick(e, 'location')}
              className="hover:text-primary transition-colors py-2"
            >
              Location
            </a>
            <Link 
              to="/book" 
              className="btn btn-primary w-full text-center mt-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Book Now
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};