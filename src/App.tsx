import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  IndianRupee,
  RotateCw,
  Clock,
  BarChart3,
  Shield,
  Settings,
  Dumbbell,
  LogOut,
  Building2,
  ChevronDown,
  Database,
  Plus,
  Menu,
  X,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DashboardView } from './views/DashboardView';
import { MembersView } from './views/MembersView';
import { PaymentsView } from './views/PaymentsView';
import { RenewalsView } from './views/RenewalsView';
import { AttendanceView } from './views/AttendanceView';
import { ReportsView } from './views/ReportsView';
import { StaffView } from './views/StaffView';
import { SettingsView } from './views/SettingsView';
import { DatabaseRequiredScreen } from './views/DatabaseRequiredScreen';

import { DatabaseSetupModal } from './components/DatabaseSetupModal';
import { AuthModal } from './components/AuthModal';
import { GymSetupModal } from './components/GymSetupModal';
import { AddMemberModal } from './components/AddMemberModal';
import { CollectPaymentModal } from './components/CollectPaymentModal';
import { RenewMembershipModal } from './components/RenewMembershipModal';
import { HoldMembershipModal } from './components/HoldMembershipModal';
import { MemberProfileModal } from './components/MemberProfileModal';
import { UserManualModal } from './components/UserManualModal';
import { KruLogo } from './components/KruLogo';

import { Member } from './types';

function getOwnerDisplayName(email?: string | null): string {
  if (!email) return 'Admin Account';
  const prefix = email.split('@')[0];
  if (prefix.toLowerCase() === 'tigerchitransh') return 'Tiger Chitransh';
  const parts = prefix.split(/[._-]/);
  if (parts.length > 1) {
    return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
  }
  return prefix.charAt(0).toUpperCase() + prefix.slice(1);
}

