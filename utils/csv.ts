import { Account, AccountSchema } from "@/types";

function escapeCSVCell(val: string | number | boolean): string {
  const str = String(val ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCSV(accounts: Account[], filename = "accounts.csv") {
  const headers = [
    "Email",
    "Premium",
    "WeeklyLimit",
    "DailyLimit",
    "LimitResetType",
    "CheckingDate",
    "CheckingTime",
    "ResetDuration",
  ];

  const rows = accounts.map((acc) => [
    escapeCSVCell(acc.email),
    escapeCSVCell(acc.isPremium ? "Yes" : "No"),
    escapeCSVCell(acc.weeklyLimit ?? 0),
    escapeCSVCell(acc.dailyLimit ?? "No Limit"),
    escapeCSVCell(acc.limitResetType || "Daily"),
    escapeCSVCell(acc.checkingDate),
    escapeCSVCell(acc.checkingTime),
    escapeCSVCell(acc.resetDuration),
  ]);

  const csvString = [headers.join(","), ...rows.map((row) => row.join(","))].join("\r\n");

  const blob = new Blob(["\uFEFF" + csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += char;
    }
  }
  result.push(cur.trim());
  return result;
}

export function parseCSV(text: string): { validAccounts: Account[]; errors: string[] } {
  // Strip UTF-8 BOM if present
  let cleanText = text.replace(/^\uFEFF/, "").trim();
  const lines = cleanText.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length === 0) return { validAccounts: [], errors: ["Empty file"] };

  const rawHeaders = parseCSVLine(lines[0]);
  const headers = rawHeaders.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));

  // Check required email header
  if (!headers.includes("email") && !headers.includes("emailaddress")) {
    return { validAccounts: [], errors: ["CSV file must contain an 'Email' header column."] };
  }

  const validAccounts: Account[] = [];
  const errors: string[] = [];

  const todayStr = new Date().toISOString().split("T")[0];

  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (row.length === 0 || (row.length === 1 && row[0] === "")) continue;

    const rowObj: Record<string, string> = {};
    headers.forEach((h, index) => {
      rowObj[h] = row[index] ?? "";
    });

    const email = rowObj["email"] || rowObj["emailaddress"];
    if (!email) {
      errors.push(`Row ${i + 1}: Missing email address`);
      continue;
    }

    const premiumRaw = (rowObj["premium"] || rowObj["ispremium"] || "").toLowerCase();
    const isPremium = premiumRaw === "yes" || premiumRaw === "true" || premiumRaw === "1";

    const weeklyLimitRaw = rowObj["weeklylimit"] || rowObj["wlimit"] || "0";
    const weeklyLimit = isNaN(parseInt(weeklyLimitRaw, 10)) ? 0 : Math.max(0, parseInt(weeklyLimitRaw, 10));

    const dailyLimitRaw = (rowObj["dailylimit"] || rowObj["dlimit"] || "0").trim();
    let dailyLimit: number | "No Limit" = 0;
    if (
      dailyLimitRaw.toLowerCase() === "no limit" ||
      dailyLimitRaw.toLowerCase() === "nolimit" ||
      dailyLimitRaw.toLowerCase() === "unlimited"
    ) {
      dailyLimit = "No Limit";
    } else {
      dailyLimit = isNaN(parseInt(dailyLimitRaw, 10)) ? 0 : Math.max(0, parseInt(dailyLimitRaw, 10));
    }

    const resetTypeRaw = (rowObj["limitresettype"] || rowObj["resettype"] || rowObj["limitreset"] || "").toLowerCase();
    const limitResetType = resetTypeRaw.includes("weekly") ? "Weekly" : "Daily";

    const checkingDate = rowObj["checkingdate"] || rowObj["date"] || todayStr;
    const checkingTime = rowObj["checkingtime"] || rowObj["time"] || "09:00";
    const resetDuration = rowObj["resetduration"] || rowObj["duration"] || "1h";

    try {
      const parsedAccount = AccountSchema.parse({
        id: Date.now().toString() + Math.random().toString(36).substring(2, 9) + i,
        email,
        isPremium,
        weeklyLimit,
        dailyLimit,
        limitResetType,
        checkingDate,
        checkingTime,
        resetDuration,
        modifiedAt: Date.now(),
      });
      validAccounts.push(parsedAccount);
    } catch (error: any) {
      errors.push(`Row ${i + 1} (${email}): ${error.errors?.[0]?.message || "Invalid account format"}`);
    }
  }

  return { validAccounts, errors };
}
