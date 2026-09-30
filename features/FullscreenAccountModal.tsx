"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AccountWithStatus, Account } from "@/types";
import { formatCountdown, formatReadyAt } from "@/utils/date";
import { 
  X, 
  Copy, 
  ExternalLink, 
  Trash2, 
  CopyPlus, 
  Pencil, 
  ChevronLeft, 
  ChevronRight, 
  ShieldCheck, 
  Zap, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  Maximize2 
} from "lucide-react";

interface FullscreenAccountModalProps {
  account: AccountWithStatus | null;
  accountsList: AccountWithStatus[];
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, updatedFields: Partial<Account>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onCopyEmail: (email: string) => void;
  onSelectAccount: (account: AccountWithStatus) => void;
  onEditAccount: (account: AccountWithStatus) => void;
}

export function FullscreenAccountModal({
  account,
  accountsList,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  onDuplicate,
  onCopyEmail,
  onSelectAccount,
  onEditAccount,
}: FullscreenAccountModalProps) {
  
  // Keyboard Arrow Navigation (Left/Right to switch accounts, Esc to close)
  useEffect(() => {
    if (!isOpen || !account) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        navigateAccount(-1);
      } else if (e.key === "ArrowRight") {
        navigateAccount(1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, account, accountsList]);

  if (!account) return null;

  const currentIndex = accountsList.findIndex((a) => a.id === account.id);
  const totalCount = accountsList.length;

  const navigateAccount = (direction: number) => {
    if (currentIndex === -1 || totalCount === 0) return;
    let nextIndex = currentIndex + direction;
    if (nextIndex < 0) nextIndex = totalCount - 1;
    if (nextIndex >= totalCount) nextIndex = 0;
    onSelectAccount(accountsList[nextIndex]);
  };

  const isReady = account.readyStatus === "Ready";
  const resetType = account.limitResetType || "Daily";
  const isLimitLow = resetType === "Daily" && (account.weeklyLimit ?? 0) < 20;
  const formattedReady = formatReadyAt(account.readyAtDate);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-background text-on-surface flex flex-col overflow-hidden animate-in fade-in duration-200">
          
          {/* Fullscreen Modal Header */}
          <header className="px-6 py-4 border-b border-outline-variant/50 bg-surface flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Maximize2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-on-surface flex items-center gap-2">
                  Account Focus Inspector
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-surface-container-high text-on-surface-variant">
                    {currentIndex + 1} of {totalCount}
                  </span>
                </h2>
                <p className="text-xs text-on-surface-variant">Press Left/Right arrows to browse • Esc to exit</p>
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateAccount(-1)}
                className="p-2 border border-outline-variant rounded-lg hover:bg-surface-container-low transition-colors"
                title="Previous Account (Left Arrow)"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigateAccount(1)}
                className="p-2 border border-outline-variant rounded-lg hover:bg-surface-container-low transition-colors"
                title="Next Account (Right Arrow)"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <div className="w-px h-6 bg-outline-variant mx-1" />
              <button
                onClick={onClose}
                className="p-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-lg transition-colors font-semibold flex items-center gap-1 text-xs"
              >
                <X className="w-5 h-5" />
                Close Fullscreen
              </button>
            </div>
          </header>

          {/* Fullscreen Body Content */}
          <main className="flex-1 overflow-y-auto p-6 sm:p-10 flex flex-col gap-8 max-w-6xl mx-auto w-full custom-scrollbar">
            
            {/* Account Hero Card */}
            <div className="bg-surface rounded-2xl p-6 sm:p-8 border border-outline-variant/60 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
              <div className="flex flex-col gap-2 z-10">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    account.isPremium ? "bg-primary-fixed text-on-primary-fixed" : "bg-surface-variant text-on-surface-variant"
                  }`}>
                    {account.isPremium ? "⭐ Premium Tier" : "Standard Tier"}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    resetType === "Weekly" ? "bg-purple-100 text-purple-800 border border-purple-200" : "bg-blue-100 text-blue-800 border border-blue-200"
                  }`}>
                    ⚡ {resetType} Reset Cycle
                  </span>
                  {isLimitLow && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      ⚠️ Limit Low Alert
                    </span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight mt-1 select-all">
                  {account.email}
                </h1>
                <p className="text-xs text-on-surface-variant font-medium">Last Modified: {new Date(account.modifiedAt).toLocaleString()}</p>
              </div>

              {/* Ready / Waiting Hero Status Box */}
              <div className="flex flex-col items-start md:items-end gap-2 shrink-0 z-10 w-full md:w-auto">
                <div className={`px-6 py-3 rounded-2xl border flex items-center gap-3 ${
                  isReady ? "bg-[#ccfbf1]/60 border-[#0f766e]/30 text-[#0f766e]" : "bg-[#fef3c7]/60 border-[#b45309]/30 text-[#b45309]"
                }`}>
                  {isReady ? <CheckCircle2 className="w-8 h-8 shrink-0" /> : <Clock className="w-8 h-8 shrink-0 animate-spin" />}
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider block">Current Status</span>
                    <span className="text-xl font-extrabold">{isReady ? "🟢 Ready to Use" : "⏳ Waiting Duration"}</span>
                  </div>
                </div>

                {!isReady && account.timeRemaining && (
                  <div className="w-full md:w-64 bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/40 text-right">
                    <div className="flex justify-between items-center text-xs text-on-surface-variant font-semibold mb-1">
                      <span>Countdown Ticker</span>
                      <span className="font-mono text-amber-600 font-bold">{formatCountdown(account.timeRemaining)}</span>
                    </div>
                    {account.progressPercent !== undefined && (
                      <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-amber-500 rounded-full transition-all duration-1000" 
                          style={{ width: `${account.progressPercent}%` }} 
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Detailed Metric Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Card 1: Capacity & Limits */}
              <div className="bg-surface rounded-xl p-6 border border-outline-variant/50 shadow-sm flex flex-col gap-4">
                <div className="flex items-center gap-2 text-primary font-bold text-sm border-b border-outline-variant/30 pb-3">
                  <Zap className="w-5 h-5" />
                  <span>Limit Capacity Specs</span>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-on-surface-variant font-medium">Weekly Limit</span>
                    <span className="font-bold text-on-surface text-base">{account.weeklyLimit ?? 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-on-surface-variant font-medium">Daily Limit</span>
                    <span className="font-bold text-on-surface text-base">
                      {account.dailyLimit === "No Limit" ? (
                        <span className="px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700 font-bold border border-blue-200">
                          No Limit
                        </span>
                      ) : account.dailyLimit === "100%" ? (
                        <span className="px-2.5 py-0.5 rounded text-xs bg-emerald-100 text-emerald-800 font-extrabold border border-emerald-300 flex items-center gap-1">
                          100% ⚡ (Reset Complete)
                        </span>
                      ) : (
                        account.dailyLimit ?? 0
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-outline-variant/30">
                    <span className="text-on-surface-variant font-medium">Reset Frequency</span>
                    <span className="font-bold text-on-surface">{resetType}</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Checking Timeline */}
              <div className="bg-surface rounded-xl p-6 border border-outline-variant/50 shadow-sm flex flex-col gap-4">
                <div className="flex items-center gap-2 text-primary font-bold text-sm border-b border-outline-variant/30 pb-3">
                  <Calendar className="w-5 h-5" />
                  <span>Checking Timeline</span>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-on-surface-variant font-medium">Checking Date</span>
                    <span className="font-semibold text-on-surface">{account.checkingDate}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-on-surface-variant font-medium">Checking Time</span>
                    <span className="font-semibold text-on-surface">{account.checkingTime}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-outline-variant/30">
                    <span className="text-on-surface-variant font-medium">Reset Duration</span>
                    <span className="font-bold text-on-surface">{account.resetDuration}</span>
                  </div>
                </div>
              </div>

              {/* Card 3: Next Availability */}
              <div className="bg-surface rounded-xl p-6 border border-outline-variant/50 shadow-sm flex flex-col gap-4">
                <div className="flex items-center gap-2 text-primary font-bold text-sm border-b border-outline-variant/30 pb-3">
                  <Clock className="w-5 h-5" />
                  <span>Target Availability</span>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-on-surface-variant font-medium">Ready At Date</span>
                    <span className="font-bold text-on-surface">{formattedReady.date}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-on-surface-variant font-medium">Ready At Time</span>
                    <span className="font-bold text-on-surface">{formattedReady.time || "N/A"}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-outline-variant/30">
                    <span className="text-on-surface-variant font-medium">Account ID</span>
                    <span className="font-mono text-xs text-outline truncate max-w-[120px]">{account.id}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Bottom Actions Bar */}
            <div className="bg-surface rounded-2xl p-6 border border-outline-variant/60 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onCopyEmail(account.email)}
                  className="px-4 py-2.5 bg-primary-container text-on-primary font-bold rounded-xl hover:bg-primary-container/90 transition-colors shadow-sm flex items-center gap-2 text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  Copy Email & Open Portal
                </button>
                <button
                  onClick={() => onEditAccount(account)}
                  className="px-4 py-2.5 border border-outline-variant text-on-surface font-semibold rounded-xl hover:bg-surface-container-low transition-colors flex items-center gap-2 text-sm"
                >
                  <Pencil className="w-4 h-4" />
                  Edit Fields
                </button>
                <button
                  onClick={() => onDuplicate(account.id)}
                  className="px-4 py-2.5 border border-outline-variant text-on-surface font-semibold rounded-xl hover:bg-surface-container-low transition-colors flex items-center gap-2 text-sm"
                >
                  <CopyPlus className="w-4 h-4" />
                  Duplicate
                </button>
              </div>

              <button
                onClick={() => {
                  onDelete(account.id);
                  onClose();
                }}
                className="px-4 py-2.5 border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 font-semibold rounded-xl transition-colors flex items-center gap-2 text-sm"
              >
                <Trash2 className="w-4 h-4" />
                Delete Account
              </button>
            </div>
          </main>
        </div>
      )}
    </AnimatePresence>
  );
}
