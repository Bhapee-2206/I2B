import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  FileText,
  CreditCard,
  Receipt as ReceiptIcon,
  AlertCircle,
  FileSpreadsheet,
  Layers,
  BookOpen,
  BarChart3,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  X,
  Database,
  CheckCircle2,
  Copy,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  GraduationCap,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { isSupabaseSchemaAvailable } from '../../services/dbService';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { toast } from 'sonner';

export const AppLayout: React.FC = () => {
  const { user, signOut } = useAuth();
  const { settings } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [supabaseOnline, setSupabaseOnline] = useState<boolean | null>(null);
  const [schemaModalOpen, setSchemaModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Check Supabase schema status
  useEffect(() => {
    isSupabaseSchemaAvailable().then(setSupabaseOnline);
  }, []);

  interface NavItem {
    name: string;
    path: string;
    icon: any;
    badge?: string;
    highlight?: boolean;
  }

  const navItems: NavItem[] = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Students', path: '/students', icon: Users },
    { name: 'Fee Collection', path: '/payments', icon: CreditCard },
    { name: 'Monthly Fees', path: '/invoices', icon: FileText },
    { name: 'Fee Structure', path: '/fee-structures', icon: Layers },
    { name: 'Promotions', path: '/promotions', icon: GraduationCap },
    { name: 'Receipts', path: '/receipts', icon: ReceiptIcon },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
    { name: 'Settings', path: '/settings', icon: SettingsIcon },
  ];

  const secondaryNavItems: NavItem[] = [
    { name: 'Excel Migration', path: '/migration', icon: FileSpreadsheet, badge: 'I2B' },
    { name: 'Enrolments', path: '/enrollments', icon: UserCheck },
    { name: 'Overdue Fees', path: '/overdue', icon: AlertCircle, badge: 'Due' },
  ];

  const handleCopySqlScript = async () => {
    try {
      const response = await fetch('/supabase/schema_and_seed_all_in_one.sql');
      let sqlText = '';
      if (response.ok) {
        sqlText = await response.text();
      } else {
        sqlText = `-- Please find SQL in supabase/schema_and_seed_all_in_one.sql`;
      }
      await navigator.clipboard.writeText(sqlText);
      setIsCopied(true);
      toast.success('SQL migration script copied to clipboard!');
      setTimeout(() => setIsCopied(false), 3000);
    } catch {
      toast.error('Could not copy automatically. Access supabase/schema_and_seed_all_in_one.sql in project root.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row antialiased text-slate-900 selection:bg-emerald-500 selection:text-white">
      {/* ========================================================================= */}
      {/* DESKTOP SIDEBAR (Navy / Slate-900 SaaS Sidebar) */}
      {/* ========================================================================= */}
      <aside className={`hidden lg:flex lg:flex-col ${isSidebarCollapsed ? 'lg:w-20' : 'lg:w-64'} lg:fixed lg:inset-y-0 z-30 bg-slate-900 text-slate-300 border-r border-slate-800 transition-all duration-200 select-none`}>
        {/* Brand Logo Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={settings.logo_url || '/logo.jpg'}
              alt="EduTrack Logo"
              className="w-9 h-9 rounded-lg object-cover ring-2 ring-emerald-500/30 shrink-0"
            />
            {!isSidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <h1 className="text-base font-extrabold text-white tracking-wide truncate">
                  EduTrack
                </h1>
                <p className="text-[10px] font-medium text-emerald-400 tracking-wider uppercase truncate">
                  {settings.institution_name || 'Student & Fee Management'}
                </p>
              </div>
            )}
          </div>
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <ChevronLeft className={`w-4 h-4 transition-transform duration-200 ${isSidebarCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Database Status Bar */}
        {!isSidebarCollapsed ? (
          <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800 text-[11px] flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  supabaseOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className="truncate text-slate-400">
                {supabaseOnline ? 'Supabase Connected' : 'Active Local Store'}
              </span>
            </div>
            <button
              onClick={() => setSchemaModalOpen(true)}
              className="text-[10px] text-emerald-400 hover:text-emerald-300 font-medium underline underline-offset-2 shrink-0 cursor-pointer"
            >
              {supabaseOnline ? 'Live DB' : 'Setup DB'}
            </button>
          </div>
        ) : (
          <div className="py-2 flex justify-center border-b border-slate-800 bg-slate-950/60">
            <span
              title={supabaseOnline ? 'Supabase Live' : 'Local Store'}
              className={`w-2.5 h-2.5 rounded-full ${supabaseOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}
            />
          </div>
        )}

        {/* Desktop Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <NavLink
                key={item.path}
                to={item.path}
                title={isSidebarCollapsed ? item.name : undefined}
                className={`group flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-3'} py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 min-h-[40px] select-none ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-700/30'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3 min-w-0'}`}>
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-400'
                    }`}
                  />
                  {!isSidebarCollapsed && <span className="truncate">{item.name}</span>}
                </div>
              </NavLink>
            );
          })}

          {/* Secondary Nav Divider */}
          {!isSidebarCollapsed ? (
            <div className="pt-3 pb-1 px-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Data & Tools
              </span>
            </div>
          ) : (
            <div className="my-2 border-t border-slate-800" />
          )}

          {secondaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                title={isSidebarCollapsed ? item.name : undefined}
                className={`group flex items-center ${isSidebarCollapsed ? 'justify-center px-2' : 'justify-between px-3'} py-2 rounded-lg text-xs font-medium transition-all min-h-[36px] ${
                  isActive
                    ? 'bg-slate-800 text-emerald-400 font-bold'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`}
              >
                <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3 min-w-0'}`}>
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  {!isSidebarCollapsed && <span className="truncate">{item.name}</span>}
                </div>
                {!isSidebarCollapsed && item.badge && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-slate-800 text-slate-400">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Administrator Profile Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/30">
          <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between gap-2'} p-2 rounded-lg bg-slate-800/40`}>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-inner">
                {user?.name?.[0]?.toUpperCase() || 'A'}
              </div>
              {!isSidebarCollapsed && (
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{user?.name || 'Administrator'}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user?.email || 'admin@i2b-edu.com'}</p>
                </div>
              )}
            </div>
            {!isSidebarCollapsed && (
              <button
                onClick={() => signOut()}
                title="Sign Out"
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-md transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* MOBILE TOP NAVBAR (Compact, responsive, zero-overflow) */}
      {/* ========================================================================= */}
      <header className="lg:hidden sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 px-3 sm:px-4 h-14 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 -ml-1 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 cursor-pointer min-w-0"
          >
            <img
              src={settings.logo_url || '/logo.jpg'}
              alt="I2B Logo"
              className="w-7 h-7 rounded-md object-cover ring-1 ring-emerald-500/30 shrink-0"
            />
            <span className="font-bold text-base tracking-tight truncate text-white">
              {settings.institution_name?.split(' ')[0] || 'I2B'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setSchemaModalOpen(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
              supabaseOnline
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                : 'bg-amber-950/60 text-amber-300 border-amber-500/30'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                supabaseOnline ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span>{supabaseOnline ? 'Live DB' : 'Active DB'}</span>
          </button>

          <button
            onClick={() => signOut()}
            className="p-1.5 text-slate-300 hover:text-rose-400 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MOBILE DRAWER / SLIDEOUT MENU */}
      {/* ========================================================================= */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer content */}
          <div className="fixed inset-y-0 left-0 w-[80%] max-w-xs bg-slate-900 text-slate-200 shadow-2xl flex flex-col z-50 animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="h-14 px-4 flex items-center justify-between border-b border-slate-800 bg-slate-950/40">
              <div className="flex items-center gap-2.5">
                <img
                  src={settings.logo_url || '/logo.jpg'}
                  alt="I2B"
                  className="w-7 h-7 rounded-md object-cover ring-1 ring-emerald-500/30"
                />
                <span className="font-bold text-white text-base">I2B Management</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation in Drawer */}
            <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto no-scrollbar">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3.5 py-3 rounded-lg text-sm font-semibold transition-colors min-h-[44px] ${
                      isActive
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    } ${item.highlight && !isActive ? 'ring-1 ring-emerald-500/30 bg-emerald-950/20 text-emerald-200' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 shrink-0" />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white/20 text-white">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>

            {/* Drawer User Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user?.name || 'Administrator'}</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
              </div>
              <button
                onClick={() => signOut()}
                className="px-3 py-1.5 text-xs font-medium text-rose-300 bg-rose-950/50 hover:bg-rose-900/50 rounded-md border border-rose-800/40"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MAIN CONTENT AREA */}
      {/* ========================================================================= */}
      <main className={`flex-1 ${isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'} flex flex-col min-h-[calc(100vh-3.5rem)] lg:min-h-screen overflow-x-hidden transition-all duration-200`}>
        <div className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-20 lg:pb-6">
          <Outlet />
        </div>
      </main>

      {/* ========================================================================= */}
      {/* MOBILE BOTTOM NAVIGATION BAR (Thumb-friendly 44px+ touch targets) */}
      {/* ========================================================================= */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 flex items-center justify-around py-1 px-1 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center min-h-[46px] min-w-[56px] px-1 py-1 text-[10px] font-medium transition-colors ${
              isActive ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`
          }
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/students"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center min-h-[46px] min-w-[56px] px-1 py-1 text-[10px] font-medium transition-colors ${
              isActive ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`
          }
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span>Students</span>
        </NavLink>

        <NavLink
          to="/invoices"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center min-h-[46px] min-w-[56px] px-1 py-1 text-[10px] font-medium transition-colors ${
              isActive ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`
          }
        >
          <FileText className="w-5 h-5 mb-0.5" />
          <span>Invoices</span>
        </NavLink>

        <NavLink
          to="/payments"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center min-h-[46px] min-w-[56px] px-1 py-1 text-[10px] font-medium transition-colors ${
              isActive ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`
          }
        >
          <CreditCard className="w-5 h-5 mb-0.5" />
          <span>Payments</span>
        </NavLink>

        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center min-h-[46px] min-w-[56px] px-1 py-1 text-[10px] font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span>More</span>
        </button>
      </nav>

      {/* ========================================================================= */}
      {/* SUPABASE SCHEMA & DATABASE SETUP MODAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={schemaModalOpen}
        onClose={() => setSchemaModalOpen(false)}
        title="Supabase Database Configuration"
        subtitle="PostgreSQL Connection & Schema Synchronization"
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs sm:text-sm">
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-3">
            <div className={`p-2 rounded-lg shrink-0 ${supabaseOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              <Database className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold text-slate-900">
                  {supabaseOnline ? 'Supabase Tables Synchronized' : 'Supabase Connected (Pending Migration Run)'}
                </p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${supabaseOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                  {supabaseOnline ? 'LIVE POSTGRESQL' : 'ACTIVE EMBEDDED STORE'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Project URL: <code className="bg-slate-200/80 px-1 py-0.5 rounded font-mono text-[11px]">https://bpowmzajdyvddnwrqupq.supabase.co</code>
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-800">1-Step PostgreSQL Schema Execution</h4>
            <p className="text-slate-600 text-xs leading-relaxed">
              To apply all 12 tables, indexes, RLS policies, standard fee matrices, and 75 Excel enrolment records directly to your remote Supabase PostgreSQL database:
            </p>
            <ol className="list-decimal pl-4 space-y-1.5 text-xs text-slate-600">
              <li>
                Click <span className="font-semibold text-slate-900">"Copy SQL Migration Script"</span> below.
              </li>
              <li>
                Open the Supabase SQL Editor:
                <a
                  href="https://supabase.com/dashboard/project/bpowmzajdyvddnwrqupq/sql/new"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-emerald-600 hover:text-emerald-700 ml-1.5 underline"
                >
                  Open Supabase SQL Editor <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>Paste into the query editor and click <span className="font-semibold text-slate-900">Run</span>.</li>
            </ol>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
            <Button
              className="w-full sm:w-auto"
              variant="primary"
              size="sm"
              icon={isCopied ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
              onClick={handleCopySqlScript}
            >
              {isCopied ? 'Copied to Clipboard!' : 'Copy SQL Migration Script'}
            </Button>
            <a
              href="https://supabase.com/dashboard/project/bpowmzajdyvddnwrqupq/sql/new"
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto"
            >
              <Button variant="outline" size="sm" className="w-full" icon={<ExternalLink className="w-4 h-4" />}>
                Go to Supabase SQL Editor
              </Button>
            </a>
          </div>
        </div>
      </Modal>
    </div>
  );
};

