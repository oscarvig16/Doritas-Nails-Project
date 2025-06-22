import React from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { BookingServices } from '../components/BookingServices';

export const Book: React.FC = () => {
  return (
    <div className="font-raleway text-gray-800">
      <Navbar />
      <main className="pt-16">
        <BookingServices />
      </main>
      <Footer />
    </div>
  );
};