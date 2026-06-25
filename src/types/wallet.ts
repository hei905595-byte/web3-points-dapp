export type WalletKind = "tronlink" | "tokenpocket";

export interface TronProvider {
  ready?: boolean;
  defaultAddress?: {
    base58?: string;
    hex?: string;
  };
  trx?: {
    signMessageV2?(message: string): Promise<string> | string;
  };
  request?(args: {
    method: string;
    params?: unknown[] | Record<string, unknown>;
  }): Promise<unknown>;
}

export type WalletProvider = TronProvider;

declare global {
  interface Window {
    tronWeb?: TronProvider;
    tronLink?: TronProvider;
    tokenpocket?: { tronWeb?: TronProvider };
    tp?: { tronWeb?: TronProvider };
  }
}
