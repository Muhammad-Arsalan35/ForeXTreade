import { 
  Home, 
  BarChart3, 
  FileText, 
  Bell, 
  Ticket, 
  MessageCircle, 
  UserPlus, 
  Calendar,
  BookOpen,
  Download,
  LogOut
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Home, label: "Home", path: "/", badge: null },
  { icon: BarChart3, label: "Record", path: "/records", badge: null },
  { icon: FileText, label: "Financial", path: "/financial", badge: 2 },
  { icon: Bell, label: "Notices", path: "/notices", badge: 5 },
  { icon: Ticket, label: "Coupons", path: "/coupons", badge: null },
  { icon: MessageCircle, label: "Messages", path: "/messages", badge: 3 },
  { icon: UserPlus, label: "Invite", path: "/invite", badge: null },
  { icon: Calendar, label: "Daily", path: "/daily", badge: null },
  { icon: BookOpen, label: "Handbook", path: "/handbook", badge: null },
  { icon: Download, label: "Download", path: "/download", badge: null },
  { icon: LogOut, label: "Logout", path: "/logout", badge: null },
];

export const BottomNavigation = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="grid grid-cols-6 gap-1 p-2">
        {navItems.slice(0, 6).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 relative",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-golden" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )
            }
          >
            <item.icon className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium truncate w-full text-center">
              {item.label}
            </span>
            {item.badge && (
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </div>
      
      {/* Extended navigation for additional items */}
      <div className="grid grid-cols-5 gap-1 p-2 pt-0 border-t border-border/50">
        {navItems.slice(6).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 relative",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-golden" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )
            }
          >
            <item.icon className="w-4 h-4 mb-1" />
            <span className="text-xs font-medium truncate w-full text-center">
              {item.label}
            </span>
            {item.badge && (
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full min-w-[16px] h-[16px] flex items-center justify-center">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};