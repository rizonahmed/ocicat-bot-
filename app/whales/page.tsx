"use client";

import { supabase } from "../lib/supabase";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import EthereumProvider from "@walletconnect/ethereum-provider";
import {
  TOKEN_ADDRESS,
  STAKING_ADDRESS,
  ERC20_ABI,
  STAKING_ABI
} from "../lib/contracts";

console.log(
  "PROJECT ID:",
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
);

export default function WhalesPage() {
  const [wallet, setWallet] = useState("");
  const [balance, setBalance] = useState("0");
  const [rawTotalBalance, setRawTotalBalance] = useState(0); // নতুন
  const [group, setGroup] = useState("");
  const [telegramId, setTelegramId] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [loadingInvite, setLoadingInvite] = useState(false);
  const [alreadyVerified, setAlreadyVerified] = useState(false);

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;

    if (tg?.initDataUnsafe?.user) {
      setTelegramId(tg.initDataUnsafe.user.id.toString());
    }
  }, []);

  async function connectWallet() {
    try {
      let ethereum = (window as any).ethereum;
      let wcProvider: any = null;

      let account = "";
      let wcAccounts: string[] = [];

      if (!ethereum) {
        console.log("NO WINDOW.ETHEREUM");

        console.log(
          "PROJECT ID:",
          process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
        );

        wcProvider = await EthereumProvider.init({
          projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
          optionalChains: [56],
          optionalMethods: [
            "eth_sendTransaction",
            "personal_sign",
            "eth_signTypedData",
          ],
          showQrModal: true,
          metadata: {
            name: "Ocicat Dreamers Club",
            description: "Ocicat Whale Verification",
            url: "https://whaleslogin-git-main-ocicats-projects.vercel.app",
            icons: [
              "https://whaleslogin-git-main-ocicats-projects.vercel.app/ocicat-logo.png",
            ],
          },
        });

        console.log("WC PROVIDER CREATED");

        try {
          wcAccounts = await wcProvider.enable();

          console.log("WC ENABLED:", wcAccounts);

          ethereum = wcProvider;

          console.log("CONNECTED");
          console.log("WC ACCOUNTS:", wcProvider.accounts);
          console.log("WC CHAIN:", wcProvider.chainId);
        } catch (err) {
          console.error("WC ERROR:", err);
          return;
        }
      }

      if (wcProvider) {
        account = wcAccounts[0];
        console.log("SELECTED ACCOUNT:", account);
      } else {
        const accounts = await ethereum.request({
          method: "eth_requestAccounts",
        });
        account = accounts[0];
      }

      setWallet(account);

      const chainId = await ethereum.request({
        method: "eth_chainId",
      });

      console.log("CURRENT CHAIN:", chainId);

      const provider = new ethers.BrowserProvider(ethereum);

      const token = new ethers.Contract(
        TOKEN_ADDRESS,
        ERC20_ABI,
        provider
      );
      const staking = new ethers.Contract(
        STAKING_ADDRESS,
        STAKING_ABI,
        provider
      );

      const rawBalance = await token.balanceOf(account);
      const rawStaked = await staking.totalUserStaked(account);

      const walletTokens = Number(ethers.formatUnits(rawBalance, 6));
      const stakedTokens = Number(ethers.formatUnits(rawStaked, 6));
      const totalTokens = walletTokens + stakedTokens;

      console.log("WALLET:", walletTokens);
      console.log("STAKED:", stakedTokens);
      console.log("TOTAL:", totalTokens);
      console.log("RAW STAKED:", rawStaked.toString());
      console.log("RAW BALANCE:", rawBalance.toString());

      const formatted = ethers.formatUnits(rawBalance, 6);
      console.log("FORMATTED:", formatted);

      setBalance(totalTokens.toLocaleString());
      setRawTotalBalance(totalTokens); // নতুন

      let userGroup = "Not Eligible";

      if (totalTokens >= 1000000000000) {
        userGroup = "Whale Group";
      } else if (totalTokens >= 100000000000) {
        userGroup = "Shark Group";
      }

      setGroup(userGroup);

      // Already verified kina check
      const { data: existing } = await supabase
        .from("verified_users")
        .select("wallet, status")
        .eq("wallet", account.toLowerCase())
        .eq("status", "active")
        .maybeSingle();

      console.log("MATCHING WALLET:", existing);

      if (existing) {
        console.log("WALLET ALREADY VERIFIED");
        setAlreadyVerified(true);
        return;
      }

      console.log("TELEGRAM ID:", telegramId);
      console.log("ACCOUNT:", account);
      console.log("GROUP:", userGroup);

    } catch (error) {
      console.error(error);
    }
  }

  // ========== One-time Invite Link Generate ==========
  async function generateInvite() {
    if (!wallet || !telegramId || group === "Not Eligible") {
      alert("Wallet or Telegram ID missing");
      return;
    }

    setLoadingInvite(true);

    try {
      console.log("Generating invite for:", {
        telegramId,
        wallet,
        group,
        balance: rawTotalBalance,
      });

      const res = await fetch("/api/generate-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramId,
          wallet,
          group,
          balance: rawTotalBalance, // নতুন
        }),
      });

      const data = await res.json();
      console.log("INVITE RESPONSE:", data);

      if (data.inviteLink) {
        setInviteLink(data.inviteLink);
        window.open(data.inviteLink, "_blank");
      } else {
        alert(data.error || "Failed to generate invite link");
      }
    } catch (err) {
      console.error("Generate Invite Error:", err);
      alert("Something went wrong while generating link");
    } finally {
      setLoadingInvite(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050b1f] text-white flex items-center justify-center">
      <div className="max-w-md w-full p-6">
        <div className="rounded-3xl bg-[#07142e] p-6 border border-cyan-900">
          <img
            src="/ocicat-logo.png"
            alt="Ocicat"
            className="w-24 h-24 mx-auto mb-4"
          />

          <h1 className="text-3xl font-bold mb-4">
            🐋 Dreamers Club Verification
          </h1>

          {wallet && (
            <>
              <div className="mb-3 p-3 bg-slate-900 rounded-xl text-sm break-all">
                {wallet}
              </div>

              <div className="mb-4 p-3 bg-slate-900 rounded-xl">
                Total Balance:
                <br />
                <span className="text-cyan-400">{balance}</span>
              </div>

              {group && (
                <div className="mb-4 p-3 bg-slate-900 rounded-xl">
                  Status:
                  <br />
                  <span className="text-cyan-400">{group}</span>
                </div>
              )}

              {group === "Not Eligible" && (
                <a
                  href="https://pancakeswap.finance/swap?outputCurrency=0xE53D384Cf33294C1882227ae4f90D64cF2a5dB70"
                  target="_blank"
                  className="block mb-4 text-center rounded-xl bg-orange-600 p-3 font-bold"
                >
                  🚀 GET MORE OCICAT
                </a>
              )}

              {alreadyVerified && (
                <div className="mb-4 p-3 bg-green-900/40 border border-green-600 rounded-xl text-center font-bold">
                  ✅ Already Verified
                </div>
              )}

              {group === "Whale Group" && !alreadyVerified && (
                <button
                  onClick={generateInvite}
                  disabled={loadingInvite || !!inviteLink}
                  className="block w-full mb-4 text-center rounded-xl bg-yellow-600 p-3 font-bold disabled:opacity-60"
                >
                  {loadingInvite
                    ? "Generating Link..."
                    : inviteLink
                    ? "✅ Link Generated"
                    : "JOIN WHALE GROUP"}
                </button>
              )}

              {group === "Shark Group" && !alreadyVerified && (
                <button
                  onClick={generateInvite}
                  disabled={loadingInvite || !!inviteLink}
                  className="block w-full mb-4 text-center rounded-xl bg-green-600 p-3 font-bold disabled:opacity-60"
                >
                  {loadingInvite
                    ? "Generating Link..."
                    : inviteLink
                    ? "✅ Link Generated"
                    : "🦈 JOIN SHARK GROUP"}
                </button>
              )}
            </>
          )}

          {telegramId && (
            <div className="mb-4 p-3 bg-slate-900 rounded-xl">
              Telegram ID:
              <br />
              <span className="text-cyan-400">{telegramId}</span>
            </div>
          )}

          <button
            onClick={connectWallet}
            disabled={wallet !== ""}
            className={`w-full rounded-xl p-4 font-bold text-white ${
              wallet
                ? "bg-green-600 cursor-default"
                : "bg-cyan-600 hover:bg-cyan-700"
            }`}
          >
            {wallet ? "✅VERIFIED" : "CONNECT WALLET"}
          </button>
        </div>
      </div>
    </main>
  );
}