export type WalletKind = "metamask" | "tokenpocket";

export interface EthereumProvider {
  isMetaMask?: boolean;
  isTokenPocket?: boolean;
  providers?: EthereumProvider[];
  request(args: {
    method: string;
    params?: unknown[] | Record<string, unknown>;
  }): Promise<unknown>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
}

export interface TronProvider {
  ready?: boolean;
  defaultAddress?: {
    base58?: string;
    hex?: string;
  };
  request?(args: {
    method: string;
    params?: unknown[] | Record<string, unknown>;
  }): Promise<unknown>;
}

export interface TokenPocketProvider {
  ethereum?: EthereumProvider;
  request?(args: {
    method: string;
    params?: unknown[] | Record<string, unknown>;
  }): Promise<unknown>;
}

export type WalletProvider =
  | EthereumProvider
  | TronProvider
  | TokenPocketProvider;

export interface Eip6963ProviderDetail {
  info: {
    name: string;
    rdns: string;
  };
  provider: EthereumProvider;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
    tp?: TokenPocketProvider;
    tokenpocket?: TokenPocketProvider;
    tronWeb?: TronProvider;
  }

  interface WindowEventMap {
    "eip6963:announceProvider": CustomEvent<Eip6963ProviderDetail>;
  }
}
