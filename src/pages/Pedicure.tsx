import React from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { PedicureServices } from '../components/PedicureServices';

export const Pedicure: React.FC = () => {
  return (
    <div className="font-raleway text-gray-800">
      <Navbar />
      <main className="pt-16">
        <PedicureServices />
      </main>
      <Footer />
    </div>
  );
};