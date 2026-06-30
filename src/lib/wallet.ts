import type {
  TronProvider,
  WalletKind,
  WalletProvider,
} from "@/types/wallet";

function injectedTronWeb(kind: WalletKind): TronProvider | null {
  if (typeof window === "undefined") return null;
  if (kind === "tokenpocket") {
    const isTokenPocketBrowser =
      Boolean(window.tokenpocket || window.tp) ||
      /TokenPocket/i.test(window.navigator.userAgent);
    return (
      window.tokenpocket?.tronWeb ??
      window.tp?.tronWeb ??
      (isTokenPocketBrowser ? window.tronWeb : null) ??
      null
    );
  }
  const isTokenPocketBrowser =
    Boolean(window.tokenpocket || window.tp) ||
    /TokenPocket/i.test(window.navigator.userAgent);
  if (isTokenPocketBrowser) return null;
  return window.tronLink ??
    (window.tronWeb?.isTronLink ? window.tronWeb : null) ??
    null;
}

export function getWalletProvider(kind: WalletKind): WalletProvider | null {
  if (typeof window === "undefined") return null;
  return injectedTronWeb(kind);
}

export async function waitForWalletProvider(
  kind: WalletKind,
  timeoutMs = 5000,
): Promise<WalletProvider | null> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const provider = getWalletProvider(kind);
    if (provider) return provider;
    await new Promise((resolve) => window.setTimeout(resolve, 100));
  }
  return null;
}

export async function requestWalletAddress(
  kind: WalletKind,
  provider: WalletProvider,
): Promise<string | null> {
  if (typeof provider.request === "function") {
    await provider.request({ method: "tron_requestAccounts" });
  }
  const startedAt = Date.now();
  while (Date.now() - startedAt < 2500) {
    const address = injectedTronWeb(kind)?.defaultAddress?.base58;
    if (address) return address;
    await new Promise((resolve) => window.setTimeout(resolve, 100));
  }
  return null;
}

export async function signWalletMessage(
  provider: WalletProvider,
  message: string,
): Promise<string> {
  if (!provider.trx?.signMessageV2) {
    throw new Error("The wallet does not support TRON message signing.");
  }
  return await provider.trx.signMessageV2(message);
}

export function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
