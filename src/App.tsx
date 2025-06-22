import React from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Gallery } from './components/Gallery';
import { Testimonials } from './components/Testimonials';
import { Services } from './components/Services';
import { About3 } from './components/About3';
import { Location } from './components/Location';
import { Community } from './components/Community';
import { Footer } from './components/Footer';

function App() {
  return (
    <div className="font-raleway text-gray-800">
      <Navbar />
      <main>
        <Hero />
        <Gallery />
        <Testimonials />
        <Services />
        <About3 />
        <Location />
        <Community />
      </main>
      <Footer />
    </div>
  );
}

export default App;