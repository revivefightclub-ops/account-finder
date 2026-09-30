"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { useAccounts } from "@/hooks/useAccounts";
import { useAuth } from "@/hooks/useAuth";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useSidebar } from "@/hooks/useSidebar";
import { useProfile } from "@/hooks/useProfile";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { AccountTable } from "@/features/AccountTable";
import { AddAccountModal } from "@/features/AddAccountModal";
import { EditAccountModal } from "@/features/EditAccountModal";
import { DeleteDialog } from "@/features/DeleteDialog";
import { ProfileModal } from "@/features/ProfileModal";
import { FullscreenAccountModal } from "@/features/FullscreenAccountModal";
import { AuthModal } from "@/features/AuthModal";
import { exportToCSV, parseCSV } from "@/utils/csv";
import { AccountWithStatus } from "@/types";
import { Search, Filter, Menu, Bell, Download, Upload, Plus, LayoutDashboard, Users, LineChart, Settings, HelpCircle, UserX, Camera, Sun, Moon, Sparkles, CheckCircle2, Clock, ShieldCheck, Zap, Maximize2, Minimize2, Monitor, BarChart2, LogIn, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function StatCard({ 
  label, 
  value, 
  colorClass, 
  isActive, 
  onClick 
}: { 
  label: string, 
  value: number, 
  colorClass: string, 
  isActive?: boolean, 
  onClick?: () => void 
}) {
  return (
    <div 
      onClick={onClick}
      className={`rounded-xl p-4 border soft-shadow flex flex-col justify-center min-h-[96px] w-full min-w-0 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-95 ${
        isActive 
          ? "bg-primary/5 border-primary ring-2 ring-primary/30" 
          : "bg-surface border-outline-variant/50 hover:border-primary/40"
      }`}
      title={`Click to filter by ${label}`}
    >
      <div className="flex justify-between items-center mb-1">
        <p className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider truncate font-semibold">{label}</p>
        {isActive && <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
      </div>
      <div className="overflow-hidden relative h-[32px]">
        <AnimatePresence mode="popLayout">
          <motion.p
            key={value}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`font-headline-md text-2xl font-bold absolute ${colorClass}`}
          >
            {value}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

function DashboardContent() {
  const { user, signIn, signUp, signOut } = useAuth();

  const {
    accounts,
    rawAccounts,
    isLoaded: isAccountsLoaded,
    duplicateCount,
    addAccount,
    updateAccount,
    deleteAccount,
    duplicateAccount,
    batchDelete,
    batchUpdateTier,
    batchUpdateResetType,
    removeDuplicates,
    setAllAccounts,
  } = useAccounts(user?.id);

  const {
    isExpanded,
    toggleSidebar,
    isMobileOpen,
    toggleMobileSidebar,
    closeMobileSidebar,
    isLoaded: isSidebarLoaded,
  } = useSidebar();

  const { name: profileName, avatar: profileAvatar, isLoaded: isProfileLoaded, updateProfile } = useProfile();

  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<"dashboard" | "analytics">("dashboard");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountWithStatus | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Single Account Fullscreen Inspector state
  const [fullscreenAccount, setFullscreenAccount] = useState<AccountWithStatus | null>(null);
  const [isFullscreenInspectorOpen, setIsFullscreenInspectorOpen] = useState(false);

  // Full Workspace Command Center Fullscreen State
  const [isWorkspaceFullscreen, setIsWorkspaceFullscreen] = useState(false);

  const [deleteDialogState, setDeleteDialogState] = useState<{ isOpen: boolean; id: string | null }>({
    isOpen: false,
    id: null,
  });
  
  const [globalFilter, setGlobalFilter] = useState("");
  const [premiumFilter, setPremiumFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [resetTypeFilter, setResetTypeFilter] = useState<string>("all");
  const [lowLimitFilterOnly, setLowLimitFilterOnly] = useState<boolean>(false);
  
  // NEW: 50%+ Capacity Limit Filter state
  const [capacityFilter, setCapacityFilter] = useState<"all" | "high50" | "low50">("all");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut Esc to exit workspace fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isWorkspaceFullscreen) {
        setIsWorkspaceFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isWorkspaceFullscreen]);

  // Overall Statistics calculated from ALL accounts
  const totalStats = useMemo(() => {
    return {
      total: accounts.length,
      ready: accounts.filter((a) => a.readyStatus === "Ready").length,
      waiting: accounts.filter((a) => a.readyStatus === "Waiting").length,
      premium: accounts.filter((a) => a.isPremium).length,
      daily: accounts.filter((a) => a.limitResetType === "Daily" || !a.limitResetType).length,
      weekly: accounts.filter((a) => a.limitResetType === "Weekly").length,
      lowLimit: accounts.filter((a) => (a.limitResetType === "Daily" || !a.limitResetType) && (a.weeklyLimit ?? 0) < 20).length,
      high50: accounts.filter((a) => (a.weeklyLimit ?? 0) >= 50).length,
      low50: accounts.filter((a) => (a.weeklyLimit ?? 0) < 50).length,
    };
  }, [accounts]);

  // Filter accounts for table display according to applied condition
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      if (premiumFilter !== "all") {
        const isPremium = premiumFilter === "premium";
        if (acc.isPremium !== isPremium) return false;
      }
      if (statusFilter !== "all") {
        if (acc.readyStatus.toLowerCase() !== statusFilter) return false;
      }
      if (resetTypeFilter !== "all") {
        const type = acc.limitResetType || "Daily";
        if (type.toLowerCase() !== resetTypeFilter) return false;
      }
      if (lowLimitFilterOnly) {
        const isDaily = (acc.limitResetType || "Daily") === "Daily";
        if (!isDaily || (acc.weeklyLimit ?? 0) >= 20) return false;
      }
      if (capacityFilter === "high50") {
        if ((acc.weeklyLimit ?? 0) < 50) return false;
      } else if (capacityFilter === "low50") {
        if ((acc.weeklyLimit ?? 0) >= 50) return false;
      }
      return true;
    });
  }, [accounts, premiumFilter, statusFilter, resetTypeFilter, lowLimitFilterOnly, capacityFilter]);

  useKeyboardShortcuts({
    onNew: () => setIsAddModalOpen(true),
    onSearch: () => document.getElementById("search-input")?.focus(),
    onExport: () => handleExport(),
  });

  const handleExport = () => {
    if (rawAccounts.length === 0) {
      addToast("No accounts to export", "error");
      return;
    }
    exportToCSV(rawAccounts);
    addToast("CSV Exported successfully", "success");
  };

  const handleBatchExport = (selectedAccounts: any[]) => {
    if (selectedAccounts.length === 0) return;
    exportToCSV(selectedAccounts, `selected_accounts_${selectedAccounts.length}.csv`);
    addToast(`Exported ${selectedAccounts.length} selected account${selectedAccounts.length > 1 ? "s" : ""} to CSV`, "success");
  };

  const handleRemoveDuplicates = () => {
    const count = removeDuplicates();
    if (count > 0) {
      addToast(`Removed ${count} duplicate account${count > 1 ? "s" : ""}`, "success");
    } else {
      addToast("No duplicate accounts found", "info");
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const { validAccounts, errors } = parseCSV(text);
      
      if (validAccounts.length > 0) {
        setAllAccounts([...rawAccounts, ...validAccounts]);
        addToast(`Imported ${validAccounts.length} accounts successfully`, "success");
      } else if (errors.length > 0) {
        addToast(`Import failed: ${errors[0]}`, "error");
      }
      
      if (errors.length > 0 && validAccounts.length > 0) {
        addToast(`Warning: ${errors.length} invalid rows skipped`, "error");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCopyEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      addToast("Email copied & Portal link ready!", "success");
    } catch (err) {
      addToast("Failed to copy email", "error");
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteDialogState.id) {
      deleteAccount(deleteDialogState.id);
      addToast("Account deleted", "success");
    }
  };

  const handleOpenEdit = (acc: AccountWithStatus) => {
    setEditingAccount(acc);
    setIsEditModalOpen(true);
  };

  const handleOpenFullscreenInspector = (acc: AccountWithStatus) => {
    setFullscreenAccount(acc);
    setIsFullscreenInspectorOpen(true);
  };

  if (!isAccountsLoaded || !isSidebarLoaded || !isProfileLoaded) return <div className="min-h-screen flex items-center justify-center font-medium text-on-surface-variant">Loading...</div>;

  return (
    <div className="bg-background text-on-surface font-body-md antialiased h-screen w-screen overflow-hidden flex">
      
      {/* Hidden File Input for CSV Import */}
      <input
        type="file"
        accept=".csv,text/csv"
        ref={fileInputRef}
        className="hidden"
        onChange={handleImport}
      />

      {/* FULLSCREEN WORKSPACE COMMAND CENTER OVERLAY */}
      <AnimatePresence>
        {isWorkspaceFullscreen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="fixed inset-0 z-[100] bg-background flex flex-col p-3 sm:p-5 h-screen w-screen overflow-hidden"
          >
            {/* Clean Minimal Fullscreen Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-surface p-3.5 rounded-xl border border-outline-variant/60 shadow-md mb-3 shrink-0">
              
              {/* Left Side: Filter Pill Chips Bar */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-hide">
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider shrink-0 mr-1 hidden md:inline">
                  Filter:
                </span>
                <button
                  onClick={() => {
                    setStatusFilter("all");
                    setPremiumFilter("all");
                    setResetTypeFilter("all");
                    setLowLimitFilterOnly(false);
                    setCapacityFilter("all");
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    statusFilter === "all" && premiumFilter === "all" && resetTypeFilter === "all" && !lowLimitFilterOnly && capacityFilter === "all"
                      ? "bg-primary text-on-primary shadow-sm"
                      : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  All ({totalStats.total})
                </button>

                {/* 50%+ Capacity Filter Pill */}
                <button
                  onClick={() => setCapacityFilter(capacityFilter === "high50" ? "all" : "high50")}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
                    capacityFilter === "high50"
                      ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300"
                      : "bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100"
                  }`}
                >
                  📊 ≥ 50% Limit ({totalStats.high50})
                </button>

                <button
                  onClick={() => setCapacityFilter(capacityFilter === "low50" ? "all" : "low50")}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
                    capacityFilter === "low50"
                      ? "bg-rose-600 text-white shadow-sm ring-2 ring-rose-300"
                      : "bg-rose-50 text-rose-800 border border-rose-300 hover:bg-rose-100"
                  }`}
                >
                  📉 &lt; 50% Limit ({totalStats.low50})
                </button>

                <button
                  onClick={() => {
                    setStatusFilter("ready");
                    setLowLimitFilterOnly(false);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    statusFilter === "ready" && !lowLimitFilterOnly
                      ? "bg-[#006c49] text-white shadow-sm"
                      : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  🟢 Ready ({totalStats.ready})
                </button>
                <button
                  onClick={() => {
                    setStatusFilter("waiting");
                    setLowLimitFilterOnly(false);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    statusFilter === "waiting" && !lowLimitFilterOnly
                      ? "bg-amber-600 text-white shadow-sm"
                      : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  ⏳ Waiting ({totalStats.waiting})
                </button>
                <button
                  onClick={() => setLowLimitFilterOnly(!lowLimitFilterOnly)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    lowLimitFilterOnly
                      ? "bg-amber-700 text-white shadow-sm ring-2 ring-amber-400"
                      : "bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100"
                  }`}
                >
                  ⚠️ Limit Low ({totalStats.lowLimit})
                </button>
                <button
                  onClick={() => setResetTypeFilter(resetTypeFilter === "daily" ? "all" : "daily")}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    resetTypeFilter === "daily"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100"
                  }`}
                >
                  ⚡ Daily Reset ({totalStats.daily})
                </button>
                <button
                  onClick={() => setResetTypeFilter(resetTypeFilter === "weekly" ? "all" : "weekly")}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    resetTypeFilter === "weekly"
                      ? "bg-purple-600 text-white shadow-sm"
                      : "bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100"
                  }`}
                >
                  📅 Weekly Reset ({totalStats.weekly})
                </button>
              </div>

              {/* Right Side: Search Input with Search Button + Exit Fullscreen Button */}
              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                {/* Search Bar with Search Button */}
                <div className="flex items-center bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary/20">
                  <input
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addToast(`Search applied: "${globalFilter}"`, "info");
                    }}
                    className="pl-3 pr-2 py-1.5 text-xs sm:text-sm bg-transparent outline-none w-36 sm:w-48 font-medium"
                    placeholder="Search accounts..."
                    type="text"
                  />
                  <button 
                    onClick={() => addToast(`Search applied: "${globalFilter}"`, "info")}
                    className="px-2.5 py-1.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface border-l border-outline-variant/40 transition-colors flex items-center gap-1 text-xs font-semibold"
                    title="Search"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Search</span>
                  </button>
                </div>

                {/* Exit Fullscreen Button */}
                <button
                  onClick={() => setIsWorkspaceFullscreen(false)}
                  className="px-3.5 py-1.5 bg-primary-container text-on-primary font-bold rounded-xl hover:bg-primary-container/90 transition-colors shadow-sm flex items-center gap-1.5 text-xs sm:text-sm shrink-0"
                  title="Exit Fullscreen Mode"
                >
                  <Minimize2 className="w-4 h-4" />
                  Exit Fullscreen
                </button>
              </div>
            </div>

            {/* Main Scrollable Fluid Table in Fullscreen */}
            <div className="flex-1 min-h-0 w-full overflow-hidden flex flex-col">
              <AccountTable
                data={filteredAccounts}
                globalFilter={globalFilter}
                isWorkspaceFullscreen={true}
                onToggleWorkspaceFullscreen={() => setIsWorkspaceFullscreen(false)}
                onUpdate={(id, updates) => {
                  updateAccount(id, updates);
                  addToast("Account updated", "success");
                }}
                onDelete={(id) => setDeleteDialogState({ isOpen: true, id })}
                onDuplicate={(id) => {
                  duplicateAccount(id);
                  addToast("Account duplicated", "success");
                }}
                onBatchDelete={(ids) => {
                  batchDelete(ids);
                  addToast(`Deleted ${ids.length} accounts`, "success");
                }}
                onBatchUpdateTier={(ids, isPremium) => {
                  batchUpdateTier(ids, isPremium);
                  addToast(`Updated tier for ${ids.length} accounts`, "success");
                }}
                onBatchUpdateResetType={(ids, resetType) => {
                  batchUpdateResetType(ids, resetType);
                  addToast(`Updated reset frequency for ${ids.length} accounts`, "success");
                }}
                onBatchExport={handleBatchExport}
                onCopyEmail={handleCopyEmail}
                onEditAccount={handleOpenEdit}
                onOpenFullscreen={handleOpenFullscreenInspector}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeMobileSidebar}
            className="fixed inset-0 z-40 bg-on-background/30 backdrop-blur-sm md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Navigation Drawer (SideNav) */}
      <nav 
        className={`h-screen bg-white/90 dark:bg-inverse-surface/90 backdrop-blur-xl border-r border-outline-variant dark:border-outline shadow-sm flex flex-col py-6 z-40 shrink-0 transition-all duration-300 ease-in-out
          ${isExpanded ? 'w-[250px]' : 'w-[70px]'}
          ${isMobileOpen ? 'fixed left-0 top-0 translate-x-0 z-50' : 'hidden md:flex'}
        `}
      >
        {/* Profile Card in Drawer */}
        <div 
          onClick={() => setIsProfileModalOpen(true)}
          className={`px-3 mb-6 flex items-center ${isExpanded ? 'gap-3 hover:bg-surface-container-low p-2 rounded-xl border border-transparent hover:border-outline-variant/40 transition-colors' : 'justify-center'} overflow-hidden cursor-pointer group`}
          title="Click to edit profile"
        >
          <div className="relative shrink-0">
            <img
              className="w-10 h-10 rounded-full object-cover border-2 border-primary/20 group-hover:border-primary transition-colors"
              src={profileAvatar}
              alt={profileName}
            />
            <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-4 h-4 text-white" />
            </div>
          </div>
          {isExpanded && (
            <div className="min-w-0 flex-1">
              <h2 className="font-label-md text-sm font-bold text-on-surface truncate group-hover:text-primary transition-colors">{profileName}</h2>
              <p className="font-label-sm text-[11px] text-on-surface-variant truncate">Enterprise Admin</p>
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col gap-1 px-2">
          <a 
            onClick={() => setActiveTab("dashboard")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all active:scale-95 group text-sm ${
              activeTab === "dashboard" ? "border-l-4 border-primary bg-primary/5 text-primary font-semibold" : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low ml-[4px]"
            }`} 
            title="Dashboard"
          >
            <LayoutDashboard className="w-5 h-5 shrink-0" />
            {isExpanded && <span className="truncate">Dashboard</span>}
          </a>
          <a 
            onClick={() => setActiveTab("analytics")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all active:scale-95 group text-sm ${
              activeTab === "analytics" ? "border-l-4 border-primary bg-primary/5 text-primary font-semibold" : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low ml-[4px]"
            }`} 
            title="Analytics"
          >
            <LineChart className="w-5 h-5 shrink-0" />
            {isExpanded && <span className="truncate">Analytics & Insights</span>}
          </a>
          <a 
            onClick={() => setIsWorkspaceFullscreen(true)}
            className="flex items-center gap-3 px-3 py-2.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-all duration-200 rounded-lg ml-[4px] cursor-pointer active:scale-95 group text-sm" 
            title="Fullscreen Command Center"
          >
            <Monitor className="w-5 h-5 shrink-0 text-primary" />
            {isExpanded && <span className="truncate font-semibold text-primary">Command Center</span>}
          </a>
          <a 
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center gap-3 px-3 py-2.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-all duration-200 rounded-lg ml-[4px] cursor-pointer active:scale-95 group text-sm" 
            title="Profile Settings"
          >
            <Settings className="w-5 h-5 shrink-0" />
            {isExpanded && <span className="truncate">Profile Settings</span>}
          </a>
        </div>

        <div className="mt-auto px-4 overflow-hidden">
          <a className={`flex items-center ${isExpanded ? 'gap-3 px-2' : 'justify-center'} py-2.5 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer active:scale-95 text-sm`} title="Help & Support">
            <HelpCircle className="w-5 h-5 shrink-0" />
            {isExpanded && <span className="truncate font-medium">Help & Support</span>}
          </a>
          {isExpanded && <p className="text-[11px] font-label-sm text-outline mt-1 px-2 truncate">v2.6.0</p>}
        </div>
      </nav>

      {/* Main Fluid Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* Sticky Header */}
        <header className="sticky top-0 z-30 w-full bg-white/90 dark:bg-inverse-surface/90 backdrop-blur-xl border-b border-outline-variant dark:border-outline shadow-sm flex items-center justify-between h-16 px-3 sm:px-6 shrink-0 gap-2 sm:gap-4">
          
          {/* Left Header Section: Hamburger + App Title */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button 
              onClick={() => {
                if (window.innerWidth < 768) toggleMobileSidebar();
                else toggleSidebar();
              }}
              className="text-on-surface-variant hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-surface-container-low active:scale-95 shrink-0"
              title="Toggle Sidebar"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="font-bold text-base lg:text-lg text-primary dark:text-primary-fixed-dim truncate hidden md:block">
              Account Ready Checker
            </h1>
          </div>

          {/* Center Search Input */}
          <div className="relative flex-1 max-w-[170px] sm:max-w-[280px] lg:max-w-[320px] ml-1 sm:ml-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-outline w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <input
              id="search-input"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full pl-8 sm:pl-9 pr-2.5 py-1.5 bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs sm:text-sm outline-none transition-all"
              placeholder="Search accounts..."
              type="text"
            />
          </div>
          
          {/* Right Header Action Group */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            
            {/* Desktop Full Action Buttons */}
            <div className="hidden xl:flex items-center gap-2">
              <button
                onClick={handleRemoveDuplicates}
                className={`px-2.5 py-1.5 border rounded-lg transition-colors shadow-sm flex items-center gap-1.5 text-xs font-medium ${
                  duplicateCount > 0
                    ? "border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                    : "border-outline-variant text-on-surface hover:bg-surface-container-low"
                }`}
                title={duplicateCount > 0 ? `Delete ${duplicateCount} Duplicate Account(s)` : "Delete Duplicate Accounts"}
              >
                <UserX className="w-3.5 h-3.5" />
                <span>Clean Duplicates</span>
                {duplicateCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-600 text-white font-bold">
                    {duplicateCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1.5 border border-outline-variant text-on-surface rounded-lg hover:bg-surface-container-low transition-colors shadow-sm flex items-center gap-1.5 text-xs font-medium"
                title="Import Accounts from CSV"
              >
                <Upload className="w-3.5 h-3.5" />
                Import
              </button>
              <button
                onClick={handleExport}
                className="px-2.5 py-1.5 border border-outline-variant text-on-surface rounded-lg hover:bg-surface-container-low transition-colors shadow-sm flex items-center gap-1.5 text-xs font-medium"
                title="Export Accounts to CSV"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-primary-container text-on-primary rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-primary-container/90 transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Add Account
              </button>
            </div>

            {/* Medium/Laptop & Mobile Compact Action Buttons */}
            <div className="flex xl:hidden items-center gap-1 sm:gap-1.5">
              <button
                onClick={handleRemoveDuplicates}
                className={`p-1.5 sm:p-2 border rounded-lg transition-colors shadow-sm relative ${
                  duplicateCount > 0 ? "border-red-300 bg-red-50 text-red-700" : "border-outline-variant text-on-surface hover:bg-surface-container-low"
                }`}
                title="Delete Duplicates"
              >
                <UserX className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {duplicateCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {duplicateCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 sm:p-2 border border-outline-variant text-on-surface rounded-lg hover:bg-surface-container-low transition-colors shadow-sm"
                title="Import CSV"
              >
                <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <button
                onClick={handleExport}
                className="p-1.5 sm:p-2 border border-outline-variant text-on-surface rounded-lg hover:bg-surface-container-low transition-colors shadow-sm"
                title="Export CSV"
              >
                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-primary-container text-on-primary rounded-lg p-1.5 sm:p-2 hover:bg-primary-container/90 transition-colors shadow-sm flex items-center justify-center"
                title="Add Account"
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>

            <div className="w-px h-6 bg-outline-variant mx-0.5 hidden sm:block" />
            
            {/* User Auth Action Group */}
            {user ? (
              <div className="flex items-center gap-2">
                <span 
                  className="hidden md:inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 truncate max-w-[150px]" 
                  title={user.email || ""}
                >
                  {user.email}
                </span>
                <button
                  onClick={async () => {
                    await signOut();
                    addToast("Signed out successfully", "info");
                  }}
                  className="p-1.5 sm:px-2.5 sm:py-1.5 border border-outline-variant hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-on-surface rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="px-2.5 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-bold hover:bg-primary/90 transition-all shadow-sm flex items-center gap-1.5"
                title="Sign In or Register"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            )}

            {/* Header Avatar Profile Icon */}
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="relative group rounded-full cursor-pointer focus:ring-2 focus:ring-primary shrink-0"
              title={`Edit Profile (${profileName})`}
            >
              <img
                src={profileAvatar}
                alt={profileName}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border-2 border-outline-variant group-hover:border-primary transition-colors"
              />
            </button>
          </div>
        </header>

        {/* Main Dashboard Workspace Body */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 flex flex-col gap-5 sm:gap-6 w-full max-w-[2560px] mx-auto custom-scrollbar">
          
          {activeTab === "analytics" ? (
            /* Analytics View Screen */
            <div className="flex flex-col gap-6 animate-in fade-in duration-200">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-on-surface">Analytics & Capacity Insights</h2>
                  <p className="text-xs text-on-surface-variant">Real-time health breakdown and utilization metrics</p>
                </div>
                <button 
                  onClick={() => setActiveTab("dashboard")} 
                  className="px-3 py-1.5 text-xs font-semibold bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                >
                  Back to Accounts Table
                </button>
              </div>

              {/* Analytics Metric Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-surface rounded-xl p-5 border border-outline-variant/50 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Availability Ratio</span>
                      <CheckCircle2 className="w-5 h-5 text-[#006c49]" />
                    </div>
                    <p className="text-3xl font-bold text-on-surface">
                      {totalStats.total > 0 ? Math.round((totalStats.ready / totalStats.total) * 100) : 0}%
                    </p>
                    <p className="text-xs text-on-surface-variant mt-1">{totalStats.ready} of {totalStats.total} accounts ready for deployment</p>
                  </div>
                  <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden mt-4">
                    <div 
                      className="h-full bg-[#006c49] rounded-full transition-all duration-500" 
                      style={{ width: `${totalStats.total > 0 ? (totalStats.ready / totalStats.total) * 100 : 0}%` }} 
                    />
                  </div>
                </div>

                <div className="bg-surface rounded-xl p-5 border border-outline-variant/50 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">High Limit (≥ 50%)</span>
                      <BarChart2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <p className="text-3xl font-bold text-on-surface">
                      {totalStats.total > 0 ? Math.round((totalStats.high50 / totalStats.total) * 100) : 0}%
                    </p>
                    <p className="text-xs text-on-surface-variant mt-1">{totalStats.high50} accounts with ≥ 50% limit capacity</p>
                  </div>
                  <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden mt-4">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                      style={{ width: `${totalStats.total > 0 ? (totalStats.high50 / totalStats.total) * 100 : 0}%` }} 
                    />
                  </div>
                </div>

                <div className="bg-surface rounded-xl p-5 border border-outline-variant/50 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Premium Tier Adoption</span>
                      <ShieldCheck className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-3xl font-bold text-on-surface">
                      {totalStats.total > 0 ? Math.round((totalStats.premium / totalStats.total) * 100) : 0}%
                    </p>
                    <p className="text-xs text-on-surface-variant mt-1">{totalStats.premium} Premium vs {totalStats.total - totalStats.premium} Standard accounts</p>
                  </div>
                  <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden mt-4">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-500" 
                      style={{ width: `${totalStats.total > 0 ? (totalStats.premium / totalStats.total) * 100 : 0}%` }} 
                    />
                  </div>
                </div>

                <div className="bg-surface rounded-xl p-5 border border-outline-variant/50 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Low Limit Alert Health</span>
                      <Zap className="w-5 h-5 text-amber-600" />
                    </div>
                    <p className="text-3xl font-bold text-on-surface">{totalStats.lowLimit}</p>
                    <p className="text-xs text-on-surface-variant mt-1">Accounts currently flagged with low weekly limit (&lt;20)</p>
                  </div>
                  <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden mt-4">
                    <div 
                      className="h-full bg-amber-500 rounded-full transition-all duration-500" 
                      style={{ width: `${totalStats.total > 0 ? (totalStats.lowLimit / totalStats.total) * 100 : 0}%` }} 
                    />
                  </div>
                </div>
              </div>

              {/* Reset Type Distribution Card */}
              <div className="bg-surface rounded-xl p-6 border border-outline-variant/50 shadow-sm flex flex-col gap-4">
                <h3 className="font-bold text-on-surface text-base">Reset Frequency Distribution</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 flex flex-col justify-between">
                    <span className="text-xs font-semibold text-blue-800 dark:text-blue-300">Daily Limit Reset</span>
                    <span className="text-2xl font-bold text-blue-900 dark:text-blue-200 mt-2">{totalStats.daily} Accounts</span>
                    <span className="text-[11px] text-blue-700/80 dark:text-blue-300/80 mt-1">Triggers low-limit warning when weekly limit &lt; 20</span>
                  </div>
                  <div className="p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/50 flex flex-col justify-between">
                    <span className="text-xs font-semibold text-purple-800 dark:text-purple-300">Weekly Limit Reset</span>
                    <span className="text-2xl font-bold text-purple-900 dark:text-purple-200 mt-2">{totalStats.weekly} Accounts</span>
                    <span className="text-[11px] text-purple-700/80 dark:text-purple-300/80 mt-1">Full 7-day availability cycle</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Dashboard View */
            <>
              {/* Interactive Stat Cards Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 shrink-0">
                <StatCard 
                  label="Total Accounts" 
                  value={totalStats.total} 
                  colorClass="text-on-surface"
                  isActive={statusFilter === "all" && premiumFilter === "all" && resetTypeFilter === "all" && !lowLimitFilterOnly && capacityFilter === "all"}
                  onClick={() => {
                    setStatusFilter("all");
                    setPremiumFilter("all");
                    setResetTypeFilter("all");
                    setLowLimitFilterOnly(false);
                    setCapacityFilter("all");
                    addToast("Showing all accounts", "info");
                  }}
                />
                <StatCard 
                  label="Ready" 
                  value={totalStats.ready} 
                  colorClass="text-[#006c49]"
                  isActive={statusFilter === "ready" && !lowLimitFilterOnly}
                  onClick={() => {
                    setStatusFilter("ready");
                    if (premiumFilter === "premium") setPremiumFilter("all");
                    setLowLimitFilterOnly(false);
                    addToast("Filtered by Ready accounts", "info");
                  }}
                />
                <StatCard 
                  label="Waiting" 
                  value={totalStats.waiting} 
                  colorClass="text-[#885500]"
                  isActive={statusFilter === "waiting" && !lowLimitFilterOnly}
                  onClick={() => {
                    setStatusFilter("waiting");
                    if (premiumFilter === "premium") setPremiumFilter("all");
                    setLowLimitFilterOnly(false);
                    addToast("Filtered by Waiting accounts", "info");
                  }}
                />
                <StatCard 
                  label="Premium" 
                  value={totalStats.premium} 
                  colorClass="text-primary"
                  isActive={premiumFilter === "premium" && !lowLimitFilterOnly}
                  onClick={() => {
                    setPremiumFilter("premium");
                    setStatusFilter("all");
                    setLowLimitFilterOnly(false);
                    addToast("Filtered by Premium accounts", "info");
                  }}
                />
              </div>

              {/* Dedicated Capacity Limit Filter Section */}
              <div className="bg-surface rounded-xl p-3.5 border border-outline-variant/60 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-lg">
                    <BarChart2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs sm:text-sm text-on-surface flex items-center gap-2">
                      Limit Capacity Filter
                      {capacityFilter !== "all" && (
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                          {capacityFilter === "high50" ? "≥ 50% Limit Filter Active" : "< 50% Limit Filter Active"}
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-on-surface-variant">Filter accounts by capacity utilization thresholds</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-surface-container-low p-1 rounded-xl border border-outline-variant/30 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      setCapacityFilter("all");
                      addToast("Capacity filter cleared", "info");
                    }}
                    className={`flex-1 sm:flex-initial px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      capacityFilter === "all"
                        ? "bg-white dark:bg-inverse-surface text-on-surface shadow-sm"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    All Capacity ({totalStats.total})
                  </button>
                  <button
                    onClick={() => {
                      setCapacityFilter("high50");
                      addToast("Showing accounts with ≥ 50% limit capacity", "info");
                    }}
                    className={`flex-1 sm:flex-initial px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                      capacityFilter === "high50"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100/50"
                    }`}
                  >
                    📊 ≥ 50% Limit ({totalStats.high50})
                  </button>
                  <button
                    onClick={() => {
                      setCapacityFilter("low50");
                      addToast("Showing accounts with < 50% limit capacity", "info");
                    }}
                    className={`flex-1 sm:flex-initial px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                      capacityFilter === "low50"
                        ? "bg-rose-600 text-white shadow-sm"
                        : "text-rose-700 dark:text-rose-400 hover:bg-rose-100/50"
                    }`}
                  >
                    📉 &lt; 50% Limit ({totalStats.low50})
                  </button>
                </div>
              </div>

              {/* Quick Filter Pill Chips Bar */}
              <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-hide shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                    <Filter className="w-3 h-3" /> Quick Filters:
                  </span>
                  <button
                    onClick={() => {
                      setStatusFilter("all");
                      setPremiumFilter("all");
                      setResetTypeFilter("all");
                      setLowLimitFilterOnly(false);
                      setCapacityFilter("all");
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                      statusFilter === "all" && premiumFilter === "all" && resetTypeFilter === "all" && !lowLimitFilterOnly && capacityFilter === "all"
                        ? "bg-primary text-on-primary shadow-sm"
                        : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                  >
                    All ({totalStats.total})
                  </button>
                  <button
                    onClick={() => setCapacityFilter(capacityFilter === "high50" ? "all" : "high50")}
                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
                      capacityFilter === "high50"
                        ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300"
                        : "bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100"
                    }`}
                  >
                    📊 ≥ 50% Limit ({totalStats.high50})
                  </button>
                  <button
                    onClick={() => {
                      setStatusFilter("ready");
                      setLowLimitFilterOnly(false);
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                      statusFilter === "ready" && !lowLimitFilterOnly
                        ? "bg-[#006c49] text-white shadow-sm"
                        : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                  >
                    🟢 Ready ({totalStats.ready})
                  </button>
                  <button
                    onClick={() => {
                      setStatusFilter("waiting");
                      setLowLimitFilterOnly(false);
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                      statusFilter === "waiting" && !lowLimitFilterOnly
                        ? "bg-amber-600 text-white shadow-sm"
                        : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                  >
                    ⏳ Waiting ({totalStats.waiting})
                  </button>
                  <button
                    onClick={() => setLowLimitFilterOnly(!lowLimitFilterOnly)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                      lowLimitFilterOnly
                        ? "bg-amber-700 text-white shadow-sm ring-2 ring-amber-400"
                        : "bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100"
                    }`}
                  >
                    ⚠️ Limit Low ({totalStats.lowLimit})
                  </button>
                  <button
                    onClick={() => setResetTypeFilter(resetTypeFilter === "daily" ? "all" : "daily")}
                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                      resetTypeFilter === "daily"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100"
                    }`}
                  >
                    ⚡ Daily Reset ({totalStats.daily})
                  </button>
                  <button
                    onClick={() => setResetTypeFilter(resetTypeFilter === "weekly" ? "all" : "weekly")}
                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                      resetTypeFilter === "weekly"
                        ? "bg-purple-600 text-white shadow-sm"
                        : "bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100"
                    }`}
                  >
                    📅 Weekly Reset ({totalStats.weekly})
                  </button>
                </div>
              </div>

              {/* Main Account Data Table Component */}
              <AccountTable
                data={filteredAccounts}
                globalFilter={globalFilter}
                isWorkspaceFullscreen={false}
                onToggleWorkspaceFullscreen={() => setIsWorkspaceFullscreen(true)}
                onUpdate={(id, updates) => {
                  updateAccount(id, updates);
                  addToast("Account updated", "success");
                }}
                onDelete={(id) => setDeleteDialogState({ isOpen: true, id })}
                onDuplicate={(id) => {
                  duplicateAccount(id);
                  addToast("Account duplicated", "success");
                }}
                onBatchDelete={(ids) => {
                  batchDelete(ids);
                  addToast(`Deleted ${ids.length} accounts`, "success");
                }}
                onBatchUpdateTier={(ids, isPremium) => {
                  batchUpdateTier(ids, isPremium);
                  addToast(`Updated tier for ${ids.length} accounts`, "success");
                }}
                onBatchUpdateResetType={(ids, resetType) => {
                  batchUpdateResetType(ids, resetType);
                  addToast(`Updated reset frequency for ${ids.length} accounts`, "success");
                }}
                onBatchExport={handleBatchExport}
                onCopyEmail={handleCopyEmail}
                onEditAccount={handleOpenEdit}
                onOpenFullscreen={handleOpenFullscreenInspector}
              />
            </>
          )}
        </main>
      </div>

      <AddAccountModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={(acc) => {
          addAccount(acc);
          addToast("Account added successfully", "success");
        }}
      />

      <EditAccountModal
        account={editingAccount}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingAccount(null);
        }}
        onSave={(id, updates) => {
          updateAccount(id, updates);
          addToast("Account details updated", "success");
        }}
      />

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentName={profileName}
        currentAvatar={profileAvatar}
        onSave={(newName, newAvatar) => {
          updateProfile(newName, newAvatar);
          addToast("Profile updated successfully", "success");
        }}
      />

      <FullscreenAccountModal
        account={fullscreenAccount}
        accountsList={filteredAccounts}
        isOpen={isFullscreenInspectorOpen}
        onClose={() => {
          setIsFullscreenInspectorOpen(false);
          setFullscreenAccount(null);
        }}
        onUpdate={(id, updates) => {
          updateAccount(id, updates);
          addToast("Account details updated", "success");
        }}
        onDelete={(id) => setDeleteDialogState({ isOpen: true, id })}
        onDuplicate={(id) => {
          duplicateAccount(id);
          addToast("Account duplicated", "success");
        }}
        onCopyEmail={handleCopyEmail}
        onSelectAccount={(acc) => setFullscreenAccount(acc)}
        onEditAccount={handleOpenEdit}
      />

      <DeleteDialog
        isOpen={deleteDialogState.isOpen}
        onClose={() => setDeleteDialogState({ isOpen: false, id: null })}
        onConfirm={handleDeleteConfirm}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSignIn={signIn}
        onSignUp={signUp}
      />
    </div>
  );
}

export default function Page() {
  return (
    <ToastProvider>
      <DashboardContent />
    </ToastProvider>
  );
}
