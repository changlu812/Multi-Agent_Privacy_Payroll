import { UserOperation, UserOperationRequest, BatchUserOperationRequest, UserOperationGasEstimate, UserOperationStatus, SignFunction, PollingOptions, UserOperationEstimate } from './types';
/**
 * Main Gokite AA SDK class
 */
export declare class GokiteAASDK {
    private config;
    private provider;
    private ethersProvider;
    constructor(network: string, rpcUrl: string, bundlerUrl?: string);
    /**
     * Calculate account address for a given owner and salt
     */
    getAccountAddress(owner: string, salt?: bigint): string;
    /**
     * Get account nonce
     */
    getAccountNonce(accountAddress: string): Promise<bigint>;
    /**
     * Get user operation hash from EntryPoint contract
     */
    getUserOpHash(userOp: any): Promise<string>;
    /**
     * Check if account is deployed
     */
    isAccountDeloyed(accountAddress: string): Promise<boolean>;
    /**
     * Build init code for account creation
     */
    buildInitCode(owner: string, salt: bigint): string;
    /**
     * Build call data for single transaction
     */
    buildCallData(request: UserOperationRequest): string;
    /**
     * Build call data for batch transactions
     */
    buildBatchCallData(request: BatchUserOperationRequest): string;
    /**
     * Prepend addSupportedToken call to request for first transaction (wallet deployment)
     * Uses settlement token from config (supportedTokens[1])
     */
    private prependAddSupportedToken;
    /**
     * Create user operation
     * If wallet is not deployed, automatically batch addSupportedToken into the first transaction
     */
    createUserOperation(owner: string, request: UserOperationRequest | BatchUserOperationRequest, salt?: bigint, paymasterAddress?: string, tokenAddress?: string): Promise<Partial<UserOperation>>;
    /**
     * Estimate gas for user operation
     */
    estimateGas(userOp: Partial<UserOperation>): Promise<UserOperationGasEstimate>;
    /**
     * Sign and send user operation
     */
    sendUserOperation(owner: string, request: UserOperationRequest | BatchUserOperationRequest, signFn: SignFunction, salt?: bigint, paymasterAddress?: string, tokenAddress?: string): Promise<string>;
    /**
     * Send user operation directly to EntryPoint contract (bypassing bundler)
     * Note: This requires a signer to pay for gas. For now, we'll try with the read-only provider.
     */
    sendUserOperationDirectly(owner: string, userOp: UserOperation): Promise<string>;
    /**
     * Get user operation status
     */
    getUserOperationStatus(userOpHash: string): Promise<UserOperationStatus>;
    /**
     * Enhanced polling for user operation status with detailed result parsing
     */
    pollUserOperationStatus(userOpHash: string, options?: PollingOptions): Promise<UserOperationStatus>;
    /**
     * Estimate user operation costs and get paymaster information
     */
    estimateUserOperation(owner: string, request: UserOperationRequest | BatchUserOperationRequest): Promise<UserOperationEstimate>;
    /**
     * Get paymaster information including sponsorship status and supported tokens
     */
    private getPaymasterInfo;
    /**
     * Send user operation and wait for completion with detailed status
     */
    /**
     * Send user operation with specified payment token and wait for completion
     */
    sendUserOperationWithPayment(owner: string, request: UserOperationRequest | BatchUserOperationRequest, baseUserOp: Partial<UserOperation>, // base userOp from estimate
    tokenAddress: string, // token address for payment
    signFn: SignFunction, salt?: bigint, pollingOptions?: PollingOptions): Promise<{
        userOpHash: string;
        status: UserOperationStatus;
    }>;
    /**
     * Add ERC20 approve operations to the request (approve 0 first, then max)
     */
    private addApproveOperation;
    sendUserOperationAndWait(owner: string, request: UserOperationRequest | BatchUserOperationRequest, signFn: SignFunction, salt?: bigint, paymasterAddress?: string, pollingOptions?: PollingOptions): Promise<{
        userOpHash: string;
        status: UserOperationStatus;
    }>;
}
