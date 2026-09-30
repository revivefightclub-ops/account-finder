import { differenceInDays, differenceInHours, differenceInMinutes, parse, isAfter, add, format } from "date-fns";

/**
 * Parses a natural language duration string into an object of { days, hours, minutes }.
 * Examples: "2d 5h 10m", "5h 20m", "1d", "12h", "45m", "3d", "90m", "2 days 4 hours", "5 hours", "15 minutes".
 */
export function parseDuration(durationStr: string): { days: number; hours: number; minutes: number } {
  let days = 0;
  let hours = 0;
  let minutes = 0;

  if (!durationStr) return { days, hours, minutes };

  const str = durationStr.toLowerCase();

  // Match days
  const daysMatch = str.match(/(\d+)\s*(d|day|days)/);
  if (daysMatch) {
    days = parseInt(daysMatch[1], 10);
  }

  // Match hours
  const hoursMatch = str.match(/(\d+)\s*(h|hr|hrs|hour|hours)/);
  if (hoursMatch) {
    hours = parseInt(hoursMatch[1], 10);
  }

  // Match minutes
  const minutesMatch = str.match(/(\d+)\s*(m|min|mins|minute|minutes)(?!\w)/); // ensure not matching "month"
  if (minutesMatch) {
    minutes = parseInt(minutesMatch[1], 10);
  }

  return { days, hours, minutes };
}

/**
 * Formats a duration object back into a neat string (e.g., "2d 5h 10m")
 * useful for standardizing storage or migration.
 */
export function formatDurationObj(duration: { days: number; hours: number; minutes: number }) {
  const parts = [];
  if (duration.days > 0) parts.push(`${duration.days}d`);
  if (duration.hours > 0) parts.push(`${duration.hours}h`);
  if (duration.minutes > 0) parts.push(`${duration.minutes}m`);
  return parts.length > 0 ? parts.join(" ") : "0m";
}

export function calculateDurationFromDates(checkingDate: string, checkingTime: string, resetDate: string, resetTime: string): string {
  try {
    const start = parse(`${checkingDate} ${checkingTime}`, "yyyy-MM-dd HH:mm", new Date());
    const end = parse(`${resetDate} ${resetTime}`, "yyyy-MM-dd HH:mm", new Date());
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return "1d";
    
    const days = differenceInDays(end, start);
    const hours = differenceInHours(end, start) % 24;
    const minutes = differenceInMinutes(end, start) % 60;
    
    return formatDurationObj({
      days: Math.max(0, days),
      hours: Math.max(0, hours),
      minutes: Math.max(0, minutes)
    });
  } catch (e) {
    return "1d";
  }
}

export function calculateReadyAt(checkingDate: string, checkingTime: string, resetDurationStr: string): Date | null {
  try {
    const checkingDateTimeString = `${checkingDate} ${checkingTime}`;
    const checkingDateTime = parse(checkingDateTimeString, "yyyy-MM-dd HH:mm", new Date());

    if (isNaN(checkingDateTime.getTime())) return null;

    const duration = parseDuration(resetDurationStr);

    return add(checkingDateTime, {
      days: duration.days,
      hours: duration.hours,
      minutes: duration.minutes,
    });
  } catch (error) {
    return null;
  }
}

export function getStatusAndCountdown(readyAt: Date | null, checkingDate?: string, checkingTime?: string) {
  if (!readyAt) {
    return { status: "Waiting" as const, countdown: null, progressPercent: 0 };
  }

  const now = new Date();

  if (isAfter(now, readyAt) || now.getTime() === readyAt.getTime()) {
    return { status: "Ready" as const, countdown: null, progressPercent: 100 };
  }

  const diffMs = readyAt.getTime() - now.getTime();
  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  let progressPercent = 0;
  if (checkingDate && checkingTime) {
    try {
      const start = parse(`${checkingDate} ${checkingTime}`, "yyyy-MM-dd HH:mm", new Date());
      if (!isNaN(start.getTime())) {
        const totalMs = readyAt.getTime() - start.getTime();
        if (totalMs > 0) {
          const elapsed = now.getTime() - start.getTime();
          progressPercent = Math.min(100, Math.max(0, Math.round((elapsed / totalMs) * 100)));
        }
      }
    } catch (e) {}
  }

  return {
    status: "Waiting" as const,
    countdown: { days, hours, minutes, seconds },
    progressPercent,
  };
}

export function formatCountdown(countdown: { days: number; hours: number; minutes: number; seconds?: number } | null) {
  if (!countdown) return "";
  
  const hh = String(countdown.hours).padStart(2, '0');
  const mm = String(countdown.minutes).padStart(2, '0');
  const ss = String(countdown.seconds ?? 0).padStart(2, '0');

  if (countdown.days > 0) {
    return `Available in ${countdown.days}d ${hh}h ${mm}m`;
  }
  return `Available in ${hh}h ${mm}m ${ss}s`;
}

export function formatReadyAt(readyAt: Date | null): { date: string; time: string } {
  if (!readyAt) return { date: "N/A", time: "" };
  return {
    date: format(readyAt, "dd MMM yyyy"),
    time: format(readyAt, "HH:mm")
  };
}
