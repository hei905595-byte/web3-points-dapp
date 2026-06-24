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

declare global {
  interface Window {
    ethereum?: EthereumProvider;
    tp?: EthereumProvider & {
      ethereum?: EthereumProvider;
    };
    tokenpocket?: EthereumProvider & {
      ethereum?: EthereumProvider;
    };
  }
}
