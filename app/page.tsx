"use client";

import { supabase } from "./lib/supabase";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import EthereumProvider from "@walletconnect/ethereum-provider";
import {
  TOKEN_ADDRESS,
  STAKING_ADDRESS,
  ERC20_ABI,
  STAKING_ABI
} from "./lib/contracts";


console.log(
  "PROJECT ID:",
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
);
export default function WhalesPage() {

  
    
  const [wallet, setWallet] = useState("");
  const [balance, setBalance] = useState("0");
  const [group, setGroup] = useState("");
  const [telegramId, setTelegramId] = useState("");
  useEffect(() => {
  const tg = (window as any).Telegram?.WebApp;

  if (tg?.initDataUnsafe?.user) {
    setTelegramId(
      tg.initDataUnsafe.user.id.toString()
    );
  }
}, []);


async function connectWallet() {
  try {
    let ethereum = (window as any).ethereum;
    let wcProvider: any = null;

    let account = "";
    let wcAccounts: string[] = [];

    // =========================
    // WALLETCONNECT
    // =========================

    if (!ethereum) {
      console.log("NO WINDOW.ETHEREUM");

      console.log(
        "PROJECT ID:",
        process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
      );

      wcProvider = await EthereumProvider.init({
        projectId:
          process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,

        chains: [56],

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

    // =========================
    // GET ACCOUNT
    // =========================

    if (wcProvider) {
      account = wcAccounts[0];

      console.log(
        "SELECTED ACCOUNT:",
        account
      );

    } else {
      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });

      account = accounts[0];
    }

    if (!account) {
      console.error("NO WALLET ACCOUNT FOUND");
      return;
    }

    setWallet(account);

    // =========================
    // CHECK NETWORK
    // BSC MAINNET = 56 = 0x38
    // =========================

    let chainId = await ethereum.request({
      method: "eth_chainId",
    });

    console.log("CURRENT CHAIN:", chainId);

    if (chainId !== "0x38") {
      console.log("WRONG NETWORK. SWITCHING TO BSC...");

      try {
        await ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [
            {
              chainId: "0x38",
            },
          ],
        });

      } catch (switchError: any) {

        console.log(
          "NETWORK SWITCH ERROR:",
          switchError
        );

        // BSC NETWORK NOT ADDED
        if (switchError.code === 4902) {
          try {
            await ethereum.request({
              method: "wallet_addEthereumChain",

              params: [
                {
                  chainId: "0x38",

                  chainName: "BNB Smart Chain",

                  nativeCurrency: {
                    name: "BNB",
                    symbol: "BNB",
                    decimals: 18,
                  },

                  rpcUrls: [
                    "https://bsc-dataseed.binance.org/",
                  ],

                  blockExplorerUrls: [
                    "https://bscscan.com/",
                  ],
                },
              ],
            });

          } catch (addError) {
            console.error(
              "FAILED TO ADD BSC:",
              addError
            );

            return;
          }

        } else {
          console.error(
            "FAILED TO SWITCH TO BSC:",
            switchError
          );

          return;
        }
      }

      // GET NEW CHAIN ID AFTER SWITCH
      chainId = await ethereum.request({
        method: "eth_chainId",
      });

      console.log(
        "NEW CHAIN:",
        chainId
      );
    }

    // =========================
    // CREATE PROVIDER
    // =========================

    const provider =
      new ethers.BrowserProvider(ethereum);

    // =========================
    // CREATE TOKEN CONTRACT
    // =========================

    const token =
      new ethers.Contract(
        TOKEN_ADDRESS,
        ERC20_ABI,
        provider
      );

    const staking =
      new ethers.Contract(
        STAKING_ADDRESS,
        STAKING_ABI,
        provider
      );

    console.log(
      "TOKEN ADDRESS:",
      TOKEN_ADDRESS
    );

    console.log(
      "STAKING ADDRESS:",
      STAKING_ADDRESS
    );

    // =========================
    // CHECK CONTRACT CODE
    // =========================

    const tokenCode =
      await provider.getCode(TOKEN_ADDRESS);

    console.log(
      "TOKEN CONTRACT CODE:",
      tokenCode
    );

    if (tokenCode === "0x") {
      console.error(
        "TOKEN CONTRACT NOT FOUND ON BSC!"
      );

      return;
    }

    const stakingCode =
      await provider.getCode(STAKING_ADDRESS);

    console.log(
      "STAKING CONTRACT CODE:",
      stakingCode
    );

    if (stakingCode === "0x") {
      console.error(
        "STAKING CONTRACT NOT FOUND ON BSC!"
      );

      return;
    }

    // =========================
    // GET BALANCES
    // =========================

    const rawBalance =
      await token.balanceOf(account);

    const rawStaked =
      await staking.totalUserStaked(account);

    const walletTokens =
      Number(
        ethers.formatUnits(
          rawBalance,
          6
        )
      );

    const stakedTokens =
      Number(
        ethers.formatUnits(
          rawStaked,
          6
        )
      );

    const totalTokens =
      walletTokens + stakedTokens;

    console.log(
      "WALLET:",
      walletTokens
    );

    console.log(
      "STAKED:",
      stakedTokens
    );

    console.log(
      "TOTAL:",
      totalTokens
    );

    console.log(
      "RAW STAKED:",
      rawStaked.toString()
    );

    console.log(
      "RAW BALANCE:",
      rawBalance.toString()
    );

    const formatted =
      ethers.formatUnits(
        rawBalance,
        6
      );

    console.log(
      "FORMATTED:",
      formatted
    );

    setBalance(
      totalTokens.toLocaleString()
    );

    // =========================
    // CHECK GROUP
    // =========================

    let userGroup =
      "Not Eligible";

    if (
      totalTokens >=
      1000000000000
    ) {
      userGroup =
        "Whale Group";

    } else if (
      totalTokens >=
      100000000000
    ) {
      userGroup =
        "Shark Group";
    }

    setGroup(userGroup);

    // =========================
    // CHECK EXISTING WALLET
    // =========================

    const {
      data: existing,
      error,
    } = await supabase
      .from("verified_users")
      .select("wallet")
      .eq(
        "wallet",
        account.toLowerCase()
      );

    if (error) {
      console.error(
        "SUPABASE CHECK ERROR:",
        error
      );
    }

    console.log(
      "MATCHING WALLET:",
      existing
    );

    if (
      existing &&
      existing.length > 0
    ) {
      console.log(
        "WALLET ALREADY VERIFIED"
      );

      return;
    }

    // =========================
    // SAVE USER
    // =========================

    console.log(
      "TELEGRAM ID:",
      telegramId
    );

    console.log(
      "ACCOUNT:",
      account
    );

    console.log(
      "GROUP:",
      userGroup
    );

    const {
      data: insertedData,
      error: insertError,
    } = await supabase
      .from("verified_users")
      .insert({
        telegram_id: telegramId,
        wallet:
          account.toLowerCase(),
        group_name: userGroup,
      })
      .select();

    if (insertError) {
      console.error(
        "SUPABASE INSERT ERROR:",
        insertError
      );
    } else {
      console.log(
        "NEW USER ADDED:",
        insertedData
      );
    }

  } catch (error) {
    console.error(
      "CONNECT WALLET ERROR:",
      error
    );
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
                <span className="text-cyan-400">
                 {balance}
                </span>
              </div>
              {group && (
             <div className="mb-4 p-3 bg-slate-900 rounded-xl">
             Status:
             <br />
            <span className="text-cyan-400">
            {group}
             </span>
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
{group === "Whale Group" && (
  <a
    href="https://t.me/+jR1km_tQmvYyNmE0"
    target="_blank"
    className="block mb-4 text-center rounded-xl bg-yellow-600 p-3 font-bold"
  >
    JOIN WHALE GROUP
  </a>
)}


{group === "Shark Group" && (
  <a
    href="https://t.me/+TU4yZ3bI8ogyOTFk"
    target="_blank"
    className="block mb-4 text-center rounded-xl bg-green-600 p-3 font-bold"
  >
    🦈 JOIN SHARK GROUP
  </a>
)}
            </>
          )}




         {telegramId && (
  <div className="mb-4 p-3 bg-slate-900 rounded-xl">
    Telegram ID:
    <br />
    <span className="text-cyan-400">
      {telegramId}
    </span>
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
