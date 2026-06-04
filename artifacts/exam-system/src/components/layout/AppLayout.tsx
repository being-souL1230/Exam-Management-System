import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  BookOpen, 
  ClipboardList, 
  Bell,
  LogOut,
  Menu,
  ShieldCheck,
  Moon,
  Sun,
  Sparkles,
  GraduationCap,
  CalendarDays,
  Banknote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { AIChatPanel } from "@/components/ai/AIChatPanel";

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    return (localStorage.getItem("exam_theme") as "light" | "dark" | null) || "light";
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUnread = useCallback(async () => {
    try {
      const token = localStorage.getItem("exam_auth_token");
      if (!token) return;
      const res = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data: Array<{ readStatus: boolean }> = await res.json();
      setUnreadCount(data.filter((n) => !n.readStatus).length);
    } catch {
      // silent fail
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchUnread();
    intervalRef.current = setInterval(fetchUnread, 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [user, fetchUnread]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("exam_theme", theme);
  }, [theme]);

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "teacher", "student"] },
    { href: "/students", label: "Students", icon: Users, roles: ["admin", "teacher"] },
    { href: "/exams", label: "Exams", icon: FileText, roles: ["admin", "teacher", "student"] },
    { href: "/questions", label: "Question Bank", icon: BookOpen, roles: ["admin", "teacher"] },
    { href: "/results", label: "Results", icon: ClipboardList, roles: ["admin", "teacher", "student"] },
    { href: "/gradebook", label: "Grade Book", icon: GraduationCap, roles: ["admin", "teacher"] },
    { href: "/calendar", label: "Calendar", icon: CalendarDays, roles: ["admin", "teacher", "student"] },
    { href: "/fees", label: "Fee Tracker", icon: Banknote, roles: ["admin", "teacher"] },
    { href: "/notifications", label: "Notifications", icon: Bell, roles: ["admin", "teacher", "student"] },
    { href: "/admin-control", label: "Admin Control", icon: ShieldCheck, roles: ["admin"] },
  ];

  const filteredNav = navItems.filter(item => user && item.roles.includes(user.role));

  const SidebarContent = () => (
    <div className="flex h-full flex-col gap-3 py-4">
      
      <div className="flex-1 px-2.5">
        <nav className="flex flex-col gap-1">
          {filteredNav.map((item) => {
            const isActive = location.startsWith(item.href);
            const isNotifications = item.href === "/notifications";
            return (
              <Link key={item.href} href={item.href} className="w-full">
                <span
                  className={cn(
                    "group flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-all hover:bg-muted/70 hover:text-foreground",
                    isActive && "bg-primary/10 text-primary ring-1 ring-primary/15",
                  )}
                >
                  <span className="relative shrink-0">
                    <item.icon className="h-4 w-4" />
                    {isNotifications && unreadCount > 0 && (
                      <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </span>
                  <span className="truncate">{item.label}</span>
                  {isNotifications && unreadCount > 0 && (
                    <span className="ml-auto rounded-full bg-destructive/15 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                      {unreadCount}
                    </span>
                  )}
                </span>
              </Link>
            );
          })}
          <Sheet>
            <SheetTrigger asChild>
              <button className="group mt-1 flex h-9 items-center gap-2 rounded-xl px-3 text-left text-sm font-medium text-muted-foreground transition-all hover:bg-muted/70 hover:text-foreground">
                <Sparkles className="h-4 w-4 shrink-0" />
                <span className="truncate">AI Assistant</span>
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full border-l-border/70 p-3 sm:max-w-[460px]">
              <AIChatPanel />
            </SheetContent>
          </Sheet>
        </nav>
      </div>

      <div className="mt-auto space-y-2 px-2.5">
        <button
          className="flex h-9 w-full items-center justify-between rounded-xl border border-border/60 bg-muted/35 px-3 text-xs font-semibold text-muted-foreground transition hover:bg-muted/70"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <span>{theme === "dark" ? "Dark mode" : "Light mode"}</span>
          {theme === "dark" ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
        </button>

        <div className="rounded-2xl border border-border/60 bg-card/70 p-2.5 shadow-sm">
          <div className="flex items-center gap-2.5">
            <Avatar className="h-8 w-8 border border-border/70">
              <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                {user?.username?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="truncate text-sm font-semibold">{user?.username}</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{user?.role}</span>
            </div>
          </div>
        </div>
        
        <Button 
          variant="ghost" 
          className="h-9 w-full justify-start rounded-xl px-3 text-muted-foreground hover:text-foreground" 
          onClick={logout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Logout</span>
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <aside className="sticky top-0 hidden h-screen w-[220px] overflow-y-auto border-r border-border/60 bg-card/70 backdrop-blur-xl lg:block">
        <SidebarContent />
      </aside>
      
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden relative">
        <div className="pointer-events-none absolute right-[-10%] top-[-15%] h-[42%] w-[42%] rounded-full bg-primary/8 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-[-12%] left-[-10%] h-[36%] w-[36%] rounded-full bg-sky-500/8 blur-[110px]" />

        <main className="relative flex-1 overflow-y-auto custom-scrollbar">
          <div className="sticky top-0 z-20 flex h-13 items-center justify-between border-b border-border/60 bg-background/80 px-3 backdrop-blur-md lg:hidden">
            <div className="flex items-center">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 border-r-border/40 premium-glass">
                <SidebarContent />
              </SheetContent>
            </Sheet>
            </div>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 rounded-xl">
                  <Sparkles className="mr-1.5 h-4 w-4" />
                  AI
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full border-l-border/70 p-3 sm:max-w-[460px]">
                <AIChatPanel />
              </SheetContent>
            </Sheet>
          </div>
          
          <div className="mx-auto min-h-full w-full max-w-7xl p-3 sm:p-4 lg:p-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={location}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                className="h-full"
              >
                <div className="min-w-0">{children}</div>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
