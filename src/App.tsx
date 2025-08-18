import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/auth/Login";
import { Signup } from "./pages/auth/Signup";
import { ForgotPassword } from "./pages/auth/ForgotPassword";
import { Financial } from "./pages/Financial";
import { Records } from "./pages/Records";
import { Invite } from "./pages/Invite";
import { Deposit } from "./pages/Deposit";
import { Withdraw } from "./pages/Withdraw";
import { Profile } from "./pages/Profile";
import NotFound from "./pages/NotFound";
import { Logout } from "./pages/auth/Logout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/home" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
          </Route>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="records" element={<Records />} />
            <Route path="financial" element={<Financial />} />
            <Route path="deposit" element={<Deposit />} />
            <Route path="withdraw" element={<Withdraw />} />
            <Route path="notices" element={<div className="p-8 text-center">Notices Page - Coming Soon</div>} />
            <Route path="coupons" element={<div className="p-8 text-center">Coupons Page - Coming Soon</div>} />
            <Route path="messages" element={<div className="p-8 text-center">Messages Page - Coming Soon</div>} />
            <Route path="invite" element={<Invite />} />
            <Route path="profile" element={<Profile />} />
            <Route path="daily" element={<div className="p-8 text-center">Daily Statement - Coming Soon</div>} />
            <Route path="handbook" element={<div className="p-8 text-center">Employee Handbook - Coming Soon</div>} />
            <Route path="download" element={<div className="p-8 text-center">Download App - Coming Soon</div>} />
            <Route path="logout" element={<Logout />} />
          </Route>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/:referralCode" element={<Signup />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
