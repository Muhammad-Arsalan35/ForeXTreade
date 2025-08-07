import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/auth/Login";
import { Signup } from "./pages/auth/Signup";
import { Financial } from "./pages/Financial";
import { Records } from "./pages/Records";
import { Invite } from "./pages/Invite";
import { Deposit } from "./pages/Deposit";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="records" element={<Records />} />
            <Route path="financial" element={<Financial />} />
            <Route path="deposit" element={<Deposit />} />
            <Route path="notices" element={<div className="p-8 text-center">Notices Page - Coming Soon</div>} />
            <Route path="coupons" element={<div className="p-8 text-center">Coupons Page - Coming Soon</div>} />
            <Route path="messages" element={<div className="p-8 text-center">Messages Page - Coming Soon</div>} />
            <Route path="invite" element={<Invite />} />
            <Route path="daily" element={<div className="p-8 text-center">Daily Statement - Coming Soon</div>} />
            <Route path="handbook" element={<div className="p-8 text-center">Employee Handbook - Coming Soon</div>} />
            <Route path="download" element={<div className="p-8 text-center">Download App - Coming Soon</div>} />
            <Route path="logout" element={<div className="p-8 text-center">Logging out...</div>} />
          </Route>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/:referralCode" element={<Signup />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
