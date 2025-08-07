import { useState, useEffect } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PaymentMethod {
  id: string;
  name: string;
  account_number: string;
  logo_url?: string;
  is_active: boolean;
}

interface DepositData {
  amount: number;
  payment_method: string;
  account_number: string;
  expires_at: string;
}

export const Deposit = () => {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [amount, setAmount] = useState<string>("");
  const [transactionId, setTransactionId] = useState<string>("");
  const [countdown, setCountdown] = useState<number>(600); // 10 minutes
  const [depositData, setDepositData] = useState<DepositData | null>(null);
  const [step, setStep] = useState<'amount' | 'payment' | 'confirm'>('amount');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Fetch payment methods on component mount
  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (depositData && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [depositData, countdown]);

  const fetchPaymentMethods = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('is_active', true);
      
      if (error) throw error;
      setPaymentMethods(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load payment methods",
        variant: "destructive"
      });
    }
  };

  const initiateDeposit = async () => {
    if (!amount || !selectedPaymentMethod) return;
    
    setLoading(true);
    try {
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
      
      const { data, error } = await supabase
        .from('deposits')
        .insert({
          amount: parseFloat(amount),
          payment_method: selectedPaymentMethod.name,
          account_number: selectedPaymentMethod.account_number,
          expires_at: expiresAt.toISOString(),
          user_id: 'temp-user-id' // Replace with actual user ID when auth is implemented
        })
        .select()
        .single();

      if (error) throw error;

      setDepositData({
        amount: parseFloat(amount),
        payment_method: selectedPaymentMethod.name,
        account_number: selectedPaymentMethod.account_number,
        expires_at: expiresAt.toISOString()
      });
      setStep('payment');
      setCountdown(600); // Reset countdown
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to initiate deposit",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const confirmDeposit = async () => {
    if (!transactionId || transactionId.length !== 11) {
      toast({
        title: "Invalid TID",
        description: "Please enter a valid 11-digit transaction ID",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // In a real app, you would update the deposit record with the transaction ID
      // and send it to a payment verification service
      
      toast({
        title: "Deposit Submitted",
        description: "Your deposit has been submitted for verification",
        variant: "default"
      });
      
      setStep('confirm');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to confirm deposit",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Account number copied to clipboard"
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (step === 'confirm') {
    return (
      <div className="min-h-screen bg-gradient-primary p-4 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-elegant">
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Deposit Submitted</h2>
            <p className="text-muted-foreground mb-6">
              Your deposit of PKR {amount} has been submitted for verification. 
              You will be notified once the payment is confirmed.
            </p>
            <Button 
              onClick={() => {
                setStep('amount');
                setAmount('');
                setTransactionId('');
                setSelectedPaymentMethod(null);
                setDepositData(null);
              }}
              className="w-full"
            >
              Make Another Deposit
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'payment' && depositData) {
    return (
      <div className="min-h-screen bg-gradient-primary p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pt-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">O</span>
            </div>
            <h1 className="text-xl font-bold text-primary-foreground">Onepay</h1>
          </div>
          <div className="text-primary-foreground/80 text-sm">
            Account error, click to switch&gt;&gt;
          </div>
        </div>

        <Card className="shadow-elegant mb-6">
          <CardContent className="p-6">
            {/* Warning */}
            <Alert className="mb-6 border-destructive/20 bg-destructive/5">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-sm">
                <span className="font-medium">Warning:</span> Please pay with the same wallet and fill in the correct TID to avoid failure.
                <br />
                <span className="text-xs text-muted-foreground mt-2 block">
                  برائے کرم اسی والیٹ سے ادائیگی کریں اور ناکامی سے بچنے کے لیے درست TID بھریں۔
                </span>
              </AlertDescription>
            </Alert>

            <p className="text-sm text-muted-foreground mb-6">
              Please make payment to the account number below.
              <br />
              <span className="text-xs">
                برائے کرم نیچے دیے گئے اکاؤنٹ نمبر پر ادائیگی کریں۔
              </span>
            </p>

            {/* Payment Details */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-success rounded flex items-center justify-center">
                    <span className="text-success-foreground text-xs font-bold">E</span>
                  </div>
                  <span className="font-medium">Wallet (ولیٹ)</span>
                </div>
                <span className="font-bold">{depositData.payment_method}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="font-medium">Account (اکاؤنٹ)</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-primary">{depositData.account_number}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(depositData.account_number)}
                    className="h-6 w-6 p-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="font-medium">Quantity (مقدار)</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-success">{depositData.amount.toLocaleString()}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(depositData.amount.toString())}
                    className="h-6 w-6 p-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Countdown (وقت ختم)</span>
                </div>
                <Badge variant={countdown < 120 ? "destructive" : "secondary"} className="font-mono">
                  {formatTime(countdown)}
                </Badge>
              </div>
            </div>

            {/* TID Input */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                  <span className="text-primary-foreground text-xs">📝</span>
                </div>
                <Label className="text-destructive font-medium">
                  Fill in the correct TID. (درست TID بھریں۔)
                </Label>
              </div>
              
              <Input
                placeholder="11-digit serial number (11 ہندسوں کا سیریل نمبر)"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value.replace(/\D/g, '').slice(0, 11))}
                className="font-mono"
                maxLength={11}
              />
              
              {transactionId && transactionId.length !== 11 && (
                <p className="text-xs text-destructive">
                  TID must be exactly 11 digits
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Confirm Button */}
        <Button 
          onClick={confirmDeposit}
          disabled={loading || transactionId.length !== 11 || countdown <= 0}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3"
        >
          {loading ? "Processing..." : "Confirm (تصدیق کریں)"}
        </Button>

        {countdown <= 0 && (
          <Alert className="mt-4 border-destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Payment session has expired. Please start a new deposit.
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-primary p-4">
      <div className="max-w-md mx-auto pt-8">
        <Card className="shadow-elegant">
          <CardHeader className="text-center pb-4">
            <h1 className="text-2xl font-bold text-foreground">Deposit Funds</h1>
            <p className="text-muted-foreground">Add money to your account</p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (PKR)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
                className="text-lg font-medium"
              />
              {amount && parseFloat(amount) < 100 && (
                <p className="text-xs text-muted-foreground">
                  Minimum deposit amount is PKR 100
                </p>
              )}
            </div>

            {/* Payment Method Selection */}
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select onValueChange={(value) => {
                const method = paymentMethods.find(m => m.id === value);
                setSelectedPaymentMethod(method || null);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id}>
                      <div className="flex items-center gap-2">
                        <span>{method.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {method.account_number}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPaymentMethod && (
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-medium mb-2">Selected Payment Method</h3>
                <div className="flex items-center justify-between">
                  <span>{selectedPaymentMethod.name}</span>
                  <span className="font-mono text-sm">{selectedPaymentMethod.account_number}</span>
                </div>
              </div>
            )}

            <Button 
              onClick={initiateDeposit}
              disabled={!amount || parseFloat(amount) < 100 || !selectedPaymentMethod || loading}
              className="w-full"
            >
              {loading ? "Initiating..." : "Proceed to Payment"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};