import React, { useState } from 'react';
import { CreditCard, Shield, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import ResponsiveModal from '../ui/responsive-modal';

interface CardPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: string;
  onConfirm: (cardDetails: CardDetails) => void;
}

interface CardDetails {
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardholderName: string;
}

const CardPaymentModal: React.FC<CardPaymentModalProps> = ({
  open,
  onOpenChange,
  amount,
  onConfirm
}) => {
  const [cardDetails, setCardDetails] = useState<CardDetails>({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: ''
  });

  const [errors, setErrors] = useState<Partial<CardDetails>>({});
  const [showCvv, setShowCvv] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Format card number with spaces (4-4-4-4)
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  // Format expiry date (MM/YY)
  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + (v.length > 2 ? '/' + v.substring(2, 4) : '');
    }
    return v;
  };

  // Get card type from number
  const getCardType = (number: string) => {
    const num = number.replace(/\s/g, '');
    if (/^4/.test(num)) return 'visa';
    if (/^5[1-5]/.test(num) || /^2[2-7]/.test(num)) return 'mastercard';
    if (/^3[47]/.test(num)) return 'amex';
    if (/^6/.test(num)) return 'discover';
    return 'unknown';
  };

  // Get card type icon
  const getCardTypeIcon = (type: string) => {
    switch (type) {
      case 'visa':
        return <div className="text-xs font-bold text-amber-700 bg-amber-100/60 px-2 py-1 rounded-lg backdrop-blur-sm">VISA</div>;
      case 'mastercard':
        return <div className="text-xs font-bold text-amber-700 bg-amber-100/60 px-2 py-1 rounded-lg backdrop-blur-sm">MC</div>;
      case 'amex':
        return <div className="text-xs font-bold text-amber-700 bg-amber-100/60 px-2 py-1 rounded-lg backdrop-blur-sm">AMEX</div>;
      case 'discover':
        return <div className="text-xs font-bold text-amber-700 bg-amber-100/60 px-2 py-1 rounded-lg backdrop-blur-sm">DISC</div>;
      default:
        return <CreditCard className="w-4 h-4 text-amber-600" />;
    }
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    if (formatted.replace(/\s/g, '').length <= 16) {
      setCardDetails(prev => ({ ...prev, cardNumber: formatted }));
      if (errors.cardNumber) {
        setErrors(prev => ({ ...prev, cardNumber: undefined }));
      }
    }
  };

  const handleExpiryDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatExpiryDate(e.target.value);
    if (formatted.length <= 5) {
      setCardDetails(prev => ({ ...prev, expiryDate: formatted }));
      if (errors.expiryDate) {
        setErrors(prev => ({ ...prev, expiryDate: undefined }));
      }
    }
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (value.length <= 4) {
      setCardDetails(prev => ({ ...prev, cvv: value }));
      if (errors.cvv) {
        setErrors(prev => ({ ...prev, cvv: undefined }));
      }
    }
  };

  const handleCardholderNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^a-zA-Z\s]/g, '').toUpperCase();
    if (value.length <= 26) {
      setCardDetails(prev => ({ ...prev, cardholderName: value }));
      if (errors.cardholderName) {
        setErrors(prev => ({ ...prev, cardholderName: undefined }));
      }
    }
  };

  const validateForm = () => {
    const newErrors: Partial<CardDetails> = {};

    // Card number validation
    const cardNum = cardDetails.cardNumber.replace(/\s/g, '');
    if (!cardNum) {
      newErrors.cardNumber = 'Card number is required';
    } else if (cardNum.length < 13 || cardNum.length > 16) {
      newErrors.cardNumber = 'Invalid card number';
    }

    // Expiry date validation
    if (!cardDetails.expiryDate) {
      newErrors.expiryDate = 'Expiry date is required';
    } else if (cardDetails.expiryDate.length !== 5) {
      newErrors.expiryDate = 'Invalid expiry date';
    } else {
      const [month, year] = cardDetails.expiryDate.split('/');
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear() % 100;
      const currentMonth = currentDate.getMonth() + 1;
      
      if (parseInt(month) < 1 || parseInt(month) > 12) {
        newErrors.expiryDate = 'Invalid month';
      } else if (parseInt(year) < currentYear || 
                 (parseInt(year) === currentYear && parseInt(month) < currentMonth)) {
        newErrors.expiryDate = 'Card has expired';
      }
    }

    // CVV validation
    if (!cardDetails.cvv) {
      newErrors.cvv = 'CVV is required';
    } else if (cardDetails.cvv.length < 3) {
      newErrors.cvv = 'Invalid CVV';
    }

    // Cardholder name validation
    if (!cardDetails.cardholderName.trim()) {
      newErrors.cardholderName = 'Cardholder name is required';
    } else if (cardDetails.cardholderName.trim().length < 2) {
      newErrors.cardholderName = 'Name too short';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setIsProcessing(true);
      try {
        await onConfirm(cardDetails);
        // Reset form
        setCardDetails({
          cardNumber: '',
          expiryDate: '',
          cvv: '',
          cardholderName: ''
        });
        setErrors({});
      } catch (error) {
        console.error('Payment processing error:', error);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset form when closing
    setCardDetails({
      cardNumber: '',
      expiryDate: '',
      cvv: '',
      cardholderName: ''
    });
    setErrors({});
  };

  const cardType = getCardType(cardDetails.cardNumber);

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={handleClose}
      title="Card Payment"
      description="Enter your card details securely"
      className="bg-gradient-to-br from-amber-50/80 to-orange-50/80 backdrop-blur-xl border border-amber-200/50 shadow-2xl"
    >
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-3 bg-gradient-to-br from-amber-100/60 to-orange-100/60 backdrop-blur-sm rounded-xl border border-amber-200/40 shadow-lg">
          <CreditCard className="w-6 h-6 text-amber-700" />
        </div>
        <div>
          <span className="text-xl font-semibold text-amber-900">Card Payment</span>
          <p className="text-sm text-amber-700/80 font-normal">Enter your card details securely</p>
        </div>
      </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Amount Display */}
          <div className="flex items-center justify-between p-5 bg-gradient-to-r from-amber-100/40 to-orange-100/40 backdrop-blur-sm rounded-2xl border border-amber-200/30 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-amber-500/80 to-orange-500/80 backdrop-blur-sm rounded-xl shadow-md">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-semibold text-amber-900">Amount to deposit:</span>
            </div>
            <span className="text-3xl font-bold text-amber-900 drop-shadow-sm">GH₵{amount}</span>
          </div>

          {/* Card Number */}
          <div>
            <label className="text-sm font-semibold text-amber-900 mb-3 block">
              Card Number
            </label>
            <div className="relative">
              <Input
                type="text"
                placeholder="1234 5678 9012 3456"
                value={cardDetails.cardNumber}
                onChange={handleCardNumberChange}
                className={`h-14 text-lg bg-white/60 backdrop-blur-sm border-2 pr-16 rounded-xl focus:border-amber-400 focus:ring-amber-400/50 focus:bg-white/80 transition-all duration-300 ${
                  errors.cardNumber ? 'border-red-400' : 'border-amber-200/50'
                }`}
                maxLength={19}
              />
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                {getCardTypeIcon(cardType)}
              </div>
            </div>
            {errors.cardNumber && (
              <div className="flex items-center mt-2 text-red-600">
                <AlertCircle className="w-4 h-4 mr-1" />
                <p className="text-sm">{errors.cardNumber}</p>
              </div>
            )}
          </div>

          {/* Expiry Date and CVV */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-amber-900 mb-3 block">
                Expiry Date
              </label>
              <Input
                type="text"
                placeholder="MM/YY"
                value={cardDetails.expiryDate}
                onChange={handleExpiryDateChange}
                className={`h-14 text-lg bg-white/60 backdrop-blur-sm border-2 rounded-xl focus:border-amber-400 focus:ring-amber-400/50 focus:bg-white/80 transition-all duration-300 ${
                  errors.expiryDate ? 'border-red-400' : 'border-amber-200/50'
                }`}
                maxLength={5}
              />
              {errors.expiryDate && (
                <div className="flex items-center mt-2 text-red-600">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  <p className="text-sm">{errors.expiryDate}</p>
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-semibold text-amber-900 mb-3 block">
                CVV
              </label>
              <div className="relative">
                <Input
                  type={showCvv ? "text" : "password"}
                  placeholder="123"
                  value={cardDetails.cvv}
                  onChange={handleCvvChange}
                  className={`h-14 text-lg bg-white/60 backdrop-blur-sm border-2 pr-12 rounded-xl focus:border-amber-400 focus:ring-amber-400/50 focus:bg-white/80 transition-all duration-300 ${
                    errors.cvv ? 'border-red-400' : 'border-amber-200/50'
                  }`}
                  maxLength={4}
                />
                <button
                  type="button"
                  onClick={() => setShowCvv(!showCvv)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-amber-600 hover:text-amber-800 transition-colors"
                >
                  {showCvv ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.cvv && (
                <div className="flex items-center mt-2 text-red-600">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  <p className="text-sm">{errors.cvv}</p>
                </div>
              )}
            </div>
          </div>

          {/* Cardholder Name */}
          <div>
            <label className="text-sm font-semibold text-amber-900 mb-3 block">
              Cardholder Name
            </label>
            <Input
              type="text"
              placeholder="JOHN DOE"
              value={cardDetails.cardholderName}
              onChange={handleCardholderNameChange}
              className={`h-14 text-lg bg-white/60 backdrop-blur-sm border-2 rounded-xl focus:border-amber-400 focus:ring-amber-400/50 focus:bg-white/80 transition-all duration-300 ${
                errors.cardholderName ? 'border-red-400' : 'border-amber-200/50'
              }`}
              maxLength={26}
            />
            {errors.cardholderName && (
              <div className="flex items-center mt-2 text-red-600">
                <AlertCircle className="w-4 h-4 mr-1" />
                <p className="text-sm">{errors.cardholderName}</p>
              </div>
            )}
          </div>

          {/* Security Notice */}
          <div className="flex items-start p-5 bg-gradient-to-r from-emerald-100/40 to-green-100/40 backdrop-blur-sm border border-emerald-200/30 rounded-2xl shadow-lg">
            <div className="p-2.5 bg-gradient-to-br from-emerald-500/80 to-green-500/80 backdrop-blur-sm rounded-xl shadow-md mr-4 flex-shrink-0">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div className="text-sm">
              <p className="font-semibold text-emerald-900 mb-1">Secure Payment</p>
              <p className="text-emerald-800/90">
                Your card details are encrypted and processed securely. We do not store your card information.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1 h-14 text-base font-semibold bg-white/40 backdrop-blur-sm border-2 border-amber-200/50 hover:border-amber-300/60 hover:bg-white/60 text-amber-900 rounded-xl transition-all duration-300 shadow-lg"
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 h-14 text-base font-semibold bg-gradient-to-r from-amber-500/90 to-orange-500/90 backdrop-blur-sm hover:from-amber-600/90 hover:to-orange-600/90 text-white shadow-xl rounded-xl transition-all duration-300 border border-amber-400/30"
              disabled={!amount || parseFloat(amount) <= 0 || isProcessing}
            >
              {isProcessing ? (
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>Pay GH₵{amount}</span>
                </div>
              )}
            </Button>
          </div>
        </form>
    </ResponsiveModal>
  );
};

export default CardPaymentModal;
