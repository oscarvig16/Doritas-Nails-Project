import React from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { ManicureServices } from '../components/ManicureServices';

export const Manicure: React.FC = () => {
  return (
    <div className="font-raleway text-gray-800">
      <Navbar />
      <main className="pt-16">
        <ManicureServices />
      </main>
      <Footer />
    </div>
  );
};