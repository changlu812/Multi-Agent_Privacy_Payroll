/**
 * Calculate the counterfactual address of a GokiteAccount
 * This matches the logic in GokiteAccountFactory.getAddress()
 */
export declare function getAccountAddress(factoryAddress: string, implementationAddress: string, owner: string, salt: bigint): string;
/**
 * Encode function call data
 */
export declare function encodeFunctionCall(abi: string[], functionName: string, params: any[]): string;
/**
 * Pack user operation for hashing
 */
export declare function packUserOperation(userOp: any): string;
/**
 * Pack account gas limits into 32 bytes
 * @param verificationGasLimit Verification gas limit (16 bytes, first half)
 * @param callGasLimit Call gas limit (16 bytes, second half)
 * @returns 32 bytes packed data as hex string
 */
export declare function packAccountGasLimits(verificationGasLimit: bigint, callGasLimit: bigint): string;
/**
 * Pack paymaster and data
 * @param paymasterAddress Paymaster contract address (20 bytes)
 * @param paymasterVerificationGasLimit Paymaster verification gas limit (16 bytes)
 * @param postOpGasLimit Post operation gas limit (16 bytes)
 * @param paymasterData Additional paymaster data (variable length)
 * @returns Packed paymaster and data as hex string
 */
export declare function packPaymasterAndData(paymasterAddress: string, paymasterVerificationGasLimit: bigint, postOpGasLimit: bigint, paymasterData?: string): string;
/**
 * Get user operation hash
 */
export declare function getUserOperationHash(userOp: any, entryPointAddress: string, chainId: number): string;
/**
 * Convert bigint values to hex strings for JSON serialization
 * Also unpacks PackedUserOperation format to legacy format for bundler compatibility
 */
export declare function serializeUserOperation(userOp: any): any;
export declare function generateSalt(): bigint;
/**
 * Generate a dummy signature for gas estimation
 * The signature needs to be the correct length but doesn't need to be valid
 * Using a format that won't cause ECDSA.recover to revert
 */
export declare function generateDummySignature(): string;
/**
 * Create a user operation with dummy signature for gas estimation
 */
export declare function createUserOpForEstimation(userOp: any): any;
