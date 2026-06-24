import type {
  Eip6963ProviderDetail,
  EthereumProvider,
  WalletKind,
} from "@/types/wallet";

const announcedProviders = new Map<string, EthereumProvider>();
let providerDiscoveryStarted = false;

function isProvider(value: unknown): value is EthereumProvider {
  return Boolean(
    value &&
      typeof value === "object" &&
      "request" in value &&
      typeof (value as EthereumProvider).request === "function",
  );
}

function startProviderDiscovery() {
  if (typeof window === "undefined" || providerDiscoveryStarted) return;

  providerDiscoveryStarted = true;
  window.addEventListener("eip6963:announceProvider", (event) => {
    const detail = event.detail as Eip6963ProviderDetail | undefined;
    if (detail?.info?.rdns && isProvider(detail.provider)) {
      announcedProviders.set(detail.info.rdns.toLowerCase(), detail.provider);
    }
  });
  window.dispatchEvent(new Event("eip6963:requestProvider"));
}

function isTokenPocketUserAgent() {
  const userAgent = window.navigator?.userAgent?.toLowerCase() ?? "";
  return /tokenpocket|tpwallet/.test(userAgent);
}

export function getWalletProvider(kind: WalletKind): EthereumProvider | null {
  if (typeof window === "undefined") return null;

  try {
    startProviderDiscovery();

    const ethereum = window.ethereum;
    const providers = ethereum?.providers ?? (ethereum ? [ethereum] : []);
    const eip6963Entries = [...announcedProviders.entries()];

    if (kind === "tokenpocket") {
      const candidates = [
        window.tp?.ethereum,
        window.tokenpocket?.ethereum,
        window.tp,
        window.tokenpocket,
        providers.find((provider) => provider.isTokenPocket),
        eip6963Entries.find(
          ([rdns]) =>
            rdns.includes("tokenpocket") || rdns.includes("tpwallet"),
        )?.[1],
        ethereum?.isTokenPocket ? ethereum : undefined,
      ];
      const directProvider = candidates.find(isProvider);
      if (directProvider) return directProvider;

      return isProvider(ethereum) && isTokenPocketUserAgent() ? ethereum : null;
    }

    return (
      providers.find(
        (provider) => provider.isMetaMask && !provider.isTokenPocket,
      ) ??
      eip6963Entries.find(
        ([rdns, provider]) =>
          rdns.includes("metamask") &&
          provider.isMetaMask &&
          !provider.isTokenPocket,
      )?.[1] ??
      (isProvider(ethereum) &&
      !ethereum.isTokenPocket &&
      !isTokenPocketUserAgent()
        ? ethereum
        : null)
    );
  } catch {
    return null;
  }
}

export async function waitForWalletProvider(
  kind: WalletKind,
  timeoutMs = 5000,
): Promise<EthereumProvider | null> {
  if (typeof window === "undefined") return null;

  try {
    startProviderDiscovery();

    const existingProvider = getWalletProvider(kind);
    if (existingProvider) return existingProvider;

    const startedAt = Date.now();
    return await new Promise((resolve) => {
      let timer: number | undefined;

      const finish = (provider: EthereumProvider | null) => {
        if (timer !== undefined) window.clearTimeout(timer);
        window.removeEventListener(
          "ethereum#initialized",
          handleProviderInjection,
        );
        window.removeEventListener(
          "eip6963:announceProvider",
          handleProviderInjection,
        );
        resolve(provider);
      };

      const checkProvider = () => {
        try {
          const provider = getWalletProvider(kind);
          if (provider || Date.now() - startedAt >= timeoutMs) {
            finish(provider);
            return;
          }
          timer = window.setTimeout(checkProvider, 100);
        } catch {
          finish(null);
        }
      };

      const handleProviderInjection = () => {
        window.setTimeout(checkProvider, 0);
      };

      window.addEventListener("ethereum#initialized", handleProviderInjection);
      window.addEventListener(
        "eip6963:announceProvider",
        handleProviderInjection,
      );
      window.dispatchEvent(new Event("eip6963:requestProvider"));
      timer = window.setTimeout(checkProvider, 100);
    });
  } catch {
    return null;
  }
}

export function shortenAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
