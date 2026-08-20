import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();

    if (update.chat_member) {
      const { new_chat_member } = update.chat_member;

      if (new_chat_member?.status === "member") {
        const telegramId = new_chat_member.user.id.toString();

        const { data: pending } = await supabase
          .from("pending_joins")
          .select("*")
          .eq("telegram_id", telegramId)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (pending) {
          await supabase.from("verified_users").upsert(
            {
              telegram_id: telegramId,
              wallet: pending.wallet,
              group_name: pending.group_name,
              balance_at_join: pending.balance_at_join || 0,
              status: "active",
              joined_at: new Date().toISOString(),
            },
            { onConflict: "wallet" }
          );

          await supabase
            .from("pending_joins")
            .update({ status: "joined" })
            .eq("id", pending.id);

          console.log(`User ${telegramId} joined & verified`);
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ ok: true });
  }
}