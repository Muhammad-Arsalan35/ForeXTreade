import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Phone, Lock, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import heroBanner from "@/assets/hero-banner.jpg";

export const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    phone: "",
    password: "",
    rememberMe: false
  });
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle login logic here
    console.log("Login attempt:", formData);
    navigate("/");
  };

  const handleSocialLogin = (provider: string) => {
    console.log(`Login with ${provider}`);
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
                    placeholder="Enter your phone number"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="pl-10"
                    required
                  />
                </div>
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
                className="w-full bg-gradient-golden hover:shadow-golden transition-all duration-300"
              >
                Sign In
              </Button>
            </form>

            {/* Social Login */}
            <div className="space-y-3">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-muted" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => handleSocialLogin("google")}
                  className="hover:bg-muted"
                >
                  Google
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleSocialLogin("facebook")}
                  className="hover:bg-muted"
                >
                  Facebook
                </Button>
              </div>
            </div>

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