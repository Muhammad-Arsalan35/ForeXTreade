import { useState, useEffect } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, AlertTriangle, CheckCircle, Clock, X } from "lucide-react";
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
  const [tillId, setTillId] = useState<string>("");
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [senderAccountNumber, setSenderAccountNumber] = useState<string>("");
  const [depositStatus, setDepositStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [countdown, setCountdown] = useState<number>(600); // 10 minutes
  const [depositData, setDepositData] = useState<DepositData | null>(null);
  const [step, setStep] = useState<'amount' | 'payment' | 'verification' | 'approval' | 'confirm'>('amount');
  const [loading, setLoading] = useState(false);
  const [showApprovalPopup, setShowApprovalPopup] = useState(false);
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
      // Fetch payment methods from the database
      const { data: methodsData, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      
      if (methodsData && methodsData.length > 0) {
        setPaymentMethods(methodsData);
      } else {
        // Fallback if no payment methods are found
        toast({
          title: "No Payment Methods",
          description: "No active payment methods are available at this time.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
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
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // TODO: UNCOMMENT BELOW FOR DATABASE STORAGE
      // const { data, error } = await supabase
      //   .from('deposits')
      //   .insert({
      //     amount: parseFloat(amount),
      //     payment_method: selectedPaymentMethod.name,
      //     account_number: selectedPaymentMethod.account_number,
      //     status: 'pending',
      //     user_id: 'temp-user-id', // Replace with actual user ID
      //     created_at: new Date().toISOString()
      //   })
      //   .select()
      //   .single();
      // 
      // if (error) throw error;
      
      setDepositData({
        amount: parseFloat(amount),
        payment_method: selectedPaymentMethod.name,
        account_number: selectedPaymentMethod.account_number,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
      });
      setStep('verification');
      setCountdown(600); // Reset countdown
      
      toast({
        title: "Success",
        description: "Deposit initiated successfully",
      });
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
             {depositStatus === 'approved' ? (
               <>
                 <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
                 <h2 className="text-2xl font-bold text-foreground mb-2">Deposit Approved!</h2>
                 <p className="text-muted-foreground mb-6">
                   Your deposit of PKR {amount} has been approved successfully. 
                   The amount has been added to your account.
                 </p>
                 <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                   <p className="text-green-800 text-sm">
                     <strong>Status:</strong> Approved ✅
                   </p>
                 </div>
               </>
             ) : (
               <>
                 <Clock className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
                 <h2 className="text-2xl font-bold text-foreground mb-2">Deposit Submitted</h2>
                 <p className="text-muted-foreground mb-6">
                   Your deposit of PKR {amount} has been submitted for verification. 
                   You will be notified once the payment is confirmed.
                 </p>
                 <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                   <p className="text-yellow-800 text-sm">
                     <strong>Status:</strong> Pending Approval ⏳
                   </p>
                 </div>
               </>
             )}
             <Button 
               onClick={() => {
                 setStep('amount');
                 setAmount('');
                 setTransactionId('');
                 setTillId('');
                 setPaymentProof(null);
                 setSenderAccountNumber('');
                 setSelectedPaymentMethod(null);
                 setDepositData(null);
                 setDepositStatus('pending');
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

   if (step === 'approval' && depositData) {
     return (
       <div className="min-h-screen bg-gradient-primary p-4 flex items-center justify-center">
         <Card className="w-full max-w-md shadow-elegant">
           <CardContent className="p-8 text-center">
             <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
               <Clock className="w-8 h-8 text-yellow-600" />
             </div>
             <h2 className="text-2xl font-bold text-foreground mb-2">Waiting for Approval</h2>
             <p className="text-muted-foreground mb-4">
               Your deposit of PKR {depositData.amount} has been submitted successfully.
             </p>
                           <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-yellow-800 text-sm">
                  <strong>Status:</strong> Pending Approval
                </p>
                <p className="text-yellow-700 text-xs mt-1">
                  Waiting for approval. Please contact your hiring manager.
                </p>
              </div>
                                          <div className="space-y-3 text-sm text-muted-foreground">
                 <p><strong>User ID:</strong> 3328409E</p>
                 <p><strong>Payment Method:</strong> {depositData.payment_method}</p>
                 <p><strong>Sender Account:</strong> {senderAccountNumber}</p>
                 <p><strong>Till ID:</strong> {tillId}</p>
                 <p><strong>Amount:</strong> PKR {depositData.amount}</p>
               </div>
               
               {/* Admin Account Number - Highlighted */}
               <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                 <h3 className="font-medium mb-2 text-blue-800">Admin Account Number</h3>
                 <div className="flex items-center justify-between">
                   <span className="font-bold text-blue-600 text-lg">{depositData.account_number}</span>
                   <Button
                     variant="ghost"
                     size="sm"
                     onClick={() => copyToClipboard(depositData.account_number)}
                     className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
                   >
                     <Copy className="h-3 w-3" />
                   </Button>
                 </div>
                 <p className="text-xs text-blue-600 mt-1">Send money to this number</p>
               </div>
             <div className="mt-6 space-y-3">
               <Button 
                 onClick={() => {
                   setDepositStatus('approved');
                   setStep('confirm');
                 }}
                 className="w-full bg-green-600 hover:bg-green-700"
               >
                 Simulate Admin Approval
               </Button>
               <Button 
                 onClick={() => {
                   setStep('amount');
                   setAmount('');
                   setTillId('');
                   setPaymentProof(null);
                   setSenderAccountNumber('');
                   setSelectedPaymentMethod(null);
                   setDepositData(null);
                   setDepositStatus('pending');
                 }}
                 variant="outline"
                 className="w-full"
               >
                 Make Another Deposit
               </Button>
             </div>
           </CardContent>
         </Card>
       </div>
     );
   }

   if (step === 'verification' && depositData) {
    return (
      <div className="min-h-screen bg-gradient-primary p-4">
        <div className="max-w-md mx-auto pt-8">
          <Card className="shadow-elegant">
            <CardHeader className="text-center pb-4">
              <h1 className="text-2xl font-bold text-foreground">Manual Verification</h1>
              <p className="text-muted-foreground">Provide payment details for verification</p>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Payment Method Display */}
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-medium mb-2">Payment Method</h3>
                <div className="flex items-center justify-between">
                  <span className="font-bold">{depositData.payment_method}</span>
                </div>
              </div>

                             {/* Admin Account Number Display */}
               <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                 <h3 className="font-medium mb-2 text-blue-800">Admin Account Number (Send Money Here)</h3>
                 <div className="flex items-center justify-between">
                   <span className="font-bold text-blue-600 text-lg">{depositData.account_number}</span>
                   <Button
                     variant="ghost"
                     size="sm"
                     onClick={() => copyToClipboard(depositData.account_number)}
                     className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
                   >
                     <Copy className="h-3 w-3" />
                   </Button>
                 </div>
                 <p className="text-xs text-blue-600 mt-1">Send money to this number</p>
               </div>

              {/* Amount Display */}
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-medium mb-2">Amount</h3>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-success">Rs. {depositData.amount}</span>
                  <span className="text-sm text-muted-foreground">PKR</span>
                </div>
              </div>

                                            {/* User ID Display */}
               <div className="p-4 bg-muted rounded-lg">
                 <h3 className="font-medium mb-2">User ID</h3>
                 <div className="flex items-center justify-between">
                   <span className="font-bold text-primary">3328409E</span>
                   <Button
                     variant="ghost"
                     size="sm"
                     onClick={() => copyToClipboard('3328409E')}
                     className="h-6 w-6 p-0"
                   >
                     <Copy className="h-3 w-3" />
                   </Button>
                 </div>
               </div>

               {/* Till ID Input */}
               <div className="space-y-2">
                 <Label htmlFor="tillId">Till ID</Label>
                 <Input
                   id="tillId"
                   type="text"
                   placeholder="Enter Till ID"
                   value={tillId}
                   onChange={(e) => setTillId(e.target.value)}
                 />
                 <p className="text-xs text-muted-foreground">
                   Enter the Till ID from your transaction
                 </p>
               </div>

               {/* Payment Proof Upload */}
               <div className="space-y-2">
                 <Label>Payment Proof Screenshot</Label>
                 <div 
                   className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
                   onClick={() => document.getElementById('proofUpload')?.click()}
                 >
                   <div className="text-4xl mb-2">📷</div>
                   <p className="text-sm text-muted-foreground">
                     Click to upload screenshot (JPEG, PNG, etc.)
                   </p>
                   {paymentProof && (
                     <p className="text-xs text-green-600 mt-2">
                       ✓ {paymentProof.name}
                     </p>
                   )}
                 </div>
                 <input
                   id="proofUpload"
                   type="file"
                   accept="image/*"
                   onChange={(e) => setPaymentProof(e.target.files?.[0] || null)}
                   className="hidden"
                 />
               </div>

               {/* Amount (Read-only) */}
               <div className="space-y-2">
                 <Label>Amount</Label>
                 <Input
                   value={depositData.amount}
                   readOnly
                   className="bg-muted"
                 />
               </div>

               {/* Payment Method (Read-only) */}
               <div className="space-y-2">
                 <Label>Payment Method</Label>
                 <Input
                   value={depositData.payment_method}
                   readOnly
                   className="bg-muted"
                 />
               </div>

               {/* Sender Account Number Input */}
               <div className="space-y-2">
                 <Label htmlFor="senderAccount">Account/Phone Number (From which you sent money)</Label>
                 <Input
                   id="senderAccount"
                   type="text"
                   placeholder="Enter your account/phone number"
                   value={senderAccountNumber}
                   onChange={(e) => setSenderAccountNumber(e.target.value)}
                 />
                 <p className="text-xs text-muted-foreground">
                   Enter the account or phone number from which you transferred the money
                 </p>
               </div>

               {/* Submit Button */}
               <Button 
                 onClick={async () => {
                   if (!tillId.trim() || !paymentProof || !senderAccountNumber.trim()) {
                     toast({
                       title: "Missing Information",
                       description: "Please fill Till ID, upload payment proof, and enter sender account number",
                       variant: "destructive"
                     });
                     return;
                   }
                   
                   setLoading(true);
                   try {
                     // TODO: UNCOMMENT BELOW FOR DATABASE STORAGE
                     // const { error } = await supabase
                     //   .from('deposits')
                     //   .update({
                     //     till_id: tillId,
                     //     sender_account_number: senderAccountNumber,
                     //     payment_proof_url: 'uploaded_file_url', // Upload file first
                     //     status: 'pending',
                     //     submitted_at: new Date().toISOString()
                     //   })
                     //   .eq('id', depositData.id);
                     // 
                     // if (error) throw error;
                     
                     // Simulate API call
                     await new Promise(resolve => setTimeout(resolve, 1000));
                     
                     setShowApprovalPopup(true);
                     toast({
                       title: "Submitted",
                       description: "Deposit submitted for approval",
                     });
                   } catch (error) {
                     toast({
                       title: "Error",
                       description: "Failed to submit deposit",
                       variant: "destructive"
                     });
                   } finally {
                     setLoading(false);
                   }
                 }}
                 disabled={!tillId.trim() || !paymentProof || !senderAccountNumber.trim() || loading}
                 className="w-full bg-blue-600 hover:bg-blue-700"
               >
                 {loading ? "Submitting..." : "Submit"}
                              </Button>
             </CardContent>
           </Card>
         </div>

         {/* Approval Popup */}
         {showApprovalPopup && (
           <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
             <Card className="w-full max-w-md shadow-elegant">
               <CardContent className="p-6 text-center">
                 <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                   <AlertTriangle className="w-8 h-8 text-orange-600" />
                 </div>
                 <h2 className="text-2xl font-bold text-foreground mb-2">Waiting for Approval</h2>
                 <p className="text-muted-foreground mb-4">
                   Your deposit of PKR {depositData?.amount} has been submitted successfully.
                 </p>
                 <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                   <p className="text-orange-800 text-sm">
                     <strong>Status:</strong> Pending Approval
                   </p>
                   <p className="text-orange-700 text-xs mt-1">
                     Please contact your hiring manager for faster approval
                   </p>
                 </div>
                 <div className="space-y-3 text-sm text-muted-foreground mb-6">
                   <p><strong>User ID:</strong> 3328409E</p>
                   <p><strong>Payment Method:</strong> {depositData?.payment_method}</p>
                   <p><strong>Sender Account:</strong> {senderAccountNumber}</p>
                   <p><strong>Till ID:</strong> {tillId}</p>
                   <p><strong>Amount:</strong> PKR {depositData?.amount}</p>
                 </div>
                 
                 {/* Admin Account Number - Highlighted */}
                 <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg mb-6">
                   <h3 className="font-medium mb-2 text-blue-800">Admin Account Number</h3>
                   <div className="flex items-center justify-between">
                     <span className="font-bold text-blue-600 text-lg">{depositData?.account_number}</span>
                     <Button
                       variant="ghost"
                       size="sm"
                       onClick={() => copyToClipboard(depositData?.account_number || '')}
                       className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
                     >
                       <Copy className="h-3 w-3" />
                     </Button>
                   </div>
                   <p className="text-xs text-blue-600 mt-1">Send money to this number</p>
                 </div>

                 <div className="space-y-3">
                   <Button 
                     onClick={() => {
                       setShowApprovalPopup(false);
                       setStep('approval');
                     }}
                     className="w-full bg-blue-600 hover:bg-blue-700"
                   >
                     Continue to Approval Screen
                   </Button>
                   <Button 
                     onClick={() => {
                       setShowApprovalPopup(false);
                       setStep('amount');
                       setAmount('');
                       setTillId('');
                       setPaymentProof(null);
                       setSenderAccountNumber('');
                       setSelectedPaymentMethod(null);
                       setDepositData(null);
                       setDepositStatus('pending');
                     }}
                     variant="outline"
                     className="w-full"
                   >
                     Make Another Deposit
                   </Button>
                 </div>
               </CardContent>
             </Card>
           </div>
         )}
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
    <div className="min-h-screen bg-gradient-primary p-3 md:p-4">
      <div className="max-w-md mx-auto pt-4 md:pt-8">
        <Card className="shadow-elegant">
          <CardHeader className="text-center pb-3 md:pb-4">
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Deposit Funds</h1>
            <p className="text-muted-foreground text-sm md:text-base">Add money to your account</p>
          </CardHeader>
          
          <CardContent className="space-y-4 md:space-y-6">
            {/* Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm md:text-base">Amount (PKR)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
                className="text-base md:text-lg font-medium"
              />
              {amount && parseFloat(amount) < 100 && (
                <p className="text-xs text-muted-foreground">
                  Minimum deposit amount is PKR 100
                </p>
              )}
            </div>

            {/* Payment Method Selection */}
            <div className="space-y-2">
              <Label className="text-sm md:text-base">Payment Method</Label>
              <Select onValueChange={(value) => {
                const method = paymentMethods.find(m => m.id === value);
                setSelectedPaymentMethod(method || null);
              }}>
                <SelectTrigger className="text-sm md:text-base">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id}>
                      <div className="flex items-center gap-2">
                        <span>{method.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPaymentMethod && (
              <div className="p-3 md:p-4 bg-muted rounded-lg">
                <h3 className="font-medium mb-2 text-sm md:text-base">Selected Payment Method</h3>
                <div className="flex items-center justify-between">
                  <span className="text-sm md:text-base">{selectedPaymentMethod.name}</span>
                </div>
              </div>
            )}

            <Button 
              onClick={initiateDeposit}
              disabled={!amount || parseFloat(amount) < 100 || !selectedPaymentMethod || loading}
              className="w-full text-sm md:text-base py-2 md:py-3"
            >
              {loading ? "Processing..." : "Process to Payment"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};