import { 
  Home, 
  FileText, 
  Wallet, 
  Ticket, 
  PlayCircle,
  UserPlus,
  Users
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Home, label: "Home", path: "/dashboard", badge: null },
  { icon: FileText, label: "Financial", path: "/dashboard/financial", badge: 2 },
  { icon: Wallet, label: "Deposit", path: "/dashboard/deposit", badge: null },
  { icon: Ticket, label: "Withdraw", path: "/dashboard/withdraw", badge: null },
  { icon: PlayCircle, label: "Task", path: "/dashboard/task", badge: null },
  { icon: Users, label: "Profile", path: "/dashboard/profile", badge: null },
  { icon: UserPlus, label: "Invite", path: "/dashboard/invite", badge: null }
];

export const BottomNavigation = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-primary/20 z-50 shadow-golden">
      <div className="grid grid-cols-7 gap-0.5 p-1 md:p-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center p-1 md:p-1.5 rounded-lg transition-all duration-200 relative hover-scale",
                isActive 
                  ? "bg-gradient-cash text-primary-foreground shadow-golden" 
                  : "text-muted-foreground hover:text-primary hover:bg-primary/10"
              )
            }
          >
            <item.icon className="w-3 h-3 md:w-4 md:h-4 mb-0.5 md:mb-1" />
            <span className="text-[8px] md:text-[10px] font-medium truncate w-full text-center leading-tight">
              {item.label}
            </span>
            {item.badge && (
              <span className="absolute -top-0.5 md:-top-1 -right-0.5 md:-right-1 bg-destructive text-destructive-foreground text-[10px] md:text-xs rounded-full min-w-[16px] md:min-w-[18px] h-[16px] md:h-[18px] flex items-center justify-center">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};