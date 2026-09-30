import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mfknyjaxhtehlovkjuvw.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_gwrXyUvGpjLe0GqLDFR7ag_Pojc0KVK";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
