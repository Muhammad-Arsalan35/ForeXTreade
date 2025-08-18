import { useState, useEffect } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Wallet, AlertTriangle, CheckCircle, ArrowLeft, Search, Filter, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface WithdrawalMethod {
  id: string;
  name: string;
  icon: string;
  is_active: boolean;
  min_amount: number;
  max_amount: number;
  fee_percentage: number;
}

interface WithdrawalData {
  amount: number;
  method: string;
  phone_number: string;
  fee: number;
  net_amount: number;
}

export const Withdraw = () => {
  const [selectedMethod, setSelectedMethod] = useState<WithdrawalMethod | null>(null);
  const [amount, setAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [withdrawalData, setWithdrawalData] = useState<WithdrawalData | null>(null);
  const [step, setStep] = useState<'amount' | 'confirm' | 'success'>('amount');
  const [walletBalance, setWalletBalance] = useState(0);
  const [userPhone, setUserPhone] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  // Preset amounts like in reference image
  const presetAmounts = [30, 50, 100, 300, 500, 1000, 3000, 5000, 10000, 20000, 30000, 50000];

  useEffect(() => {
    fetchUserData();
    fetchWalletBalance();
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Get user's phone number from profile
        const { data: profile } = await supabase
          .from('users')
          .select('phone_number')
          .eq('auth_user_id', user.id)
          .single();
        
        if (profile?.phone_number) {
          setUserPhone(profile.phone_number);
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const fetchWalletBalance = async () => {
    try {
      // In a real app, fetch from database
      setWalletBalance(25000); // Demo balance
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
    }
  };

  const withdrawalMethods: WithdrawalMethod[] = [
    {
      id: "1",
      name: "Easypaisa",
      icon: "📱",
      is_active: true,
      min_amount: 30,
      max_amount: 500000,
      fee_percentage: 2.5
    },
    {
      id: "2", 
      name: "JazzCash",
      icon: "📱",
      is_active: true,
      min_amount: 30,
      max_amount: 500000,
      fee_percentage: 2.0
    }
  ];

  const calculateFee = (amount: number, feePercentage: number) => {
    return (amount * feePercentage) / 100;
  };

  const handleAmountSelect = (presetAmount: number) => {
    setAmount(presetAmount.toString());
  };

  const handleProceed = () => {
    if (!amount || !selectedMethod) return;
    
    const numAmount = parseFloat(amount);
    if (numAmount < selectedMethod.min_amount) {
      toast({
        title: "Amount Too Low",
        description: `Minimum withdrawal amount is PKR ${selectedMethod.min_amount}`,
        variant: "destructive"
      });
      return;
    }

    if (numAmount > selectedMethod.max_amount) {
      toast({
        title: "Amount Too High",
        description: `Maximum withdrawal amount is PKR ${selectedMethod.max_amount}`,
        variant: "destructive"
      });
      return;
    }

    if (numAmount > walletBalance) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough balance for this withdrawal",
        variant: "destructive"
      });
      return;
    }

    const fee = calculateFee(numAmount, selectedMethod.fee_percentage);
    const netAmount = numAmount - fee;

    setWithdrawalData({
      amount: numAmount,
      method: selectedMethod.name,
      phone_number: userPhone,
      fee,
      net_amount: netAmount
    });

    setStep('confirm');
  };

  const handleConfirmWithdrawal = async () => {
    if (!withdrawalData) return;

    setLoading(true);
    try {
      // In a real app, create withdrawal record in database
      setTimeout(() => {
        setStep('success');
        toast({
          title: "Withdrawal Submitted",
          description: "Your withdrawal request has been submitted successfully",
        });
      }, 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit withdrawal request",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-primary p-4 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-elegant">
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Withdrawal Submitted!</h2>
            <p className="text-muted-foreground mb-6">
              Your withdrawal request of PKR {withdrawalData?.amount.toLocaleString()} has been submitted. 
              You will receive PKR {withdrawalData?.net_amount.toLocaleString()} after fees.
            </p>
            <Button 
              onClick={() => {
                setStep('amount');
                setAmount('');
                setSelectedMethod(null);
                setWithdrawalData(null);
              }}
              className="w-full"
            >
              Make Another Withdrawal
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'confirm' && withdrawalData) {
    return (
      <div className="min-h-screen bg-gradient-primary p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 pt-4">
          <Button variant="ghost" size="sm" onClick={() => setStep('amount')} className="p-0 h-auto">
            <ArrowLeft className="w-5 h-5 text-primary-foreground" />
          </Button>
          <h1 className="text-xl font-bold text-primary-foreground">Confirm Withdrawal</h1>
        </div>

        <Card className="shadow-elegant mb-6">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Withdrawal Details</h3>
            
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="font-medium">Method</span>
                <span className="font-bold">{withdrawalData.method}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="font-medium">Phone Number</span>
                <span className="font-mono text-sm">{withdrawalData.phone_number}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="font-medium">Amount</span>
                <span className="font-bold text-primary">PKR {withdrawalData.amount.toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="font-medium">Fee ({selectedMethod?.fee_percentage}%)</span>
                <span className="font-bold text-destructive">PKR {withdrawalData.fee.toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg border border-primary/20">
                <span className="font-medium text-lg">Net Amount</span>
                <span className="font-bold text-lg text-success">PKR {withdrawalData.net_amount.toLocaleString()}</span>
              </div>
            </div>

            <Alert className="mb-6 border-warning/20 bg-warning/5">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertDescription className="text-sm">
                Please confirm that all details are correct. Withdrawal requests cannot be cancelled once submitted.
              </AlertDescription>
            </Alert>

            <Button 
              onClick={handleConfirmWithdrawal}
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3"
            >
              {loading ? "Processing..." : "Confirm Withdrawal"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-primary p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pt-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="p-0 h-auto">
          <ArrowLeft className="w-5 h-5 text-primary-foreground" />
        </Button>
        <h1 className="text-xl font-bold text-primary-foreground">Withdraw Funds</h1>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Row - Balance and Instructions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Available Balance */}
          <Card className="shadow-elegant">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Available Balance</h3>
                <Button variant="ghost" size="sm" className="p-0 h-auto">
                  <Wallet className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-3xl font-bold text-success">PKR {walletBalance.toLocaleString()}</p>
            </CardContent>
          </Card>

          {/* Withdrawal Instructions */}
          <Card className="shadow-elegant">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Withdrawal Instructions</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Make sure the account details are correct before submitting.</li>
                <li>• Withdrawals are processed within 24 hours during business days.</li>
                <li>• Minimum withdrawal amount is PKR 30.</li>
                <li>• For Easypaisa/JazzCash withdrawals, please ensure the wallet/account address is correct.</li>
                <li>• Withdrawal limits: Min 30, Max 500,000</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Middle Row - Payment Method and Amount */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Select Payment Method */}
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle>Select Payment Method</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {withdrawalMethods.map((method) => (
                  <Button
                    key={method.id}
                    variant={selectedMethod?.id === method.id ? "default" : "outline"}
                    className={`h-20 flex flex-col items-center justify-center gap-2 ${
                      selectedMethod?.id === method.id 
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-muted"
                    }`}
                    onClick={() => setSelectedMethod(method)}
                  >
                    <span className="text-2xl">{method.icon}</span>
                    <span className="text-sm font-medium">{method.name}</span>
                  </Button>
                ))}
              </div>

              {/* Saved Addresses Section */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Saved Addresses</h4>
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add New
                  </Button>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center text-muted-foreground">
                  <p>No addresses saved yet</p>
                  <Button variant="outline" size="sm" className="mt-2">
                    Add Address
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Withdraw Amount */}
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle>Withdraw Amount</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Preset Amount Buttons */}
              <div className="grid grid-cols-6 gap-2">
                {presetAmounts.map((presetAmount) => (
                  <Button
                    key={presetAmount}
                    variant={amount === presetAmount.toString() ? "default" : "outline"}
                    size="sm"
                    className="h-10 text-xs"
                    onClick={() => handleAmountSelect(presetAmount)}
                  >
                    {presetAmount >= 1000 ? `${presetAmount/1000}K` : presetAmount}
                  </Button>
                ))}
              </div>

              {/* Custom Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="amount">Enter withdrawal amount</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Rs Enter withdrawal amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="30"
                  max={walletBalance}
                  className="text-lg font-medium"
                />
              </div>

              {/* Withdraw Button */}
              <Button 
                onClick={handleProceed}
                disabled={!amount || !selectedMethod || parseFloat(amount) < 30 || parseFloat(amount) > walletBalance}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3"
              >
                Withdraw
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row - Withdrawal History */}
        <Card className="shadow-elegant">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Withdrawal History</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search..." className="pl-10 w-48" />
                </div>
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Type</th>
                    <th className="text-left py-3 px-4 font-medium">Amount</th>
                    <th className="text-left py-3 px-4 font-medium">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={3} className="text-center py-8 text-muted-foreground">
                      No transaction history found!
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

