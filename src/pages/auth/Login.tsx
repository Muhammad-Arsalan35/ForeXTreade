
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Phone, Lock, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    phone: "",
    password: "",
    rememberMe: false
  });
  const navigate = useNavigate();
  const { toast } = useToast();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formattedPhone = formatPhoneNumber(formData.phone);
      
      console.log('Attempting login with:', { phone: formData.phone, formattedPhone });
      
      // Try phone authentication first
      let { data, error } = await supabase.auth.signInWithPassword({
        phone: formattedPhone,
        password: formData.password
      });

      // If phone auth fails, try with email format as fallback
      if (error && (error.message.includes('email') || error.message.includes('disabled'))) {
        console.log('Phone auth failed, trying email format...');
        const emailFormat = `${formData.phone.replace(/\D/g, '')}@taskmaster.app`;
        
        const { data: emailData, error: emailError } = await supabase.auth.signInWithPassword({
          email: emailFormat,
          password: formData.password
        });
        
        data = emailData;
        error = emailError;
      }

      if (error) {
        console.error('Login error:', error);
        let errorMessage = "Invalid phone number or password. Please check your credentials.";
        
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = "Invalid phone number or password. Please check your credentials.";
        } else if (error.message.includes('Email signups are disabled')) {
          errorMessage = "Phone authentication is currently disabled. Please contact support.";
        } else if (error.message.includes('User not found')) {
          errorMessage = "No account found with this phone number. Please sign up first.";
        }
        
        toast({
          title: "Login Failed",
          description: errorMessage,
          variant: "destructive"
        });
        return;
      }

      if (data.user) {
        // Get user data from localStorage if available
        const userData = localStorage.getItem('userData');
        let userName = "User";
        
        if (userData) {
          try {
            const parsedData = JSON.parse(userData);
            userName = parsedData.fullName || "User";
          } catch (e) {
            console.error('Error parsing user data:', e);
          }
        }

        toast({
          title: "Login Successful",
          description: `Welcome back, ${userName}!`,
        });
        navigate("/", { replace: true });
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Login Failed",
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
          <h1 className="text-3xl font-bold text-primary-foreground mb-2">TaskMaster</h1>
          <p className="text-primary-foreground/80">VIP Task Management Platform</p>
        </div>

        <Card className="shadow-elegant border-primary/20">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Welcome Back</CardTitle>
            <p className="text-muted-foreground text-center">
              Sign in to your account to continue
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
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

              {/* Password Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
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

              {/* Remember Me and Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="remember"
                    checked={formData.rememberMe}
                    onCheckedChange={(checked) => setFormData({...formData, rememberMe: checked as boolean})}
                  />
                  <label htmlFor="remember" className="text-sm text-muted-foreground">
                    Remember me
                  </label>
                </div>
                <Link 
                  to="/forgot-password" 
                  className="text-sm text-primary hover:text-primary-deep transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Login Button */}
              <Button 
                type="submit" 
                disabled={loading}
                className="w-full bg-gradient-golden hover:shadow-golden transition-all duration-300"
              >
                {loading ? "Signing In..." : "Sign In"}
              </Button>
            </form>

            {/* Sign Up Link */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link 
                  to="/signup" 
                  className="text-primary hover:text-primary-deep transition-colors font-medium"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
