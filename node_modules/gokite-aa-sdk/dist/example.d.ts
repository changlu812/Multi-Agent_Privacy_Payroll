import { GokiteAASDK } from './gokite-aa-sdk';
import "dotenv/config";
declare function initializeSDK(): GokiteAASDK;
declare function handleAAError(error: any): {
    type: string;
    message: string;
    details?: any;
};
/**
 * Transfer ERC20 tokens from AA wallet to another address
 * 从AA钱包转账ERC20代币到其他地址
 *
 * @param eoa - User's EOA address (from Privy)
 * @param to - Recipient address
 * @param amount - Amount to transfer
 * @param tokenAddress - Token contract address
 * @param tokenDecimals - Token decimals (usually 18)
 * @param signFunction - Signing function from Privy
 */
export declare function transferERC20(eoa: string, to: string, amount: string, tokenAddress: string, tokenDecimals: number | undefined, signFunction: (userOpHash: string) => Promise<string>): Promise<{
    success: boolean;
    transactionHash: string | undefined;
    message: string;
    error?: undefined;
} | {
    success: boolean;
    error: string | undefined;
    message: string;
    transactionHash?: undefined;
} | {
    success: boolean;
    error: {
        type: string;
        message: string;
        details?: any;
    };
    message: string;
    transactionHash?: undefined;
}>;
/**
 * 部署KitePass合约
 *
 * @param eoa - User's EOA address
 * @param signFunction - Signing function from Privy
 * @returns Deployed KitePass address
 */
export declare function deployKitePass(eoa: string, signFunction: (userOpHash: string) => Promise<string>): Promise<{
    success: boolean;
    proxyAddress?: string;
    error?: any;
}>;
/**
 * Configure spending rules for KitePass
 *  setSpendingRules方法会先清除现有的rules，然后设置新的rules
 * 1. 新增/修改：需要先获取现有的rules，然后append新的rules，或者在现有rules的基础上修改
 * 2. 删除：需要先获取现有的rules，然后删除对应的rules
 *
 * @param eoa - User's EOA address
 * @param kitepassAddress - KitePass proxy address
 * @param rules - Spending rules to configure
 * @param signFunction - Signing function
 */
export declare function configureSpendingRules(eoa: string, kitepassAddress: string, signFunction: (userOpHash: string) => Promise<string>): Promise<{
    success: boolean;
    transactionHash: string | undefined;
    error?: undefined;
} | {
    success: boolean;
    error: string | undefined;
    transactionHash?: undefined;
} | {
    success: boolean;
    error: {
        type: string;
        message: string;
        details?: any;
    };
    transactionHash?: undefined;
}>;
/**
 * View current spending rules (read-only)
 * 查看当前消费规则（只读）
 */
export declare function viewSpendingRules(kitepassAddress: string): Promise<{
    success: boolean;
    rules: any;
    error?: undefined;
} | {
    success: boolean;
    error: string;
    rules?: undefined;
}>;
/**
 * Withdraw funds from KitePass
 * 从KitePass提取资金
 */
export declare function withdrawFunds(eoa: string, kitepassAddress: string, amount: string, tokenAddress: string | undefined, signFunction: (userOpHash: string) => Promise<string>): Promise<{
    success: boolean;
    transactionHash: string | undefined;
    error?: undefined;
} | {
    success: boolean;
    error: string | undefined;
    transactionHash?: undefined;
} | {
    success: boolean;
    error: {
        type: string;
        message: string;
        details?: any;
    };
    transactionHash?: undefined;
}>;
/**
 * Check token balance (read-only)
 * 查看代币余额（只读）
 */
export declare function checkTokenBalance(address: string, tokenAddress?: string): Promise<{
    success: boolean;
    balance: string;
    symbol: any;
    decimals: any;
    address: string;
    error?: undefined;
} | {
    success: boolean;
    error: string;
    balance?: undefined;
    symbol?: undefined;
    decimals?: undefined;
    address?: undefined;
}>;
export interface ServiceInfo {
    serviceOwner: string;
    priceModel: number;
    unitPrice: number;
    provider: string;
    metadata: string;
    name: string;
    isPublic: boolean;
}
/**
 * Register a service in the service registry
 * 在服务注册表中注册服务
 *
 * @param eoa - Service owner's EOA address
 * @param serviceId - Service ID (bytes32)
 * @param serviceInfo - Service information
 * @param signFunction - Signing function
 */
export declare function registerService(eoa: string, serviceId: string, serviceInfo: ServiceInfo, signFunction: (userOpHash: string) => Promise<string>): Promise<{
    success: boolean;
    transactionHash: string | undefined;
    serviceId: string;
    error?: undefined;
} | {
    success: boolean;
    error: string | undefined;
    transactionHash?: undefined;
    serviceId?: undefined;
} | {
    success: boolean;
    error: {
        type: string;
        message: string;
        details?: any;
    };
    transactionHash?: undefined;
    serviceId?: undefined;
}>;
/**
 * Get TransparentUpgradeableProxy bytecode
 * 获取透明可升级代理字节码
 */
declare function getTransparentProxyBytecode(): string;
/**
 * Parse ContractCreated event from transaction logs
 * 从交易日志中解析合约创建事件
 */
declare function parseContractCreatedEvent(transactionHash: string): Promise<string | null>;
export { initializeSDK, handleAAError, getTransparentProxyBytecode, parseContractCreatedEvent };
