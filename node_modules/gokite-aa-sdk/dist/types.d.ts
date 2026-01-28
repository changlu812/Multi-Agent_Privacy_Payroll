export interface UserOperation {
    sender: string;
    nonce: bigint;
    initCode: string;
    callData: string;
    accountGasLimits: string;
    preVerificationGas: bigint;
    gasFees: string;
    paymasterAndData: string;
    signature: string;
}
export interface UserOperationGasEstimate {
    callGasLimit: bigint;
    verificationGasLimit: bigint;
    preVerificationGas: bigint;
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
}
export interface UserOperationRequest {
    target: string;
    value?: bigint;
    callData: string;
}
export interface BatchUserOperationRequest {
    targets: string[];
    values?: bigint[];
    callDatas: string[];
}
export interface UserOperationStatus {
    userOpHash: string;
    status: 'pending' | 'included' | 'failed' | 'success' | 'reverted';
    transactionHash?: string;
    blockNumber?: number;
    gasUsed?: string;
    actualGasCost?: string;
    reason?: string;
    receipt?: UserOperationReceipt;
}
export interface PollingOptions {
    interval?: number;
    timeout?: number;
    maxRetries?: number;
}
export interface PaymasterTokenCost {
    tokenAddress: string;
    tokenSymbol?: string;
    tokenDecimals?: number;
    estimatedCost: string;
    formattedCost: string;
}
export interface UserOperationEstimate {
    totalCostKITE: string;
    totalCostKITEFormatted: string;
    gasEstimate: UserOperationGasEstimate;
    sponsorshipAvailable: boolean;
    remainingSponsorships: number;
    supportedTokens: PaymasterTokenCost[];
    paymasterAddress?: string;
    userOp: Partial<UserOperation>;
}
export interface AAError {
    type: 'ESTIMATE_GAS_FAILED' | 'SEND_USEROP_FAILED' | 'INSUFFICIENT_FUNDS' | 'INVALID_SIGNATURE' | 'BUNDLER_ERROR' | 'NETWORK_ERROR' | 'UNKNOWN_ERROR';
    message: string;
    code?: number;
    details?: any;
}
export declare class AASDKError extends Error {
    readonly type: AAError['type'];
    readonly code?: number;
    readonly details?: any;
    constructor(error: AAError);
}
export interface SignFunction {
    (userOpHash: string): Promise<string>;
}
export interface AAProvider {
    estimateUserOperationGas(userOp: Partial<UserOperation>, entryPoint: string): Promise<UserOperationGasEstimate>;
    sendUserOperation(userOp: UserOperation, entryPoint: string): Promise<string>;
    getUserOperationStatus(userOpHash: string): Promise<UserOperationStatus>;
    getUserOperationByHash(userOpHash: string): Promise<UserOperation | null>;
}
export interface BundlerResponse<T = any> {
    jsonrpc: string;
    id: number;
    result?: T;
    error?: {
        code: number;
        message: string;
    };
}
export interface GasEstimateResult {
    callGasLimit: string;
    verificationGasLimit: string;
    preVerificationGas: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
}
export interface UserOperationReceipt {
    userOpHash: string;
    sender: string;
    nonce: string;
    actualGasCost: string;
    actualGasUsed: string;
    success: boolean;
    receipt: {
        transactionHash: string;
        blockNumber: string;
        gasUsed: string;
        logs: any[];
    };
    reason?: string;
}
