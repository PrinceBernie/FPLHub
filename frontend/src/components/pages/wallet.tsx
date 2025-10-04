import React, { useState, useEffect } from 'react';
import { Plus, Minus, History, CreditCard, Smartphone, AlertCircle, Wallet as WalletIcon, Gift } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { NoTransactionsState } from '../ui/empty-states';
import CardPaymentModal from '../modals/card-payment-modal';
import WithdrawalOtpModal from '../modals/withdrawal-otp-modal';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient, Wallet, Transaction } from '../../services/api';
import { toast } from 'sonner';

const Wallet: React.FC = () => {
  const { user } = useAuth();
  const [selectedWallet, setSelectedWallet] = useState<'main' | 'bonus'>('main');
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'mobile_money' | 'card'>('mobile_money');
  const [showCardModal, setShowCardModal] = useState(false);
  const [showWithdrawalOtpModal, setShowWithdrawalOtpModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Real wallet data from API
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Fetch wallet + transactions (uses cache for instant UI)
  useEffect(() => {
    const fetchWalletData = async () => {
      try {
        setIsLoading(true);
        const [walletRes, txRes] = await Promise.allSettled([
          apiClient.getWallet(),
          apiClient.getTransactions(),
        ]);
        if (walletRes.status === 'fulfilled') {
          setWallet(walletRes.value);
        }
        if (txRes.status === 'fulfilled') {
          setTransactions(txRes.value);
        }
      } catch (error: any) {
        console.error('Failed to fetch wallet data:', error);
        toast.error('Failed to load wallet data');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchWalletData();
    }
  }, [user]);

  // Calculate balances
  const mainWalletBalance = wallet?.balance || 0;
  const bonusWalletBalance = 0; // Bonus wallet not implemented in current backend
  const pendingAmount = transactions
    .filter(t => t.status === 'pending')
    .reduce((sum, t) => sum + t.amount, 0);

  const formatCurrency = (amount: number) => {
    return `GH₵${(amount / 100).toFixed(2)}`;
  };

  // Mask phone number for display
  const maskPhoneNumber = (phone: string) => {
    if (phone.length >= 10) {
      return phone.slice(0, 3) + '****' + phone.slice(-3);
    }
    return phone;
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'completed':
        return 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success/10 text-success border border-success/20';
      case 'pending':
        return 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-warning/10 text-warning border border-warning/20';
      case 'failed':
        return 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20';
      default:
        return 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium';
    }
  };

  const handleTransaction = () => {
    if (!amount || parseFloat(amount) <= 0) return;
    
    if (activeTab === 'deposit' && selectedPaymentMethod === 'card') {
      setShowCardModal(true);
      return;
    }
    
    if (activeTab === 'withdraw') {
      setShowWithdrawalOtpModal(true);
      return;
    }
    
    // Handle mobile money deposit
    handleMobileMoneyDeposit();
  };

  const handleMobileMoneyDeposit = async () => {
    try {
      const numericAmount = Math.max(0, parseFloat(amount || '0'));
      await apiClient.deposit({
        amount: Math.round(numericAmount * 100),
        method: 'momo',
        phoneNumber: user?.phone || ''
      });
      toast.success('Deposit request submitted successfully!');
      setAmount('');
      // Refresh wallet data
      const [walletData, txData] = await Promise.all([
        apiClient.getWallet(),
        apiClient.getTransactions(),
      ]);
      setWallet(walletData);
      setTransactions(txData);
    } catch (error: any) {
      toast.error(error.message || 'Failed to process deposit');
    }
  };

  const handleCardPayment = async (cardDetails: any) => {
    try {
      const numericAmount = Math.max(0, parseFloat(amount || '0'));
      await apiClient.deposit({
        amount: Math.round(numericAmount * 100),
        method: 'card',
        cardNumber: cardDetails.cardNumber,
        cardExpiry: cardDetails.expiryDate,
        cardCvv: cardDetails.cvv,
        cardName: cardDetails.cardholderName
      });
      toast.success('Card payment processed successfully!');
      setAmount('');
      setShowCardModal(false);
      // Refresh wallet data
      const [walletData, txData] = await Promise.all([
        apiClient.getWallet(),
        apiClient.getTransactions(),
      ]);
      setWallet(walletData);
      setTransactions(txData);
    } catch (error: any) {
      toast.error(error.message || 'Failed to process card payment');
    }
  };

  const handleWithdrawalOtp = async (pin: string) => {
    try {
      const numericAmount = Math.max(0, parseFloat(amount || '0'));
      await apiClient.withdraw({
        amount: Math.round(numericAmount * 100),
        method: 'momo',
        phoneNumber: user?.phone || ''
      });
      toast.success('Withdrawal request submitted successfully!');
      setAmount('');
      setShowWithdrawalOtpModal(false);
      // Refresh wallet data
      const [walletData, txData] = await Promise.all([
        apiClient.getWallet(),
        apiClient.getTransactions(),
      ]);
      setWallet(walletData);
      setTransactions(txData);
    } catch (error: any) {
      toast.error(error.message || 'Failed to process withdrawal');
    }
  };

  const currentBalance = selectedWallet === 'main' ? mainWalletBalance : bonusWalletBalance;

  return (
    <div className="container-clean py-3 px-3 max-w-6xl">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl sm:text-2xl font-bold mb-1">Wallet</h1>
        <p className="text-sm text-muted-foreground">Manage your deposits, withdrawals, and transaction history.</p>
      </div>

      {/* Wallet Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {/* Main Wallet Card */}
        <div 
          onClick={() => setSelectedWallet('main')}
          className={`clean-card cursor-pointer transition-all ${
            selectedWallet === 'main' 
              ? 'border-primary/50 bg-primary/5 ring-2 ring-primary/20' 
              : 'hover:border-primary/20'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/20 rounded-md">
                <WalletIcon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Main Wallet</h3>
                <p className="text-xs text-muted-foreground">Available for withdrawals</p>
              </div>
            </div>
            {selectedWallet === 'main' && (
              <div className="w-2 h-2 bg-primary rounded-full"></div>
            )}
          </div>
          <div className="text-xl sm:text-2xl font-bold text-primary">
            {formatCurrency(mainWalletBalance)}
          </div>
        </div>

        {/* Bonus Wallet Card */}
        <div 
          onClick={() => setSelectedWallet('bonus')}
          className={`clean-card cursor-pointer transition-all ${
            selectedWallet === 'bonus' 
              ? 'border-warning/50 bg-warning/5 ring-2 ring-warning/20' 
              : 'hover:border-warning/20'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-warning/20 rounded-md">
                <Gift className="w-4 h-4 text-warning" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Bonus Wallet</h3>
                <p className="text-xs text-muted-foreground">From rewards & promotions</p>
              </div>
            </div>
            {selectedWallet === 'bonus' && (
              <div className="w-2 h-2 bg-warning rounded-full"></div>
            )}
          </div>
          <div className="text-xl sm:text-2xl font-bold text-warning">
            {formatCurrency(bonusWalletBalance)}
          </div>
        </div>
      </div>

      {/* Pending Transactions Card */}
      {pendingAmount > 0 && (
        <div className="clean-card-sm mb-4 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <History className="w-4 h-4 text-warning" />
              <span className="text-sm font-medium">Pending Transactions</span>
            </div>
            <span className="text-base sm:text-lg font-bold text-warning">{formatCurrency(pendingAmount)}</span>
          </div>
        </div>
      )}

      {/* Transaction Form */}
      <div className="clean-card mb-4">
        <div className="mb-4">
          <h3 className="font-medium mb-1 text-sm">
            {selectedWallet === 'main' ? 'Main Wallet' : 'Bonus Wallet'} - {formatCurrency(currentBalance)}
          </h3>
          <p className="text-xs text-muted-foreground">
            {selectedWallet === 'main' 
              ? 'Deposit or withdraw from your main wallet'
              : 'Bonus wallet funds can only be used for league entries'
            }
          </p>
        </div>

        {/* Action Toggle */}
        <div className="flex space-x-1 mb-4 bg-accent/50 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('deposit')}
            className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'deposit' 
                ? 'bg-success text-success-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Plus className="w-3 h-3 inline mr-1" />
            Deposit
          </button>
          <button
            onClick={() => setActiveTab('withdraw')}
            disabled={selectedWallet === 'bonus'}
            className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'withdraw' 
                ? 'bg-destructive text-destructive-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            } ${selectedWallet === 'bonus' ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Minus className="w-3 h-3 inline mr-1" />
            Withdraw
          </button>
        </div>

        {selectedWallet === 'bonus' && activeTab === 'withdraw' && (
          <div className="flex items-start p-3 bg-muted/10 border border-border rounded-md mb-4">
            <AlertCircle className="w-4 h-4 text-muted-foreground mr-2 mt-0.5 flex-shrink-0" />
            <div className="text-xs">
              <p className="font-medium text-muted-foreground">Bonus Wallet Notice</p>
              <p className="text-xs text-muted-foreground mt-1">
                Bonus wallet funds cannot be withdrawn. They can only be used for league entries and will be converted to main wallet funds upon winning.
              </p>
            </div>
          </div>
        )}

        {selectedWallet === 'main' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium mb-2 block">
                Amount (GHS)
              </label>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input-clean"
                min="0"
                step="0.01"
              />
            </div>

            {/* Payment Method Selection - Only for deposits */}
            {activeTab === 'deposit' && (
              <div>
                <label className="text-xs font-medium mb-3 block">
                  Payment Method
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Mobile Money Option */}
                  <div 
                    onClick={() => setSelectedPaymentMethod('mobile_money')}
                    className={`flex items-center p-3 rounded-md cursor-pointer transition-all ${
                      selectedPaymentMethod === 'mobile_money'
                        ? 'bg-primary/10 border-2 border-primary/30 ring-2 ring-primary/20'
                        : 'bg-muted/10 border border-border hover:border-primary/20'
                    }`}
                  >
                    <Smartphone className="w-4 h-4 text-primary mr-3" />
                    <div className="flex-1">
                      <p className="text-xs font-medium">Mobile Money</p>
                      <p className="text-xs text-muted-foreground">
                        {maskPhoneNumber(user?.phone || '')}
                      </p>
                    </div>
                    {selectedPaymentMethod === 'mobile_money' && (
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                    )}
                  </div>

                  {/* Card Payment Option */}
                  <div 
                    onClick={() => setSelectedPaymentMethod('card')}
                    className={`flex items-center p-3 rounded-md cursor-pointer transition-all ${
                      selectedPaymentMethod === 'card'
                        ? 'bg-primary/10 border-2 border-primary/30 ring-2 ring-primary/20'
                        : 'bg-muted/10 border border-border hover:border-primary/20'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-primary mr-3" />
                    <div className="flex-1">
                      <p className="text-xs font-medium">Visa / Mastercard</p>
                      <p className="text-xs text-muted-foreground">
                        Credit or debit card
                      </p>
                    </div>
                    {selectedPaymentMethod === 'card' && (
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Mobile Money for Withdrawals */}
            {activeTab === 'withdraw' && (
              <div className="flex items-center p-3 bg-muted/10 rounded-md">
                <Smartphone className="w-4 h-4 text-primary mr-3" />
                <div className="flex-1">
                  <p className="text-xs font-medium">Mobile Money</p>
                  <p className="text-xs text-muted-foreground">
                    Withdraw to {maskPhoneNumber(user?.phone || '')}
                  </p>
                </div>
              </div>
            )}

            <Button 
              onClick={handleTransaction}
              disabled={!amount || parseFloat(amount) <= 0}
              className={`w-full h-8 text-xs ${
                activeTab === 'deposit' 
                  ? 'bg-success text-success-foreground hover:bg-success/90'
                  : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
              }`}
            >
              {activeTab === 'deposit' 
                ? `Deposit GH₵${amount || '0.00'}${selectedPaymentMethod === 'card' ? ' with Card' : ' via Mobile Money'}`
                : 'Request Withdrawal'}
            </Button>
          </div>
        )}
      </div>

      {/* Card Payment Modal */}
      <CardPaymentModal
        open={showCardModal}
        onOpenChange={setShowCardModal}
        amount={amount}
        onConfirm={handleCardPayment}
      />

      {/* Withdrawal OTP Modal */}
      <WithdrawalOtpModal
        open={showWithdrawalOtpModal}
        onOpenChange={setShowWithdrawalOtpModal}
        amount={amount}
        phoneNumber={user?.phone || ''}
        onConfirm={handleWithdrawalOtp}
      />

      {/* Transaction History */}
      <div className="clean-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium">Transaction History</h3>
          <History className="w-4 h-4 text-muted-foreground" />
        </div>

        <div className="space-y-2">
          {isLoading ? (
            <div className="text-center py-6">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading transactions...</p>
            </div>
          ) : (
            transactions.map((transaction) => (
              <div 
                key={transaction.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-border rounded-md space-y-2 sm:space-y-0"
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${
                    transaction.type === 'deposit' 
                      ? 'bg-success/20 text-success' 
                      : transaction.type === 'league_winnings'
                      ? 'bg-warning/20 text-warning'
                      : 'bg-destructive/20 text-destructive'
                  }`}>
                    {transaction.type === 'deposit' ? (
                      <Plus className="w-3 h-3" />
                    ) : transaction.type === 'league_winnings' ? (
                      <Gift className="w-3 h-3" />
                    ) : (
                      <Minus className="w-3 h-3" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-xs capitalize">
                        {transaction.type === 'league_winnings' ? 'League Winnings' : transaction.type}
                      </p>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                        main
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {transaction.description || 'Transaction'}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="font-medium text-xs">
                    {transaction.type === 'withdrawal' ? '-' : '+'}
                    {formatCurrency(transaction.amount)}
                  </p>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 space-y-1 sm:space-y-0">
                    <span className={getStatusClass(transaction.status)}>
                      {transaction.status}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {!isLoading && transactions.length === 0 && (
          <NoTransactionsState />
        )}
      </div>
    </div>
  );
};

export default Wallet;