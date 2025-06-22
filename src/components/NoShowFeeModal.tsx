import React, { useState } from 'react';
import { AlertTriangle, X, DollarSign } from 'lucide-react';
import { chargeNoShowFee } from '../api/payments';

interface NoShowFeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  employeeId: string;
  customerName: string;
  appointmentDate: string;
  appointmentTime: string;
  onSuccess: () => void;
}

export const NoShowFeeModal: React.FC<NoShowFeeModalProps> = ({
  isOpen,
  onClose,
  bookingId,
  employeeId,
  customerName,
  appointmentDate,
  appointmentTime,
  onSuccess
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [isConfirmStep, setIsConfirmStep] = useState(false);
  const [chargeResult, setChargeResult] = useState<{
    success: boolean;
    amount?: number;
    paymentStatus?: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleCharge = async () => {
    if (!isConfirmStep) {
      setIsConfirmStep(true);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('💰 [NO-SHOW FEE] Charging no-show fee for booking:', bookingId);
      
      const result = await chargeNoShowFee({
        bookingId,
        employeeId,
        notes: notes.trim() || undefined
      });

      console.log('💰 [NO-SHOW FEE] Charge result:', result);

      if (result.success) {
        setChargeResult({
          success: true,
          amount: result.amount,
          paymentStatus: result.paymentStatus
        });
        // Wait a moment before closing to show success message
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      } else {
        setError(result.error || 'Failed to charge no-show fee');
        setIsConfirmStep(false);
      }
    } catch (err) {
      console.error('Error charging no-show fee:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setIsConfirmStep(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (isConfirmStep) {
      setIsConfirmStep(false);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          disabled={isLoading}
        >
          <X className="w-5 h-5" />
        </button>

        {chargeResult ? (
          // Success state
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Payment Successful</h3>
            <p className="text-gray-600 mb-4">
              No-show fee of ${chargeResult.amount?.toFixed(2)} has been charged successfully.
            </p>
          </div>
        ) : isConfirmStep ? (
          // Confirmation step
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
              <h3 className="text-xl font-semibold">Confirm No-Show Charge</h3>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg mb-6">
              <p className="text-yellow-800 font-medium">You are about to charge a $40.00 no-show fee to:</p>
              <p className="mt-2 text-gray-700">{customerName}</p>
              <p className="text-sm text-gray-600">
                Appointment: {appointmentDate} at {appointmentTime}
              </p>
            </div>
            
            <p className="text-gray-600 mb-6">
              This action cannot be undone. The customer will be charged immediately.
            </p>

            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                disabled={isLoading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={handleCharge}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <DollarSign className="w-4 h-4" />
                    <span>Confirm Charge</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          // Initial step
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
              <h3 className="text-xl font-semibold">Charge No-Show Fee</h3>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-2">
                You are about to charge a <span className="font-semibold">$40.00 no-show fee</span> to:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-medium">{customerName}</p>
                <p className="text-sm text-gray-600">
                  Appointment: {appointmentDate} at {appointmentTime}
                </p>
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                rows={3}
                placeholder="Add any notes about this no-show charge..."
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                disabled={isLoading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCharge}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <DollarSign className="w-4 h-4" />
                    <span>Charge No-Show Fee</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};