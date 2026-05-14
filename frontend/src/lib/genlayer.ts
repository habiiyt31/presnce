import { createClient } from "genlayer-js";
import { studionet, testnetAsimov } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import { parseEther, formatEther } from "viem";

const NETWORK = process.env.NEXT_PUBLIC_NETWORK || "studionet";
export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";

export const CHAIN     = NETWORK === "testnet" ? testnetAsimov : studionet;
export const CHAIN_KEY = NETWORK === "testnet" ? "testnetAsimov" : "studionet";

const CHAIN_HEX = "0x" + (CHAIN as any).id.toString(16);

export const NETWORK_CONFIG = {
  chainId:           CHAIN_HEX,
  chainName:         NETWORK === "testnet" ? "GenLayer Testnet Asimov" : "GenLayer Studio",
  nativeCurrency:    { name: "GEN", symbol: "GEN", decimals: 18 },
  rpcUrls:           NETWORK === "testnet" ? ["https://rpc.genlayer.com"] : ["https://studio.genlayer.com/api"],
  blockExplorerUrls: NETWORK === "testnet" ? ["https://explorer.genlayer.com"] : ["https://studio.genlayer.com"],
};

export function getReadClient() {
  return createClient({ chain: CHAIN });
}

export function getWriteClient(address: string) {
  return createClient({ chain: CHAIN, account: address as `0x${string}` });
}

export async function ensureNetwork(): Promise<void> {
  if (typeof window === "undefined") return;
  const eth = (window as any).ethereum;
  if (!eth) return;
  try {
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN_HEX }] });
  } catch (e: any) {
    if (e.code === 4902 || e.code === -32603) {
      try { await eth.request({ method: "wallet_addEthereumChain", params: [NETWORK_CONFIG] }); } catch {}
    }
  }
}

export function getEthereum() {
  return (window as any).ethereum;
}

export { TransactionStatus };

export function toWei(amount: string | number): bigint {
  return parseEther(String(amount || "0"));
}

export function fromWei(wei: bigint | string | number | null | undefined): number {
  try {
    if (wei === null || wei === undefined || wei === "" || wei === 0) return 0;
    return parseFloat(formatEther(BigInt(wei as any)));
  } catch { return 0; }
}

export function fromWeiStr(wei: bigint | string | number | null | undefined, decimals = 4): string {
  try {
    if (wei === null || wei === undefined || wei === "") return "0";
    const full = formatEther(BigInt(wei as any));
    if (decimals <= 0) return full.split(".")[0];
    const [whole, frac = ""] = full.split(".");
    return `${whole}.${(frac + "0".repeat(decimals)).slice(0, decimals)}`;
  } catch { return "0"; }
}

export function weiArg(amount: string | number): number {
  return Number(toWei(amount));
}
