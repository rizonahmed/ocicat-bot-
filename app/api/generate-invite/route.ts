import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { telegramId, wallet, group, balance } = await req.json();

    if (!telegramId || !wallet || !group) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    // Already active kina check
    const { data: existing } = await supabase
      .from("verified_users")
      .select("id")
      .eq("wallet", wallet.toLowerCase())
      .eq("status", "active")
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Already verified" }, { status: 400 });
    }

    const chatId =
      group === "Whale Group"
        ? process.env.WHALE_CHAT_ID
        : process.env.SHARK_CHAT_ID;

    if (!chatId) {
      return NextResponse.json({ error: "Chat ID not configured" }, { status: 500 });
    }

    // One-time invite link create
    const res = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/createChatInviteLink`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          member_limit: 1,
          expire_date: Math.floor(Date.now() / 1000) + 3600, // 1 hour
          name: `Verify-${wallet.slice(0, 6)}`,
        }),
      }
    );

    const data = await res.json();

    if (!data.ok) {
      console.error("Telegram Error:", data);
      return NextResponse.json({ error: "Failed to create invite link" }, { status: 500 });
    }

    // pending_joins এ সেভ (balance সহ)
    await supabase.from("pending_joins").insert({
      telegram_id: telegramId.toString(),
      wallet: wallet.toLowerCase(),
      group_name: group,
      invite_link: data.result.invite_link,
      balance_at_join: balance || 0,
      status: "pending",
    });

    return NextResponse.json({
      inviteLink: data.result.invite_link,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}