function MainApp() {
  const {
    user,
    loading,
    activeGym,
    activeRole,
    gyms,
    isSuperAdmin,
    connectionStatus,
    setActiveGym,
    signOut,
  } = useAuth();

  // Navigation State
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [membersFilter, setMembersFilter] = useState<string>('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Modals state
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [isGymSetupOpen, setIsGymSetupOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [selectedMemberForPayment, setSelectedMemberForPayment] = useState<Member | null>(null);
  const [selectedMemberForRenew, setSelectedMemberForRenew] = useState<Member | null>(null);
  const [selectedMemberForHold, setSelectedMemberForHold] = useState<Member | null>(null);
  const [viewingMemberId, setViewingMemberId] = useState<string | null>(null);

  // Gym dropdown switcher
  const [gymDropdownOpen, setGymDropdownOpen] = useState(false);

  // Refresh trigger for views
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = () => setRefreshKey(k => k + 1);

  const handleNavigate = (view: string, filter?: string) => {
    setCurrentView(view);
    if (filter) setMembersFilter(filter);
    setMobileMenuOpen(false);
  };

  // If initial connection or auth is loading
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="p-4 bg-teal-700 text-white rounded-2xl mb-4 shadow-sm animate-pulse">
          <Dumbbell className="w-8 h-8" />
        </div>
        <p className="text-sm font-bold text-slate-800">Loading Kru Fitness...</p>
        <p className="text-xs text-slate-500 mt-1">Opening your gym workspace</p>
      </div>
    );
  }

  // If Supabase PostgreSQL is not connected, show the clear deployment/setup error
  if (!connectionStatus?.connected) {
    return <DatabaseRequiredScreen />;
  }

  // If user is not authenticated, show sign in / sign up
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
        <AuthModal
          isOpen={true}
          onOpenDatabaseSetup={() => setIsDbModalOpen(true)}
          onOpenManual={() => setIsManualOpen(true)}
        />
        <DatabaseSetupModal
          isOpen={isDbModalOpen}
          onClose={() => setIsDbModalOpen(false)}
        />
        <UserManualModal
          isOpen={isManualOpen}
          onClose={() => setIsManualOpen(false)}
        />
      </div>
    );
  }

  // If user is authenticated but has 0 gyms, prompt Gym Setup
  if (gyms.length === 0 || !activeGym) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
        <GymSetupModal isOpen={true} />
        <DatabaseSetupModal
          isOpen={isDbModalOpen}
          onClose={() => setIsDbModalOpen(false)}
        />
      </div>
    );
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'payments', label: 'Payments', icon: IndianRupee },
    { id: 'renewals', label: 'Renewals', icon: RotateCw },
    // ATTENDANCE IS OPTIONAL (Prompt section 9)
    ...(activeGym.attendance_enabled ? [{ id: 'attendance', label: 'Attendance', icon: Clock }] : []),
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row font-sans">
      {/* ========================================================================= */}
      {/* DESKTOP SIDEBAR NAVIGATION */}
      {/* ========================================================================= */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-slate-900 text-white shrink-0 border-r border-slate-800">
        {/* Brand & Gym Switcher (Constitution Section 33) */}
        <div className="p-5 border-b border-slate-800 space-y-3">
          <div className="flex items-center space-x-3">
            <KruLogo className="w-8 h-8 rounded-full shrink-0" />
            <div>
              <span className="text-base font-bold tracking-tight text-white leading-tight block">Kru Fitness</span>
              <span className="text-[10px] font-medium text-teal-300 block">
                A KruSpace Product
              </span>
            </div>
          </div>

          {/* Active Gym Selector */}
          <div className="relative">
            <button
              onClick={() => setGymDropdownOpen(!gymDropdownOpen)}
              className="w-full flex items-center justify-between p-2.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700/80 rounded-xl text-left transition-colors"
            >
              <div className="truncate">
                <p className="text-xs font-bold text-slate-100 truncate">{activeGym.name}</p>
                <p className="text-[10px] text-slate-400 capitalize">{activeRole || 'Owner'}</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
            </button>

            {gymDropdownOpen && (
              <div className="absolute top-full left-0 w-full mt-1.5 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-30 py-1 overflow-hidden">
                {gyms.map(g => (
                  <button
                    key={g.gym.id}
                    onClick={() => {
                      setActiveGym(g.gym, g.role as any);
                      setGymDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-xs text-left hover:bg-slate-700 flex items-center justify-between ${
                      g.gym.id === activeGym.id ? 'text-teal-400 font-bold bg-slate-750' : 'text-slate-200'
                    }`}
                  >
                    <span className="truncate">{g.gym.name}</span>
                    <span className="text-[10px] text-slate-400 uppercase">{g.role}</span>
                  </button>
                ))}
                <div className="border-t border-slate-700 my-1" />
                <button
                  onClick={() => {
                    setGymDropdownOpen(false);
                    setIsGymSetupOpen(true);
                  }}
                  className="w-full px-3 py-2 text-xs text-left text-teal-400 hover:bg-slate-700 font-semibold flex items-center space-x-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Another Gym</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                  isActive
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Manual Trigger */}
        <div className="px-3 pb-2">
          <button
            onClick={() => setIsManualOpen(true)}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-xs font-semibold text-teal-300 bg-teal-950/60 hover:bg-teal-900/80 border border-teal-800/60 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-teal-400" />
            <span>User Manual & Guide</span>
          </button>
        </div>

        {/* User Footer (No technical database/sync pills per Constitution Section 20) */}
        <div className="p-3 border-t border-slate-800">
          <div className="flex items-center justify-between px-2 py-1">
            <div className="truncate pr-2">
              <div className="flex items-center space-x-1.5">
                <p className="text-xs font-bold text-slate-200 truncate" title={user.email || undefined}>
                  {user.user_metadata?.full_name || getOwnerDisplayName(user.email)}
                </p>
                {isSuperAdmin && (
                  <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                    SUPER ADMIN
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 mt-0.5">
                <span className="capitalize">{isSuperAdmin ? 'Platform Super Admin' : (activeRole || 'Owner')}</span>
                {user.email && (
                  <span className="text-slate-500 font-mono text-[9px] truncate max-w-[90px]" title={user.email}>
                    • {user.email}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={signOut}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* MOBILE TOP BAR (Constitution Section 33) */}
      {/* ========================================================================= */}
      <header className="lg:hidden bg-slate-900 text-white px-4 py-3 border-b border-slate-800 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center space-x-2.5">
          <KruLogo className="w-7 h-7 rounded-full shrink-0" />
          <div>
            <span className="text-sm font-bold tracking-tight text-white leading-tight block">Kru Fitness</span>
            <span className="text-[10px] text-teal-300 block font-medium">{activeGym.name}</span>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setIsManualOpen(true)}
            className="p-1.5 text-teal-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center space-x-1 text-xs"
            title="Open User Manual"
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline text-[11px] font-semibold">Manual</span>
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* MOBILE MENU DROPDOWN */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-900 border-b border-slate-800 p-3 space-y-1 z-30">
          <button
            onClick={() => {
              setIsManualOpen(true);
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold text-teal-300 bg-teal-950/60 border border-teal-800/60 mb-2"
          >
            <BookOpen className="w-4 h-4 text-teal-400" />
            <span>📖 Open User Manual & Guide</span>
          </button>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold ${
                  isActive ? 'bg-teal-700 text-white' : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
          <div className="border-t border-slate-800 pt-2 flex items-center justify-between px-2">
            <div>
              <div className="flex items-center space-x-1.5">
                <p className="text-xs font-bold text-slate-200">{user.user_metadata?.full_name || getOwnerDisplayName(user.email)}</p>
                {isSuperAdmin && (
                  <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    SUPER ADMIN
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 capitalize">{isSuperAdmin ? 'Platform Super Admin' : (activeRole || 'Owner')}</span>
            </div>
            <button
              onClick={signOut}
              className="text-xs text-red-400 font-bold hover:underline"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MAIN VIEW AREA */}
      {/* ========================================================================= */}
      <main className="flex-1 overflow-y-auto p-3.5 sm:p-6 lg:p-8 pb-20 lg:pb-8 max-w-7xl mx-auto w-full">
        {currentView === 'dashboard' && (
          <DashboardView
            key={`dashboard-${refreshKey}`}
            onNavigate={handleNavigate}
            onOpenAddMember={() => setIsAddMemberOpen(true)}
            onCollectPayment={m => setSelectedMemberForPayment(m)}
            onRenew={m => setSelectedMemberForRenew(m)}
          />
        )}

        {currentView === 'members' && (
          <MembersView
            key={`members-${refreshKey}`}
            initialFilter={membersFilter}
            onOpenAddMember={() => setIsAddMemberOpen(true)}
            onViewMember={id => setViewingMemberId(id)}
            onCollectPayment={m => setSelectedMemberForPayment(m)}
            onRenew={m => setSelectedMemberForRenew(m)}
          />
        )}

        {currentView === 'payments' && <PaymentsView key={`payments-${refreshKey}`} />}

        {currentView === 'renewals' && (
          <RenewalsView
            key={`renewals-${refreshKey}`}
            onRenew={m => setSelectedMemberForRenew(m)}
            onViewMember={id => setViewingMemberId(id)}
          />
        )}

        {currentView === 'attendance' && activeGym.attendance_enabled && (
          <AttendanceView key={`attendance-${refreshKey}`} />
        )}

        {currentView === 'reports' && <ReportsView key={`reports-${refreshKey}`} />}

        {currentView === 'staff' && <StaffView key={`staff-${refreshKey}`} />}

        {currentView === 'settings' && (
          <SettingsView
            key={`settings-${refreshKey}`}
            onOpenDatabaseSetup={() => setIsDbModalOpen(true)}
          />
        )}
      </main>

      {/* ========================================================================= */}
      {/* MOBILE BOTTOM NAVIGATION BAR (Sticky thumb-reachable quick bar) */}
      {/* ========================================================================= */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-900 border-t border-slate-800 flex items-center justify-around px-2 py-2">
        <button
          onClick={() => handleNavigate('dashboard')}
          className={`flex flex-col items-center justify-center p-1 rounded-lg min-w-14 transition-colors ${
            currentView === 'dashboard' ? 'text-teal-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Home</span>
        </button>

        <button
          onClick={() => handleNavigate('members')}
          className={`flex flex-col items-center justify-center p-1 rounded-lg min-w-14 transition-colors ${
            currentView === 'members' ? 'text-teal-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Members</span>
        </button>

        {/* Floating Add Member button */}
        <button
          onClick={() => setIsAddMemberOpen(true)}
          className="flex flex-col items-center justify-center -mt-5 p-3 rounded-full bg-teal-700 hover:bg-teal-600 text-white shadow-lg shadow-teal-950/60 active:scale-95 transition-all"
          title="Add New Member"
        >
          <Plus className="w-5 h-5" />
        </button>

        <button
          onClick={() => handleNavigate('payments')}
          className={`flex flex-col items-center justify-center p-1 rounded-lg min-w-14 transition-colors ${
            currentView === 'payments' ? 'text-teal-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <IndianRupee className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Payments</span>
        </button>

        <button
          onClick={() => handleNavigate(activeGym.attendance_enabled ? 'attendance' : 'renewals')}
          className={`flex flex-col items-center justify-center p-1 rounded-lg min-w-14 transition-colors ${
            (currentView === 'attendance' || currentView === 'renewals') ? 'text-teal-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {activeGym.attendance_enabled ? (
            <>
              <Clock className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">Attendance</span>
            </>
          ) : (
            <>
              <RotateCw className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">Renewals</span>
            </>
          )}
        </button>
      </nav>

      {/* ========================================================================= */}
      {/* GLOBAL MODALS */}
      {/* ========================================================================= */}
      <DatabaseSetupModal
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
      />

      <GymSetupModal
        isOpen={isGymSetupOpen}
        onClose={() => setIsGymSetupOpen(false)}
      />

      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        onSuccess={() => {
          triggerRefresh();
        }}
      />

      <CollectPaymentModal
        isOpen={Boolean(selectedMemberForPayment)}
        member={selectedMemberForPayment}
        onClose={() => setSelectedMemberForPayment(null)}
        onSuccess={() => {
          triggerRefresh();
        }}
      />

      <RenewMembershipModal
        isOpen={Boolean(selectedMemberForRenew)}
        member={selectedMemberForRenew}
        onClose={() => setSelectedMemberForRenew(null)}
        onSuccess={() => {
          triggerRefresh();
        }}
      />

      <HoldMembershipModal
        isOpen={Boolean(selectedMemberForHold)}
        member={selectedMemberForHold}
        onClose={() => setSelectedMemberForHold(null)}
        onSuccess={() => {
          triggerRefresh();
        }}
      />

      <MemberProfileModal
        isOpen={Boolean(viewingMemberId)}
        memberId={viewingMemberId}
        onClose={() => setViewingMemberId(null)}
        onCollectPayment={m => {
          setViewingMemberId(null);
          setSelectedMemberForPayment(m);
        }}
        onRenew={m => {
          setViewingMemberId(null);
          setSelectedMemberForRenew(m);
        }}
        onHold={m => {
          setViewingMemberId(null);
          setSelectedMemberForHold(m);
        }}
        onRefreshList={triggerRefresh}
      />

      <UserManualModal
        isOpen={isManualOpen}
        onClose={() => setIsManualOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
