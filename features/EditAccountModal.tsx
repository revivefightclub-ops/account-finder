"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AccountSchema, AccountWithStatus, Account } from "@/types";
import { z } from "zod";
import { AnimatePresence, motion } from "framer-motion";
import { parseDuration, formatDurationObj, calculateReadyAt, getStatusAndCountdown, formatCountdown, formatReadyAt } from "@/utils/date";

interface EditAccountModalProps {
  account: AccountWithStatus | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updatedFields: Partial<Account>) => void;
}

export function EditAccountModal({ account, isOpen, onClose, onSave }: EditAccountModalProps) {
  const [days, setDays] = useState<number>(0);
  const [hours, setHours] = useState<number>(1);
  const [minutes, setMinutes] = useState<number>(0);

  const [isDailyNoLimit, setIsDailyNoLimit] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof AccountSchema>>({
    resolver: zodResolver(AccountSchema),
  });

  // Pre-fill form when account opens
  useEffect(() => {
    if (account) {
      const resetType = account.limitResetType || "Daily";
      const isNoLimit = account.dailyLimit === "No Limit";
      setIsDailyNoLimit(isNoLimit);

      reset({
        id: account.id,
        email: account.email,
        isPremium: account.isPremium,
        weeklyLimit: account.weeklyLimit ?? 0,
        dailyLimit: isNoLimit ? "No Limit" : (account.dailyLimit ?? 0),
        limitResetType: resetType,
        checkingDate: account.checkingDate,
        checkingTime: account.checkingTime,
        resetDuration: account.resetDuration,
        modifiedAt: account.modifiedAt || Date.now(),
      });

      // Extract days, hours, and minutes from account.resetDuration
      const parsed = parseDuration(account.resetDuration);
      setDays(parsed.days);
      setHours(parsed.hours);
      setMinutes(parsed.minutes);
    }
  }, [account, reset]);

  const checkingDate = watch("checkingDate");
  const checkingTime = watch("checkingTime");
  const weeklyLimit = watch("weeklyLimit");
  const dailyLimit = watch("dailyLimit");
  const limitResetType = watch("limitResetType"); // "Daily" | "Weekly"

  const isLimitLow = (limitResetType === "Daily" || !limitResetType) && (weeklyLimit || 0) < 20;

  // Toggle No Limit for dailyLimit
  const handleDailyNoLimitToggle = (checked: boolean) => {
    setIsDailyNoLimit(checked);
    if (checked) {
      setValue("dailyLimit", "No Limit", { shouldValidate: true });
    } else {
      setValue("dailyLimit", 0, { shouldValidate: true });
    }
  };

  // When Limit Reset Frequency changes to Daily, reset days to 0
  useEffect(() => {
    if (limitResetType === "Daily") {
      setDays(0);
    }
  }, [limitResetType]);

  // Sync Days/Hours/Minutes state to resetDuration in form
  useEffect(() => {
    const effectiveDays = limitResetType === "Daily" ? 0 : days;
    const formattedDuration = formatDurationObj({ days: effectiveDays, hours, minutes });
    setValue("resetDuration", formattedDuration, { shouldValidate: true });
  }, [days, hours, minutes, limitResetType, setValue]);

  // Compute live Ready At and Availability Status preview
  const liveCalculation = useMemo(() => {
    const effectiveDays = limitResetType === "Daily" ? 0 : days;
    const durationStr = formatDurationObj({ days: effectiveDays, hours, minutes });
    const readyAt = calculateReadyAt(checkingDate, checkingTime, durationStr);
    const { status, countdown } = getStatusAndCountdown(readyAt);
    const formattedReadyAt = formatReadyAt(readyAt);

    return {
      durationStr,
      readyAtText: readyAt ? `${formattedReadyAt.date} at ${formattedReadyAt.time}` : "N/A",
      isReady: status === "Ready",
      countdownText: formatCountdown(countdown),
    };
  }, [checkingDate, checkingTime, days, hours, minutes, limitResetType]);

  const onSubmit = (data: z.infer<typeof AccountSchema>) => {
    if (!account) return;
    onSave(account.id, {
      ...data,
      modifiedAt: Date.now(),
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && account && (
        <div key="edit-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-on-background/20 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-surface w-full max-w-[520px] rounded-xl shadow-xl border border-outline-variant/50 overflow-hidden relative"
          >
            <div className="px-6 py-4 border-b border-outline-variant/50 flex justify-between items-center bg-surface-container-lowest">
              <div>
                <h3 className="font-title-lg text-title-lg text-on-surface">Edit Account</h3>
                <p className="text-xs text-on-surface-variant font-medium mt-0.5">{account.email}</p>
              </div>
              <button
                type="button"
                className="text-outline hover:text-on-surface text-sm font-medium"
                onClick={onClose}
              >
                Close
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                
                {/* Email */}
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">
                    Email Address
                  </label>
                  <input
                    {...register("email")}
                    className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:ring-4 focus:ring-primary/20 focus:border-primary bg-surface-container-lowest text-sm"
                    type="email"
                  />
                  {errors.email && <p className="text-error text-xs mt-1">{errors.email.message}</p>}
                </div>
                
                {/* Tier & Limit Reset Type */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">
                      Account Tier
                    </label>
                    <select
                      {...register("isPremium", {
                        setValueAs: (v) => v === "true" || v === true,
                      })}
                      className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:ring-4 focus:ring-primary/20 focus:border-primary bg-surface-container-lowest text-sm"
                    >
                      <option value="false">Standard</option>
                      <option value="true">Premium</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1 font-semibold text-primary">
                      Limit Reset Frequency
                    </label>
                    <select
                      {...register("limitResetType")}
                      className="w-full px-3 py-2 border border-primary/40 rounded-lg focus:ring-4 focus:ring-primary/20 focus:border-primary bg-surface-container-lowest text-sm font-semibold text-primary"
                    >
                      <option value="Daily">Daily</option>
                      <option value="Weekly">Weekly</option>
                    </select>
                  </div>
                </div>

                {/* Limits */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">
                      Weekly Limit
                    </label>
                    <input
                      {...register("weeklyLimit", { valueAsNumber: true })}
                      type="number"
                      min={0}
                      className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:ring-4 focus:ring-primary/20 focus:border-primary bg-surface-container-lowest text-sm"
                    />
                    {errors.weeklyLimit && <p className="text-error text-xs mt-1">{errors.weeklyLimit.message}</p>}
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block font-label-sm text-label-sm text-on-surface-variant">
                        Daily Limit
                      </label>
                      <label className="flex items-center gap-1 text-xs cursor-pointer text-primary font-medium">
                        <input
                          type="checkbox"
                          checked={isDailyNoLimit}
                          onChange={(e) => handleDailyNoLimitToggle(e.target.checked)}
                          className="rounded text-primary focus:ring-primary/20"
                        />
                        No Limit
                      </label>
                    </div>

                    {isDailyNoLimit ? (
                      <div className="w-full px-3 py-2 border border-blue-300 rounded-lg bg-blue-50 text-blue-800 text-sm font-semibold flex items-center justify-between">
                        <span>No Limit</span>
                        <span className="text-xs font-normal text-blue-600">(Unlimited)</span>
                      </div>
                    ) : (
                      <input
                        {...register("dailyLimit", { valueAsNumber: true })}
                        type="number"
                        min={0}
                        className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:ring-4 focus:ring-primary/20 focus:border-primary bg-surface-container-lowest text-sm"
                      />
                    )}
                    {errors.dailyLimit && <p className="text-error text-xs mt-1">{errors.dailyLimit.message}</p>}
                  </div>
                </div>

                {/* Checking Date & Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">
                      Checking Date 📅
                    </label>
                    <input
                      {...register("checkingDate")}
                      type="date"
                      className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:ring-4 focus:ring-primary/20 focus:border-primary bg-surface-container-lowest text-sm"
                    />
                    {errors.checkingDate && <p className="text-error text-xs mt-1">{errors.checkingDate.message}</p>}
                  </div>
                  <div>
                    <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">
                      Checking Time 🕒
                    </label>
                    <input
                      {...register("checkingTime")}
                      type="time"
                      className="w-full px-3 py-2 border border-outline-variant rounded-lg focus:ring-4 focus:ring-primary/20 focus:border-primary bg-surface-container-lowest text-sm"
                    />
                    {errors.checkingTime && <p className="text-error text-xs mt-1">{errors.checkingTime.message}</p>}
                  </div>
                </div>

                {/* Reset Availability - Selectable Duration */}
                <div className="pt-3 border-t border-outline-variant/40 space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="block font-label-sm text-label-sm font-bold text-on-surface">
                      Reset Availability Duration
                    </label>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-surface-variant text-on-surface-variant">
                      {limitResetType} Mode
                    </span>
                  </div>

                  <div className={`grid ${limitResetType === "Weekly" ? "grid-cols-3" : "grid-cols-2"} gap-3 bg-surface-container-low p-3 rounded-xl border border-outline-variant/40`}>
                    {limitResetType === "Weekly" && (
                      <div>
                        <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                          Days
                        </label>
                        <select
                          value={days}
                          onChange={(e) => setDays(parseInt(e.target.value, 10))}
                          className="w-full px-2.5 py-1.5 border border-outline-variant rounded-lg bg-surface text-sm font-medium"
                        >
                          {Array.from({ length: 31 }, (_, i) => (
                            <option key={i} value={i}>
                              {i} {i === 1 ? "Day" : "Days"}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                        Hours
                      </label>
                      <select
                        value={hours}
                        onChange={(e) => setHours(parseInt(e.target.value, 10))}
                        className="w-full px-2.5 py-1.5 border border-outline-variant rounded-lg bg-surface text-sm font-medium"
                      >
                        {Array.from({ length: 24 }, (_, i) => (
                          <option key={i} value={i}>
                            {i} {i === 1 ? "Hour" : "Hours"}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                        Minutes
                      </label>
                      <select
                        value={minutes}
                        onChange={(e) => setMinutes(parseInt(e.target.value, 10))}
                        className="w-full px-2.5 py-1.5 border border-outline-variant rounded-lg bg-surface text-sm font-medium"
                      >
                        {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                          <option key={m} value={m}>
                            {m} Mins
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Calculated Output Preview */}
                  <div className="bg-primary/5 rounded-xl p-3 border border-primary/20 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-on-surface-variant font-medium">Calculated Ready At:</span>
                      <span className="font-bold text-on-surface">{liveCalculation.readyAtText}</span>
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t border-primary/10">
                      <span className="text-on-surface-variant font-medium">Availability Status:</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`font-bold px-2 py-0.5 rounded-full ${
                          liveCalculation.isReady ? "bg-[#ccfbf1] text-[#0f766e]" : "bg-[#fef3c7] text-[#b45309]"
                        }`}>
                          {liveCalculation.isReady ? "🟢 Ready to Use" : "⏳ " + (liveCalculation.countdownText.replace("Available in\n", "") || "Waiting")}
                        </span>
                        {isLimitLow && (
                          <span className="font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                            ⚠️ Limit Low
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Form Footer */}
              <div className="px-6 py-4 bg-surface-container-lowest border-t border-outline-variant/50 flex justify-end gap-3">
                <button
                  type="button"
                  className="px-4 py-2 border border-outline-variant text-on-surface rounded-lg hover:bg-surface-container-low transition-colors text-sm"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary-container text-on-primary font-medium rounded-lg hover:bg-primary-container/90 transition-colors text-sm shadow-sm"
                >
                  Update Account
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
