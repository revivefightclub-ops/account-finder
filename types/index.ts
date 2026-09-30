import { z } from "zod";

export const AccountSchema = z.object({
  id: z.string(),
  email: z.string().email("Invalid email address"),
  isPremium: z.boolean(),
  weeklyLimit: z.number().int().min(0).max(100),
  dailyLimit: z.union([z.number().int().min(0).max(100), z.literal("No Limit"), z.string()]),
  limitResetType: z.enum(["Daily", "Weekly"]),
  checkingDate: z.string().min(1, "Checking date is required"),
  checkingTime: z.string().min(1, "Checking time is required"),
  resetDuration: z.string().min(1, "Reset duration is required"),
  modifiedAt: z.number(),
});

export type Account = z.infer<typeof AccountSchema>;

export type ReadyStatus = "Ready" | "Waiting";

export interface AccountWithStatus extends Account {
  readyAtDate: Date | null;
  readyStatus: ReadyStatus;
  progressPercent?: number;
  timeRemaining?: {
    days: number;
    hours: number;
    minutes: number;
    seconds?: number;
  };
}
