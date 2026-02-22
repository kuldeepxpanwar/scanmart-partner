"use server";

import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

// Initialize a Supabase client with the SERVICE ROLE KEY for server-side admin access
// WARNING: Service role key bypasses RLS. We must be careful with queries here.
// For PIN verification, we need it if RLS prevents unauthenticated users from reading the staff table.
// If the user hasn't set up the service role key, we fallback to the anon key (which assumes RLS allows reading staff for login).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function verifyStaffPin(pin: string, storeId?: string) {
    try {
        if (!pin || pin.length < 4) {
            return { success: false, error: "Invalid PIN format" };
        }

        // 1. Fetch active staff — optionally scoped to a store
        let query = supabase
            .from("staff")
            .select("*")
            .eq("is_active", true);

        if (storeId) {
            query = query.eq("store_id", storeId);
        }

        const { data: staffList, error } = await query;

        if (error) {
            console.error("Auth: Database error:", error);
            return { success: false, error: "Database connection error." };
        }

        if (!staffList || staffList.length === 0) {
            return { success: false, error: "No active staff found." };
        }

        // 2. Identify the correct staff member by comparing the hashed PIN
        let matchedStaff = null;

        for (const member of staffList) {
            const dbHash = member.pin_code;
            if (!dbHash) continue;

            // Handle both plain text (legacy) and bcrypt hashes
            const isBcrypt = dbHash.startsWith("$2b$") || dbHash.startsWith("$2a$");

            if (isBcrypt) {
                const isValid = await bcrypt.compare(pin, dbHash);
                if (isValid) {
                    matchedStaff = member;
                    break;
                }
            } else {
                // Fallback for plain text PINs currently in DB
                if (pin === dbHash) {
                    matchedStaff = member;
                    break;
                }
            }
        }

        if (matchedStaff) {
            // Remove sensitive data before returning to client (even if it's returning from a Server Action, good practice)
            const { pin_code: _unused, ...safeStaffData } = matchedStaff;
            return { success: true, staff: safeStaffData };
        } else {
            return { success: false, error: "Invalid PIN." };
        }
    } catch (error: any) {
        console.error("verifyStaffPin Action Error:", error);
        return { success: false, error: "Authentication service failed." };
    }
}
