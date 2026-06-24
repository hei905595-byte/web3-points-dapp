import type { EthereumProvider, WalletKind } from "@/types/wallet";

export function getWalletProvider(kind: WalletKind): EthereumProvider | null {
  if (typeof window === "undefined") return null;

  if (kind === "tokenpocket") {
    const tokenPocketProvider =
      window.tp?.ethereum ?? window.tokenpocket?.ethereum;
    if (tokenPocketProvider) return tokenPocketProvider;
  }

  const ethereum = window.ethereum;
  if (!ethereum) return null;

  const providers = ethereum.providers ?? [ethereum];
  if (kind === "tokenpocket") {
    return providers.find((provider) => provider.isTokenPocket) ?? null;
  }

  return (
    providers.find(
      (provider) => provider.isMetaMask && !provider.isTokenPocket,
    ) ?? (ethereum.isMetaMask ? ethereum : null)
  );
}

export async function waitForWalletProvider(
  kind: WalletKind,
  timeoutMs = 1000,
): Promise<EthereumProvider | null> {
  if (typeof window === "undefined") return null;

  const existingProvider = getWalletProvider(kind);
  if (existingProvider) return existingProvider;

  const startedAt = Date.now();
  return new Promise((resolve) => {
    const checkProvider = () => {
      try {
        const provider = getWalletProvider(kind);
        if (provider || Date.now() - startedAt >= timeoutMs) {
          resolve(provider);
          return;
        }
      } catch {
        resolve(null);
        return;
      }

      window.setTimeout(checkProvider, 100);
    };

    window.setTimeout(checkProvider, 100);
  });
}

export function walletInstallUrl(kind: WalletKind) {
  return kind === "metamask"
    ? "https://metamask.io/download/"
    : "https://www.tokenpocket.pro/en/download/app";
}

export function shortenAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
