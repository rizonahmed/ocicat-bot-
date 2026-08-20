import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ethers } from "ethers";
import {
  TOKEN_ADDRESS,
  STAKING_ADDRESS,
  ERC20_ABI,
  STAKING_ABI,
} from "../../lib/contracts"; // path ঠিক রাখো

const provider = new ethers.JsonRpcProvider("https://bsc-dataseed.binance.org/");

const WHALE_THRESHOLD = 1_000_000_000_000;
const SHARK_THRESHOLD = 100_000_000_000;

export async function GET(req: NextRequest) {
  try {
    // ← এখানে তৈরি করো (উপরে না)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: users, error } = await supabase
      .from("verified_users")
      .select("*")
      .eq("status", "active");

    if (error || !users) {
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }

    const token = new ethers.Contract(TOKEN_ADDRESS, ERC20_ABI, provider);
    const staking = new ethers.Contract(STAKING_ADDRESS, STAKING_ABI, provider);

    let removedCount = 0;

    for (const user of users) {
      try {
        const rawBalance = await token.balanceOf(user.wallet);
        const rawStaked = await staking.totalUserStaked(user.wallet);

        const walletTokens = Number(ethers.formatUnits(rawBalance, 6));
        const stakedTokens = Number(ethers.formatUnits(rawStaked, 6));
        const totalTokens = walletTokens + stakedTokens;

        let requiredAmount = 0;
        if (user.group_name === "Whale Group") {
          requiredAmount = WHALE_THRESHOLD;
        } else if (user.group_name === "Shark Group") {
          requiredAmount = SHARK_THRESHOLD;
        }

        if (totalTokens < requiredAmount) {
          console.log(`Removing user ${user.telegram_id} | Balance: ${totalTokens}`);

          const chatId =
            user.group_name === "Whale Group"
              ? process.env.WHALE_CHAT_ID
              : process.env.SHARK_CHAT_ID;

          if (chatId) {
            await fetch(
              `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/banChatMember`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: chatId,
                  user_id: user.telegram_id,
                  revoke_messages: false,
                }),
              }
            );

            await fetch(
              `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/unbanChatMember`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: chatId,
                  user_id: user.telegram_id,
                  only_if_banned: true,
                }),
              }
            );
          }

          await supabase
            .from("verified_users")
            .update({
              status: "removed",
              last_checked_balance: totalTokens,
              last_checked_at: new Date().toISOString(),
            })
            .eq("id", user.id);

          removedCount++;
        } else {
          await supabase
            .from("verified_users")
            .update({
              last_checked_balance: totalTokens,
              last_checked_at: new Date().toISOString(),
            })
            .eq("id", user.id);
        }
      } catch (err) {
        console.error(`Error checking user ${user.wallet}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      totalChecked: users.length,
      removed: removedCount,
    });
  } catch (error) {
    console.error("Cron Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}