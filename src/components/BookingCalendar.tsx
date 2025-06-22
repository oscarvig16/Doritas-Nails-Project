import React, { useState } from 'react';
import { addDays, isSameDay, isToday, startOfDay } from 'date-fns';
import { Calendar, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatInTimezone, convertToTimezone } from '../lib/timezone';

interface TimeSlot {
  time: string;
  available: boolean;
}

interface BookingCalendarProps {
  onDateTimeSelect: (date: Date, time: string) => void;
  selectedDate: Date | null;
  selectedTime: string | null;
}

export const BookingCalendar: React.FC<BookingCalendarProps> = ({
  onDateTimeSelect,
  selectedDate,
  selectedTime
}) => {
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfDay(new Date()));
  
  // Generate next 14 available days in PST/PDT timezone
  const availableDays = Array.from({ length: 14 }, (_, i) => {
    const date = addDays(currentWeekStart, i);
    return convertToTimezone(date);
  });

  // Generate time slots from 8:00 AM to 4:00 PM in 15-minute intervals
  const timeSlots: TimeSlot[] = [];
  for (let hour = 8; hour <= 16; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      // Skip 4:15 PM and later
      if (hour === 16 && minute > 0) continue;
      
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour;
      const displayMinute = minute.toString().padStart(2, '0');
      timeSlots.push({
        time: `${displayHour}:${displayMinute} ${period}`,
        available: true
      });
    }
  }

  const handleDateSelect = (date: Date) => {
    onDateTimeSelect(date, selectedTime || '');
  };

  const handleTimeSelect = (time: string) => {
    if (selectedDate) {
      onDateTimeSelect(selectedDate, time);
    }
  };

  const handlePreviousWeek = () => {
    setCurrentWeekStart(prev => addDays(prev, -7));
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(prev => addDays(prev, 7));
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-primary" />
          <h3 className="text-xl font-playfair font-semibold">Select Date & Time</h3>
          <span className="text-sm text-gray-500">(Pacific Time)</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePreviousWeek}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            disabled={isSameDay(currentWeekStart, startOfDay(new Date()))}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNextWeek}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Date Selection */}
      <div className="grid grid-cols-7 gap-2 mb-6">
        {availableDays.slice(0, 7).map((date) => (
          <button
            key={date.toString()}
            onClick={() => handleDateSelect(date)}
            className={`
              p-3 rounded-lg text-center transition-all
              ${isSameDay(date, selectedDate || new Date())
                ? 'bg-primary text-white'
                : 'hover:bg-gray-50'
              }
              ${isToday(date) ? 'ring-2 ring-primary ring-offset-2' : ''}
            `}
          >
            <div className="text-xs mb-1">{formatInTimezone(date, 'EEE')}</div>
            <div className="font-semibold">{formatInTimezone(date, 'd')}</div>
          </button>
        ))}
      </div>

      {/* Time Selection */}
      {selectedDate && (
        <div>
          <div className="flex items-center gap-2 mb-4 text-gray-600">
            <Clock className="w-4 h-4" />
            <span>Available Times (Pacific Time)</span>
          </div>
          <div className="grid grid-cols-4 gap-2 max-h-[320px] overflow-y-auto pr-2">
            {timeSlots.map((slot) => (
              <button
                key={slot.time}
                onClick={() => handleTimeSelect(slot.time)}
                disabled={!slot.available}
                className={`
                  p-2 rounded-lg text-center transition-all text-sm
                  ${slot.time === selectedTime
                    ? 'bg-primary text-white'
                    : slot.available
                    ? 'hover:bg-gray-50'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }
                `}
              >
                {slot.time}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};