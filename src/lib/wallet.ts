import type { EthereumProvider, WalletKind } from "@/types/wallet";

function isProvider(value: unknown): value is EthereumProvider {
  return Boolean(
    value &&
      typeof value === "object" &&
      "request" in value &&
      typeof (value as EthereumProvider).request === "function",
  );
}

export function getWalletProvider(kind: WalletKind): EthereumProvider | null {
  if (typeof window === "undefined") return null;

  try {
    const ethereum = window.ethereum;
    const providers = ethereum?.providers ?? (ethereum ? [ethereum] : []);

    if (kind === "tokenpocket") {
      const candidates = [
        window.tp?.ethereum,
        window.tp,
        window.tokenpocket?.ethereum,
        window.tokenpocket,
        providers.find((provider) => provider.isTokenPocket),
        ethereum?.isTokenPocket ? ethereum : undefined,
      ];
      const directProvider = candidates.find(isProvider);
      if (directProvider) return directProvider;

      const userAgent =
        typeof window.navigator !== "undefined"
          ? window.navigator.userAgent.toLowerCase()
          : "";
      return isProvider(ethereum) && userAgent.includes("tokenpocket")
        ? ethereum
        : null;
    }

    return (
      providers.find(
        (provider) => provider.isMetaMask && !provider.isTokenPocket,
      ) ?? (isProvider(ethereum) && !ethereum.isTokenPocket ? ethereum : null)
    );
  } catch {
    return null;
  }
}

export async function waitForWalletProvider(
  kind: WalletKind,
  timeoutMs = 1000,
): Promise<EthereumProvider | null> {
  if (typeof window === "undefined") return null;

  try {
    const existingProvider = getWalletProvider(kind);
    if (existingProvider) return existingProvider;

    const startedAt = Date.now();
    return await new Promise((resolve) => {
      const checkProvider = () => {
        try {
          const provider = getWalletProvider(kind);
          if (provider || Date.now() - startedAt >= timeoutMs) {
            resolve(provider);
            return;
          }
          window.setTimeout(checkProvider, 100);
        } catch {
          resolve(null);
        }
      };

      window.setTimeout(checkProvider, 100);
    });
  } catch {
    return null;
  }
}

export function shortenAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
