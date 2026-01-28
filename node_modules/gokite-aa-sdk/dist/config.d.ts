export interface NetworkConfig {
    chainId: number;
    entryPoint: string;
    accountFactory: string;
    accountImplementation: string;
    bundlerUrl?: string;
    paymaster?: string;
    settlementToken: string;
    supportedTokens: {
        address: string;
        symbol: string;
        decimals: number;
    }[];
}
export declare const NETWORKS: Record<string, NetworkConfig>;
