import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  LayoutDashboard, Radio, FileText, Users, UserCircle,
  BarChart3, AlertTriangle, Settings, LogOut, Menu, X,
  Bell, Search, ChevronDown, Megaphone, ListTodo, Shield
} from 'lucide-react';
import { cn } from "@/lib/utils";
import NotificationCenter from '@/components/collaboration/NotificationCenter';

const navigation = [
  { name: 'Dashboard', href: 'Dashboard', icon: LayoutDashboard },
  { name: 'Monitoring', href: 'Monitoring', icon: Radio },
  { name: 'Crisis Center', href: 'CrisisCenter', icon: AlertTriangle },
  { name: 'AI Insights', href: 'AIInsights', icon: Shield },
  { name: 'Media Relations', href: 'MediaRelations', icon: Users },
  { name: 'Influencers', href: 'Influencers', icon: UserCircle },
  { name: 'Press Releases', href: 'PressRelease', icon: FileText },
  { name: 'Campaigns', href: 'Campaigns', icon: Megaphone },
  { name: 'Tasks', href: 'Tasks', icon: ListTodo },
  { name: 'Analytics', href: 'Analytics', icon: BarChart3 },
];

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [crisisCount, setCrisisCount] = useState(0);
  const location = useLocation();

  useEffect(() => {
    loadUser();
    loadCrisisCount();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
    } catch (e) {
      console.log('Not logged in');
    }
  };

  const loadCrisisCount = async () => {
    try {
      const alerts = await base44.entities.CrisisAlert.filter({ status: 'active' });
      setCrisisCount(alerts.length);
    } catch (e) {
      console.log('No crisis alerts');
    }
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  const isActivePage = (href) => {
    return currentPageName === href;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900">PR Command</h1>
              <p className="text-xs text-slate-500">Media Intelligence</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={createPageUrl(item.href)}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActivePage(item.href)
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                <item.icon className={cn(
                  "w-5 h-5",
                  isActivePage(item.href) ? "text-blue-600" : "text-slate-400"
                )} />
                {item.name}
                {item.href === 'CrisisCenter' && crisisCount > 0 && (
                  <Badge className="ml-auto bg-red-500 text-white text-xs px-1.5">
                    {crisisCount}
                  </Badge>
                )}
              </Link>
            ))}
          </nav>

          {/* User */}
          {user && (
            <div className="p-4 border-t border-slate-100">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start gap-3 h-auto py-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback className="bg-blue-100 text-blue-600 text-sm">
                        {user.full_name?.[0] || user.email?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {user.full_name || 'User'}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem>
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-sm border-b border-slate-200 lg:px-6">
          <Button 
            variant="ghost" 
            size="sm" 
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>

          <div className="flex-1 max-w-xl mx-4 hidden sm:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search mentions, contacts, campaigns..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user && <NotificationCenter userEmail={user.email} />}
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}