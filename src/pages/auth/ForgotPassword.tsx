import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Phone, Lock, Globe, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const ForgotPassword = () => {
  const [step, setStep] = useState<'phone' | 'otp' | 'newPassword' | 'success'>('phone');
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { toast } = useToast();

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      toast({
        title: "Error",
        description: "Please enter your phone number",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const phoneRaw = phone.trim().replace(/\s+/g, "");
      const phoneE164 = phoneRaw.startsWith("+") ? phoneRaw : `+${phoneRaw}`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(phoneE164, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "OTP Sent",
        description: "Password reset OTP has been sent to your phone",
      });
      setStep('otp');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send OTP. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      toast({
        title: "Error",
        description: "Please enter the OTP",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // In a real app, you would verify the OTP here
      // For now, we'll simulate OTP verification
      if (otp === "123456") { // Demo OTP
        setStep('newPassword');
        toast({
          title: "OTP Verified",
          description: "Please enter your new password",
        });
      } else {
        toast({
          title: "Invalid OTP",
          description: "Please enter the correct OTP",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to verify OTP. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive"
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // In a real app, you would update the password here
      // For now, we'll simulate password update
      setTimeout(() => {
        setStep('success');
        toast({
          title: "Password Reset Successful",
          description: "Your password has been updated successfully",
        });
      }, 1000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reset password. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-elegant">
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Password Reset Successful!</h2>
            <p className="text-muted-foreground mb-6">
              Your password has been updated successfully. You can now login with your new password.
            </p>
            <Button asChild className="w-full">
              <Link to="/login">Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-golden rounded-full mx-auto mb-4 flex items-center justify-center shadow-golden">
            <Globe className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-primary-foreground mb-2">TaskMaster</h1>
          <p className="text-primary-foreground/80">Reset Your Password</p>
        </div>

        <Card className="shadow-elegant border-primary/20">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <Button variant="ghost" size="sm" asChild className="p-0 h-auto">
                <Link to="/login">
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </Button>
              <CardTitle className="text-2xl">Forgot Password</CardTitle>
            </div>
            <p className="text-muted-foreground text-center">
              {step === 'phone' && "Enter your phone number to receive reset OTP"}
              {step === 'otp' && "Enter the OTP sent to your phone"}
              {step === 'newPassword' && "Enter your new password"}
            </p>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {step === 'phone' && (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="tel"
                      placeholder="Enter your phone number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Sending..." : "Send OTP"}
                </Button>
              </form>
            )}

            {step === 'otp' && (
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">OTP Code</label>
                  <Input
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    className="text-center text-lg font-mono"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Demo OTP: 123456
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Verifying..." : "Verify OTP"}
                </Button>
              </form>
            )}

            {step === 'newPassword' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Resetting..." : "Reset Password"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};


