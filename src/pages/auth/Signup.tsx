
import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams, useParams } from "react-router-dom";
import { Eye, EyeOff, User, Lock, Globe, Users, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { supabaseService } from "@/integrations/supabase/serviceClient";

export const Signup = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    username: "",
    password: "",
    confirmPassword: "",
    referralCode: "",
    agreeTerms: false
  });
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { referralCode: urlReferralCode } = useParams();

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      return `+92${cleaned.substring(1)}`;
    }
    if (cleaned.startsWith('92')) {
      return `+${cleaned}`;
    }
    if (cleaned.length === 11) {
      return `+92${cleaned.substring(1)}`;
    }
    if (phone.startsWith('+')) {
      return phone;
    }
    return `+92${cleaned}`;
  };

  // Auto-fill referral code from URL
  useEffect(() => {
    const refCode = searchParams.get('ref') || urlReferralCode;
    if (refCode && refCode.length > 0) {
      console.log('Referral code detected:', refCode);
      setFormData(prev => ({
        ...prev,
        referralCode: refCode
      }));
      toast({
        title: "Referral Code Applied!",
        description: `Welcome! Using referral code: ${refCode}`,
      });
    }
  }, [searchParams, urlReferralCode, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive"
      });
      return;
    }

    if (!formData.agreeTerms) {
      toast({
        title: "Error", 
        description: "Please accept the terms and conditions",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const formattedPhone = formatPhoneNumber(formData.phone);
      
      console.log('Attempting signup with:', { 
        phone: formData.phone, 
        formattedPhone: formattedPhone,
        fullName: formData.fullName,
        username: formData.username,
        referralCode: formData.referralCode
      });
      
      // Phone-to-email authentication (no SMS required)
      const emailFormat = `${formData.phone.replace(/\D/g, '')}@forextrade.com`;
      
      console.log('Creating account with phone-based email:', emailFormat);
      
      const { data, error } = await supabase.auth.signUp({
        email: emailFormat,
        password: formData.password,
        options: {
          emailRedirectTo: undefined, // Skip email confirmation
          data: {
            phone: formattedPhone, // Store actual phone in metadata
            display_name: formData.fullName,
            email_confirmed: true // Mark as confirmed
          }
        }
      });
      
      // If signup successful, immediately sign in to bypass email confirmation
      if (data.user && !error) {
        console.log('Signup successful, signing in automatically...');
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: emailFormat,
          password: formData.password
        });
        
        if (signInError) {
          console.error('Auto sign-in failed:', signInError);
          throw signInError;
        }
      }

      if (error) {
        console.error('Signup error:', error);
        let errorMessage = "Signup failed. Please try again.";
        
        if (error.message.includes('User already registered')) {
          errorMessage = "An account with this phone number already exists. Please login instead.";
        } else if (error.message.includes('Email signups are disabled')) {
          errorMessage = "Phone authentication is currently disabled. Please contact support.";
        } else if (error.message.includes('Database error')) {
          errorMessage = "Account created but profile setup failed. Please contact support.";
        }
        
        toast({
          title: "Signup Failed",
          description: errorMessage,
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      if (data.user) {
        try {
          // Generate a referral code function
          const generateReferralCode = () => {
            return Math.floor(100000 + Math.random() * 900000).toString();
          };

          // Create user profile in the database using service client to bypass RLS
          const { error: profileError } = await supabaseService
            .from('users')
            .insert({
              auth_user_id: data.user.id,
              full_name: formData.fullName,
              username: formData.username,
              phone_number: formattedPhone,
              vip_level: 'VIP1',
              user_status: 'active',
              referral_code: generateReferralCode(),
              personal_wallet_balance: 0.00,
              income_wallet_balance: 0.00,
              total_earnings: 0.00,
              total_invested: 0.00,
              position_title: 'Member',
              referred_by: formData.referralCode || null
            });

          if (profileError) {
            console.error('Profile creation error:', profileError);
            toast({
              title: "Profile Creation Failed",
              description: "Account created but profile setup failed. Please contact support.",
              variant: "destructive"
            });
            setLoading(false);
            return;
          }

          // Handle referral logic if referral code is provided
          if (formData.referralCode && formData.referralCode.trim() !== '') {
            try {
              // Find the referrer
              const { data: referrerData, error: referrerError } = await supabase
                .from('users')
                .select('id')
                .eq('referral_code', formData.referralCode)
                .single();

              if (!referrerError && referrerData) {
                // Get the newly created user's ID from the users table
                const { data: newUserData, error: newUserError } = await supabase
                  .from('users')
                  .select('id')
                  .eq('auth_user_id', data.user.id)
                  .single();

                if (!newUserError && newUserData) {
                  // Add to referrals table
                  await supabase
                    .from('referrals')
                    .insert({
                      referrer_id: referrerData.id,
                      referred_id: newUserData.id,
                      level: 'A', // Direct referral
                      commission_rate: 0.1, // 10% commission rate for direct referrals
                      referral_code_used: formData.referralCode,
                      registration_completed: true,
                      status: 'active'
                    });

                  // Add to team structure
                  await supabase
                    .from('team_structure')
                    .insert({
                      user_id: newUserData.id,
                      parent_id: referrerData.id
                    });
                }
              }
            } catch (dbError) {
              console.error('Database error:', dbError);
            }
          }

          // Store user data in localStorage for immediate access
          localStorage.setItem('userData', JSON.stringify({
            id: data.user.id,
            phone: formattedPhone,
            fullName: formData.fullName,
            email: emailFormat
          }));

          toast({
            title: "Account created successfully!",
            description: "Welcome to ForeX Trade! Redirecting to dashboard...",
          });

          // Navigate to dashboard immediately since we're now signed in
          navigate('/dashboard');
          
        } catch (error) {
          console.error('Unexpected error:', error);
          toast({
            title: "Signup Failed",
            description: "An unexpected error occurred. Please try again.",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error('Signup error:', error);
      toast({
        title: "Signup Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-golden rounded-full mx-auto mb-4 flex items-center justify-center shadow-golden">
            <Globe className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-primary-foreground mb-2">Join FXTrade</h1>
          <p className="text-primary-foreground/80">EARN WITH TASK - Start earning today</p>
        </div>

        <Card className="shadow-elegant border-primary/20">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Create Account</CardTitle>
            <p className="text-muted-foreground text-center">
              Fill in your details to get started
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {/* Phone Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="tel"
                    placeholder="03XXXXXXXXX"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="pl-10"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter your phone number (e.g., 03001234567)
                </p>
              </div>

              {/* Username Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Choose a username"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {/* Referral Code Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Referral Code (Optional)</label>
                <div className="relative">
                  <Users className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Enter referral code"
                    value={formData.referralCode}
                    onChange={(e) => setFormData({...formData, referralCode: e.target.value})}
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Have a referral code? Enter it to get bonus rewards!
                </p>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="pl-10 pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Confirm Password Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                    className="pl-10 pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="terms"
                  checked={formData.agreeTerms}
                  onCheckedChange={(checked) => setFormData({...formData, agreeTerms: checked as boolean})}
                  className="mt-1"
                />
                <label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed">
                  I agree to the{" "}
                  <Link to="/terms" className="text-primary hover:text-primary-deep">
                    Terms and Conditions
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy" className="text-primary hover:text-primary-deep">
                    Privacy Policy
                  </Link>
                </label>
              </div>

              {/* Signup Button */}
              <Button 
                type="submit" 
                disabled={loading}
                className="w-full bg-gradient-golden hover:shadow-golden transition-all duration-300"
              >
                {loading ? "Creating Account..." : "Create Account"}
              </Button>
            </form>

            {/* Login Link */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link 
                  to="/login" 
                  className="text-primary hover:text-primary-deep transition-colors font-medium"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
