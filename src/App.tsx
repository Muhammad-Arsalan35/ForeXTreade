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
import { Deposit } from "./pages/Deposit";
import { Withdraw } from "./pages/Withdraw";
import { Task } from "./pages/Task";
import { Profile } from "./pages/Profile";
import { Messages } from "./pages/Messages";
import { Handbook } from "./pages/Handbook";
import { Download } from "./pages/Download";
import { Plans } from "./pages/Plans";
import { Referrals } from "./pages/Referrals";
import { Invite } from "./pages/Invite";
import NotFound from "./pages/NotFound";
import { Logout } from "./pages/auth/Logout";
import Admin from "./pages/Admin";
import { AdminVideos } from "./pages/AdminVideos";
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AuthProvider } from './components/AuthProvider';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
            {/* Public routes */}
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/:referralCode" element={<Signup />} />
            
            {/* Protected routes with AppLayout */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="records" element={<Records />} />
              <Route path="financial" element={<Financial />} />
              <Route path="deposit" element={
                <ProtectedRoute requiredVipLevel={1}>
                  <Deposit />
                </ProtectedRoute>
              } />
              <Route path="withdraw" element={
                <ProtectedRoute requiredVipLevel={1}>
                  <Withdraw />
                </ProtectedRoute>
              } />
              <Route path="task" element={<Task />} />
              <Route path="plans" element={<Plans />} />
              <Route path="referrals" element={<Referrals />} />
              <Route path="invite" element={<Invite />} />
              <Route path="notices" element={<div className="p-8 text-center">Notices Page - Coming Soon</div>} />
              <Route path="coupons" element={<div className="p-8 text-center">Coupons Page - Coming Soon</div>} />
              <Route path="messages" element={<Messages />} />
              <Route path="profile" element={<Profile />} />
              <Route path="handbook" element={<Handbook />} />
              <Route path="download" element={<Download />} />
              <Route path="logout" element={<Logout />} />
              <Route path="admin" element={
                <ProtectedRoute requiredRole="admin">
                  <Admin />
                </ProtectedRoute>
              } />
              <Route path="admin/videos" element={
                <ProtectedRoute requiredRole="admin">
                  <AdminVideos />
                </ProtectedRoute>
              } />
            </Route>
            
            {/* Standalone protected routes */}
            <Route path="/home" element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
            </Route>
            
            {/* VIP-only routes */}
            <Route path="/vip-tasks" element={
              <ProtectedRoute requiredVipLevel={3}>
                <AppLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Task />} />
            </Route>
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
