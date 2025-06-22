import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

export const Hero: React.FC = () => {
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subheadlineRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const elements = [headlineRef.current, subheadlineRef.current, ctaRef.current];
    
    elements.forEach((el, index) => {
      if (el) {
        setTimeout(() => {
          el.classList.add('fade-in');
        }, 300 * index);
      }
    });
  }, []);

  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div 
          className="absolute inset-0 bg-gradient-to-r from-primary/60 to-accent/40 mix-blend-multiply"
        ></div>
        <img 
          src="https://images.pexels.com/photos/3997391/pexels-photo-3997391.jpeg" 
          alt="Nail salon interior" 
          className="w-full h-full object-cover"
        />
      </div>
      
      <div className="container relative z-10 text-center text-white">
        <h1 
          ref={headlineRef}
          className="text-4xl md:text-5xl lg:text-6xl font-semibold max-w-3xl mx-auto opacity-0"
        >
          Where excellence meets beauty: Personalized nail care just for you.
        </h1>
        
        <p 
          ref={subheadlineRef}
          className="text-xl md:text-2xl mt-6 max-w-2xl mx-auto opacity-0"
        >
          Step into a luxurious, stress-free experience today.
        </p>
        
        <Link 
          ref={ctaRef}
          to="/book" 
          className="mt-10 btn btn-primary text-lg shadow-lg opacity-0"
        >
          Book Now
        </Link>
      </div>
    </section>
  );
};