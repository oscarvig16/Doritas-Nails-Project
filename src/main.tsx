import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import App from './App.tsx';
import { Pedicure } from './pages/Pedicure.tsx';
import { Manicure } from './pages/Manicure.tsx';
import { Book } from './pages/Book.tsx';
import { About } from './pages/About.tsx';
import { BookingSuccess } from './pages/BookingSuccess.tsx';
import { BookingCanceled } from './pages/BookingCanceled.tsx';
import { EmployeePanel } from './pages/EmployeePanel.tsx';
import { EmployeeLogin } from './pages/EmployeeLogin.tsx';
import { SetupPaymentMethod } from './pages/SetupPaymentMethod.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/pedicure" element={<Pedicure />} />
        <Route path="/manicure" element={<Manicure />} />
        <Route path="/book" element={<Book />} />
        <Route path="/about" element={<About />} />
        <Route path="/booking-success" element={<BookingSuccess />} />
        <Route path="/booking-canceled" element={<BookingCanceled />} />
        <Route path="/employee/panel" element={<EmployeePanel />} />
        <Route path="/employee/login" element={<EmployeeLogin />} />
        <Route path="/setup-payment-method" element={<SetupPaymentMethod />} />
      </Routes>
    </Router>
  </StrictMode>
);