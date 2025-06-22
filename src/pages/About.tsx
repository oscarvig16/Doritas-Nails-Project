import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Heart, Clock, Smile } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';

export const About: React.FC = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const beliefsRef = useRef<HTMLDivElement>(null);
  const differenceRef = useRef<HTMLDivElement>(null);
  const promiseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const elements = [heroRef, beliefsRef, differenceRef, promiseRef];
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('fade-in');
          }
        });
      },
      { threshold: 0.1 }
    );

    elements.forEach((ref) => {
      if (ref.current) {
        observer.observe(ref.current);
      }
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="font-raleway text-gray-800">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative min-h-[60vh] flex items-center justify-center pt-20 overflow-hidden bg-gradient-to-br from-primary to-tertiary">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-white" 
               style={{
                 clipPath: 'polygon(0 100%, 100% 100%, 100% 0, 50% 50%, 0 0)'
               }}
          ></div>
          
          {/* Decorative Elements */}
          <div className="absolute top-20 left-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        </div>
        
        <div ref={heroRef} className="container relative text-center text-white opacity-0">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-playfair font-semibold mb-6">
            Where every detail is designed around you!
          </h1>
          <p className="text-xl md:text-2xl max-w-2xl mx-auto">
            Discover the heart and values that make Dorita's Nails your forever salon.
          </p>
        </div>
      </section>

      {/* Our Beliefs Section */}
      <section className="py-20">
        <div className="container">
          <div ref={beliefsRef} className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center opacity-0">
            <div>
              <h2 className="text-3xl md:text-4xl font-playfair font-semibold mb-6">
                Our beliefs
              </h2>
              <div className="prose prose-lg">
                <p className="text-lg leading-relaxed">
                  At <span className="font-semibold">Dorita's Nails</span> we believe your nail care experience should be more than just a service, it should be a sanctuary. A place where you <span className="font-semibold">feel valued, respected, and pampered every step of the way</span>.
                </p>
                <p className="text-lg leading-relaxed">
                  Founded with a commitment to <span className="font-semibold">unwavering quality, hygiene, and customer-first service</span>, our salon isn't just about beautiful nails – it's about how you feel when you leave our chairs.
                </p>
              </div>
            </div>
            <div className="relative">
              <img 
                src="https://images.pexels.com/photos/3997378/pexels-photo-3997378.jpeg"
                alt="Nail care experience" 
                className="rounded-lg shadow-xl"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent rounded-lg"></div>
            </div>
          </div>
        </div>
      </section>

      {/* What Makes Us Different Section */}
      <section className="py-20 bg-gray-50">
        <div className="container">
          <div ref={differenceRef} className="max-w-6xl mx-auto opacity-0">
            <h2 className="text-3xl md:text-4xl font-playfair font-semibold text-center mb-12">
              What makes us different?
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-xl shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Flawless Craftsmanship</h3>
                    <p className="text-gray-600">Every nail is sculpted with precision, care, and an eye for detail.</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-8 rounded-xl shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Heart className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Spotless Hygiene Standards</h3>
                    <p className="text-gray-600">From tools to workstations, we uphold the highest levels of cleanliness for your peace of mind.</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-8 rounded-xl shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Clock className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Time is Valued</h3>
                    <p className="text-gray-600">No long waits. No rushed jobs. Just seamless, well-managed appointments.</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-8 rounded-xl shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Smile className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Respectful, Friendly Service</h3>
                    <p className="text-gray-600">Our team listens, understands, and ensures your preferences are honored – every single time.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Promise Section */}
      <section className="py-20 bg-blush">
        <div className="container">
          <div ref={promiseRef} className="max-w-3xl mx-auto text-center opacity-0">
            <h2 className="text-3xl md:text-4xl font-playfair font-semibold mb-8">
              Our Promise to You:
            </h2>
            <div className="space-y-6 text-lg leading-relaxed">
              <p>
                When you step into Dorita's Nails, you're not just another appointment – you're a <span className="font-semibold">valued guest</span>.
              </p>
              <p>
                Whether it's a quick touch-up or a luxurious pampering session, <span className="font-semibold">we're here to exceed your expectations every time</span>.
              </p>
              <p>
                Because at <span className="font-semibold">Dorita's Nails</span>, it's about <span className="font-semibold">feeling confident, relaxed, and absolutely cherished</span>.
              </p>
              <p className="text-xl font-playfair italic">
                Your time. Your beauty. Your experience. Perfected.
              </p>
              <p>
                Book your appointment today and discover why our clients call us their <span className="font-semibold">"forever nail salon."</span>
              </p>
            </div>
            
            <Link 
              to="/book"
              className="mt-12 inline-block px-12 py-4 bg-primary text-white rounded-full text-xl font-playfair hover:bg-primary/90 transform hover:scale-105 transition-all shadow-lg hover:shadow-xl"
            >
              Step into your forever salon
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};