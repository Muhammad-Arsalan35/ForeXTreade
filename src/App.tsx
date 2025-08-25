import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import { Login } from "./pages/auth/Login";
import { Signup } from "./pages/auth/Signup";
import { ForgotPassword } from "./pages/auth/ForgotPassword";
import { Financial } from "./pages/Financial";
import { Records } from "./pages/Records";
import { Invite } from "./pages/Invite";
import { Deposit } from "./pages/Deposit";
import { Withdraw } from "./pages/Withdraw";
import { Task } from "./pages/Task";
import { Profile } from "./pages/Profile";
import { Messages } from "./pages/Messages";
import { Handbook } from "./pages/Handbook";
import { Download } from "./pages/Download";
import { Videos } from "./pages/Videos";
import { Plans } from "./pages/Plans";
import { Referrals } from "./pages/Referrals";
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
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="records" element={<Records />} />
            <Route path="financial" element={<Financial />} />
            <Route path="deposit" element={<Deposit />} />
            <Route path="withdraw" element={<Withdraw />} />
            <Route path="task" element={<Task />} />
            <Route path="videos" element={<Videos />} />
            <Route path="plans" element={<Plans />} />
            <Route path="referrals" element={<Referrals />} />
            <Route path="notices" element={<div className="p-8 text-center">Notices Page - Coming Soon</div>} />
            <Route path="coupons" element={<div className="p-8 text-center">Coupons Page - Coming Soon</div>} />
            <Route path="messages" element={<Messages />} />
            <Route path="invite" element={<Invite />} />
            <Route path="profile" element={<Profile />} />
            <Route path="handbook" element={<Handbook />} />
            <Route path="download" element={<Download />} />
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
