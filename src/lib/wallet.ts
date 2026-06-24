import type {
  Eip6963ProviderDetail,
  EthereumProvider,
  TronProvider,
  WalletKind,
  WalletProvider,
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

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object");
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
  if (typeof window === "undefined") return false;

  const userAgent = window.navigator?.userAgent?.toLowerCase() ?? "";
  return /tokenpocket|tpwallet/.test(userAgent);
}

function isTokenPocketEnvironment() {
  if (typeof window === "undefined") return false;

  return Boolean(
    window.tokenpocket ||
      window.tp ||
      window.tronWeb ||
      isTokenPocketUserAgent(),
  );
}

function getTokenPocketEvmProvider(): EthereumProvider | null {
  if (typeof window === "undefined") return null;

  const ethereum = window.ethereum;
  const providers = ethereum?.providers ?? (ethereum ? [ethereum] : []);
  const eip6963Entries = [...announcedProviders.entries()];
  const candidates = [
    window.tp?.ethereum,
    window.tokenpocket?.ethereum,
    providers.find((provider) => provider.isTokenPocket),
    eip6963Entries.find(
      ([rdns]) =>
        rdns.includes("tokenpocket") || rdns.includes("tpwallet"),
    )?.[1],
    ethereum?.isTokenPocket ? ethereum : undefined,
    isTokenPocketEnvironment() ? ethereum : undefined,
  ];

  return candidates.find(isProvider) ?? null;
}

export function getWalletProvider(kind: WalletKind): WalletProvider | null {
  if (typeof window === "undefined") return null;

  try {
    startProviderDiscovery();

    const ethereum = window.ethereum;
    const providers = ethereum?.providers ?? (ethereum ? [ethereum] : []);
    const eip6963Entries = [...announcedProviders.entries()];

    if (kind === "tokenpocket") {
      const evmProvider = getTokenPocketEvmProvider();
      if (evmProvider) return evmProvider;
      if (isObject(window.tronWeb)) return window.tronWeb;
      if (isObject(window.tokenpocket)) return window.tokenpocket;
      if (isObject(window.tp)) return window.tp;

      return isTokenPocketUserAgent() ? {} : null;
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
): Promise<WalletProvider | null> {
  if (typeof window === "undefined") return null;

  try {
    startProviderDiscovery();

    const existingProvider = getWalletProvider(kind);
    if (existingProvider) return existingProvider;

    const startedAt = Date.now();
    return await new Promise((resolve) => {
      let timer: number | undefined;

      const finish = (provider: WalletProvider | null) => {
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

function readTronAddress(provider: TronProvider): string | null {
  return (
    provider.defaultAddress?.base58 ??
    provider.defaultAddress?.hex ??
    null
  );
}

function readAccountFromResponse(response: unknown): string | null {
  if (Array.isArray(response) && typeof response[0] === "string") {
    return response[0];
  }

  if (isObject(response)) {
    if (typeof response.address === "string") return response.address;
    if (
      Array.isArray(response.accounts) &&
      typeof response.accounts[0] === "string"
    ) {
      return response.accounts[0];
    }
  }

  return null;
}

export async function requestWalletAddress(
  kind: WalletKind,
  provider: WalletProvider,
): Promise<string | null> {
  if (typeof window === "undefined") return null;

  if (kind === "metamask") {
    if (!isProvider(provider)) return null;
    const accounts = await provider.request({
      method: "eth_requestAccounts",
    });
    return readAccountFromResponse(accounts);
  }

  const evmProvider = getTokenPocketEvmProvider();
  if (evmProvider) {
    const accounts = await evmProvider.request({
      method: "eth_requestAccounts",
    });
    return readAccountFromResponse(accounts);
  }

  const tronWeb = window.tronWeb;
  if (!tronWeb) return null;

  const existingAddress = readTronAddress(tronWeb);
  if (existingAddress) return existingAddress;

  if (typeof tronWeb.request === "function") {
    const response = await tronWeb.request({
      method: "tron_requestAccounts",
    });
    const responseAddress = readAccountFromResponse(response);
    if (responseAddress) return responseAddress;
  }

  const startedAt = Date.now();
  while (Date.now() - startedAt < 1500) {
    const address = readTronAddress(tronWeb);
    if (address) return address;
    await new Promise((resolve) => window.setTimeout(resolve, 100));
  }

  return null;
}

export type WalletSignResult = "signed" | "unsupported";

export async function signWalletLogin(
  kind: WalletKind,
  provider: WalletProvider,
  address: string,
): Promise<WalletSignResult> {
  if (typeof window === "undefined") return "unsupported";

  const message = "Sign in to Orbit Points";

  try {
    if (kind === "metamask") {
      if (!isProvider(provider)) return "unsupported";
      await provider.request({
        method: "personal_sign",
        params: [message, address],
      });
      return "signed";
    }

    const evmProvider = getTokenPocketEvmProvider();
    if (evmProvider) {
      await evmProvider.request({
        method: "personal_sign",
        params: [message, address],
      });
      return "signed";
    }

    const tronSign = window.tronWeb?.trx?.sign;
    if (typeof tronSign !== "function") return "unsupported";

    await tronSign.call(window.tronWeb?.trx, message);
    return "signed";
  } catch (error) {
    throw error;
  }
}

export function shortenAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
