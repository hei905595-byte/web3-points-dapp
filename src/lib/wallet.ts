import type { EthereumProvider, WalletKind } from "@/types/wallet";

export function getWalletProvider(kind: WalletKind): EthereumProvider | null {
  if (typeof window === "undefined") return null;

  if (kind === "tokenpocket" && window.tokenpocket?.ethereum) {
    return window.tokenpocket.ethereum;
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

export function walletInstallUrl(kind: WalletKind) {
  return kind === "metamask"
    ? "https://metamask.io/download/"
    : "https://www.tokenpocket.pro/en/download/app";
}

export function shortenAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
