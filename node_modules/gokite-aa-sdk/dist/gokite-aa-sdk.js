"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GokiteAASDK = void 0;
const ethers_1 = require("ethers");
const types_1 = require("./types");
const config_1 = require("./config");
const utils_1 = require("./utils");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Error classification helper
function classifyError(error, context) {
    // Network/fetch errors
    if (error.name === 'TypeError' || error.message?.includes('fetch')) {
        return {
            type: 'NETWORK_ERROR',
            message: `Network error during ${context}: ${error.message}`,
            details: error
        };
    }
    // Bundler RPC errors
    if (error.code) {
        const errorType = context.includes('estimate') ? 'ESTIMATE_GAS_FAILED' : 'SEND_USEROP_FAILED';
        let specificType = errorType;
        // Common error codes mapping
        if (error.code === -32602 || error.message?.includes('insufficient funds')) {
            specificType = 'INSUFFICIENT_FUNDS';
        }
        else if (error.code === -32602 || error.message?.includes('signature')) {
            specificType = 'INVALID_SIGNATURE';
        }
        else if (error.code < 0) {
            specificType = 'BUNDLER_ERROR';
        }
        return {
            type: specificType,
            message: error.message || `${context} failed`,
            code: error.code,
            details: error
        };
    }
    // Generic error
    return {
        type: 'UNKNOWN_ERROR',
        message: error.message || `Unknown error during ${context}`,
        details: error
    };
}
class BundlerProvider {
    constructor(bundlerUrl) {
        this.bundlerUrl = bundlerUrl;
    }
    async estimateUserOperationGas(userOp, entryPoint) {
        try {
            const response = await fetch(this.bundlerUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: Date.now(),
                    method: 'eth_estimateUserOperationGas',
                    params: [(0, utils_1.serializeUserOperation)(userOp), entryPoint]
                })
            });
            const result = await response.json();
            if (result.error) {
                throw new types_1.AASDKError(classifyError(result.error, 'estimate gas'));
            }
            if (!result.result) {
                throw new types_1.AASDKError({
                    type: 'ESTIMATE_GAS_FAILED',
                    message: 'No gas estimate result returned from bundler'
                });
            }
            return {
                callGasLimit: BigInt(result.result.callGasLimit),
                verificationGasLimit: BigInt(result.result.verificationGasLimit),
                preVerificationGas: BigInt(result.result.preVerificationGas),
                // maxFeePerGas: BigInt(result.result.maxFeePerGas || 1000000000n), // 1 gwei
                // maxPriorityFeePerGas: BigInt(result.result.maxPriorityFeePerGas || 1000000000n), // 1 gwei
                maxFeePerGas: BigInt(1000000000n),
                maxPriorityFeePerGas: BigInt(1000000000n),
            };
        }
        catch (error) {
            if (error instanceof types_1.AASDKError)
                throw error;
            throw new types_1.AASDKError(classifyError(error, 'estimate gas'));
        }
    }
    async sendUserOperation(userOp, entryPoint) {
        try {
            const serializedUserOp = (0, utils_1.serializeUserOperation)(userOp);
            // console.log('Sending UserOp to bundler:', JSON.stringify(serializedUserOp, null, 2));
            const response = await fetch(this.bundlerUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: Date.now(),
                    method: 'eth_sendUserOperation',
                    params: [serializedUserOp, entryPoint]
                })
            });
            const result = await response.json();
            if (result.error) {
                throw new types_1.AASDKError(classifyError(result.error, 'send user operation'));
            }
            if (!result.result) {
                throw new types_1.AASDKError({
                    type: 'SEND_USEROP_FAILED',
                    message: 'No user operation hash returned from bundler'
                });
            }
            return result.result;
        }
        catch (error) {
            if (error instanceof types_1.AASDKError)
                throw error;
            throw new types_1.AASDKError(classifyError(error, 'send user operation'));
        }
    }
    async getUserOperationStatus(userOpHash) {
        const response = await fetch(this.bundlerUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: Date.now(),
                method: 'eth_getUserOperationReceipt',
                params: [userOpHash]
            })
        });
        const result = await response.json();
        // If error or no result, operation is still pending
        if (result.error || !result.result) {
            return { userOpHash, status: 'pending' };
        }
        const receipt = result.result;
        // Determine status based on success field
        let status;
        if (receipt.success) {
            status = 'success';
        }
        else {
            status = 'reverted';
        }
        return {
            userOpHash,
            status,
            transactionHash: receipt.receipt.transactionHash,
            blockNumber: parseInt(receipt.receipt.blockNumber, 16),
            gasUsed: receipt.receipt.gasUsed,
            actualGasCost: receipt.actualGasCost,
            reason: receipt.reason,
            receipt
        };
    }
    async getUserOperationByHash(userOpHash) {
        const response = await fetch(this.bundlerUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: Date.now(),
                method: 'eth_getUserOperationByHash',
                params: [userOpHash]
            })
        });
        const result = await response.json();
        return result.result || null;
    }
}
/**
 * Main Gokite AA SDK class
 */
class GokiteAASDK {
    constructor(network, rpcUrl, bundlerUrl) {
        this.config = config_1.NETWORKS[network];
        if (!this.config) {
            throw new Error(`Unsupported network: ${network}`);
        }
        this.ethersProvider = new ethers_1.ethers.JsonRpcProvider(rpcUrl);
        if (bundlerUrl) {
            this.provider = new BundlerProvider(bundlerUrl);
        }
        else {
            throw new Error('Bundler URL is required');
        }
    }
    /**
     * Calculate account address for a given owner and salt
     */
    getAccountAddress(owner, salt) {
        const actualSalt = salt || (0, utils_1.generateSalt)();
        return (0, utils_1.getAccountAddress)(this.config.accountFactory, this.config.accountImplementation, owner, actualSalt);
    }
    /**
     * Get account nonce
     */
    async getAccountNonce(accountAddress) {
        const entryPoint = new ethers_1.ethers.Contract(this.config.entryPoint, ['function getNonce(address,uint192) view returns (uint256)'], this.ethersProvider);
        return await entryPoint.getNonce(accountAddress, 0);
    }
    /**
     * Get user operation hash from EntryPoint contract
     */
    async getUserOpHash(userOp) {
        const entryPoint = new ethers_1.ethers.Contract(this.config.entryPoint, ['function getUserOpHash((address,uint256,bytes,bytes,bytes32,uint256,bytes32,bytes,bytes)) view returns (bytes32)'], this.ethersProvider);
        // Convert userOp to the format expected by the contract - ensure proper types
        const packedUserOp = [
            userOp.sender,
            userOp.nonce,
            userOp.initCode,
            userOp.callData,
            userOp.accountGasLimits,
            userOp.preVerificationGas,
            userOp.gasFees,
            userOp.paymasterAndData,
            '0x' // signature (empty for hash calculation)
        ];
        const hash = await entryPoint.getUserOpHash(packedUserOp);
        return hash;
    }
    /**
     * Check if account is deployed
     */
    async isAccountDeloyed(accountAddress) {
        const code = await this.ethersProvider.getCode(accountAddress);
        return code !== '0x';
    }
    /**
     * Build init code for account creation
     */
    buildInitCode(owner, salt) {
        const initCallData = (0, utils_1.encodeFunctionCall)(['function createAccount(address,uint256) returns (address)'], 'createAccount', [owner, salt]);
        return this.config.accountFactory + initCallData.slice(2);
    }
    /**
     * Build call data for single transaction
     */
    buildCallData(request) {
        return (0, utils_1.encodeFunctionCall)(['function execute(address,uint256,bytes)'], 'execute', [request.target, request.value || 0n, request.callData]);
    }
    /**
     * Build call data for batch transactions
     */
    buildBatchCallData(request) {
        const values = request.values || new Array(request.targets.length).fill(0n);
        return (0, utils_1.encodeFunctionCall)(['function executeBatch(address[],uint256[],bytes[])'], 'executeBatch', [request.targets, values, request.callDatas]);
    }
    /**
     * Prepend addSupportedToken call to request for first transaction (wallet deployment)
     * Uses settlement token from config (supportedTokens[1])
     */
    prependAddSupportedToken(request, accountAddress) {
        const settlementToken = this.config.settlementToken;
        const addTokenCallData = (0, utils_1.encodeFunctionCall)(['function addSupportedToken(address)'], 'addSupportedToken', [settlementToken]);
        if ('target' in request) {
            // Convert single request to batch with addSupportedToken prepended
            return {
                targets: [accountAddress, request.target],
                values: [BigInt(0), request.value || BigInt(0)],
                callDatas: [addTokenCallData, request.callData]
            };
        }
        else {
            // Prepend to existing batch
            return {
                targets: [accountAddress, ...request.targets],
                values: [BigInt(0), ...(request.values || new Array(request.targets.length).fill(BigInt(0)))],
                callDatas: [addTokenCallData, ...request.callDatas]
            };
        }
    }
    /**
     * Create user operation
     * If wallet is not deployed, automatically batch addSupportedToken into the first transaction
     */
    async createUserOperation(owner, request, salt, paymasterAddress, tokenAddress) {
        const actualSalt = salt || (0, utils_1.generateSalt)();
        const accountAddress = this.getAccountAddress(owner, actualSalt);
        const isDeployed = await this.isAccountDeloyed(accountAddress);
        // If wallet not deployed, batch addSupportedToken into first transaction
        let finalRequest = request;
        if (!isDeployed) {
            finalRequest = this.prependAddSupportedToken(request, accountAddress);
        }
        const callData = 'targets' in finalRequest
            ? this.buildBatchCallData(finalRequest)
            : this.buildCallData(finalRequest);
        // Gas settings (matching Go implementation)
        const callGasLimit = BigInt(300000);
        const verificationGasLimit = BigInt(300000);
        const preVerificationGas = BigInt(1000000);
        const maxFeePerGas = BigInt(10000000); // 0.001 gwei
        const maxPriorityFeePerGas = BigInt(1); // 1 wei
        // Pack gas limits and fees (note: verificationGasLimit first, callGasLimit second)
        const accountGasLimits = (0, utils_1.packAccountGasLimits)(verificationGasLimit, callGasLimit);
        const gasFees = (0, utils_1.packAccountGasLimits)(maxPriorityFeePerGas, maxFeePerGas);
        if (!paymasterAddress) {
            paymasterAddress = this.config.paymaster;
        }
        // Pack paymaster data (paymasterAddress, paymasterVerificationGasLimit, postOpGasLimit, paymasterData) 
        let paymasterAndData = '0x';
        if (paymasterAddress) {
            // For token payments, append token address to paymaster data
            tokenAddress = tokenAddress || this.config.supportedTokens[1].address;
            const paymasterData = ethers_1.ethers.solidityPacked(['address'], [tokenAddress]);
            paymasterAndData = (0, utils_1.packPaymasterAndData)(paymasterAddress, BigInt(500000), BigInt(500000), paymasterData);
        }
        return {
            sender: accountAddress,
            nonce: await this.getAccountNonce(accountAddress),
            initCode: isDeployed ? '0x' : this.buildInitCode(owner, actualSalt),
            callData,
            accountGasLimits,
            preVerificationGas,
            gasFees,
            paymasterAndData,
            signature: '0x', // Will be set later
        };
    }
    /**
     * Estimate gas for user operation
     */
    async estimateGas(userOp) {
        // Create a version with dummy signature for estimation
        const userOpForEstimation = (0, utils_1.createUserOpForEstimation)(userOp);
        return await this.provider.estimateUserOperationGas(userOpForEstimation, this.config.entryPoint);
    }
    /**
     * Sign and send user operation
     */
    async sendUserOperation(owner, request, signFn, salt, paymasterAddress, tokenAddress) {
        // Create user operation
        const userOp = await this.createUserOperation(owner, request, salt, paymasterAddress, tokenAddress);
        // Add dummy signature for gas estimation
        const userOpWithDummy = (0, utils_1.createUserOpForEstimation)(userOp);
        // Estimate gas using bundler
        const gasEstimate = await this.provider.estimateUserOperationGas(userOpWithDummy, this.config.entryPoint);
        gasEstimate.callGasLimit = gasEstimate.callGasLimit + 5000000n;
        console.log('gasEstimate:', gasEstimate);
        // Update gas fields in packed format (verificationGasLimit first, callGasLimit second)
        userOp.accountGasLimits = (0, utils_1.packAccountGasLimits)(gasEstimate.verificationGasLimit, gasEstimate.callGasLimit);
        userOp.preVerificationGas = gasEstimate.preVerificationGas;
        userOp.gasFees = (0, utils_1.packAccountGasLimits)(gasEstimate.maxPriorityFeePerGas, gasEstimate.maxFeePerGas);
        const userOpHash = await this.getUserOpHash(userOp);
        // Sign user operation
        const signature = await signFn(userOpHash);
        userOp.signature = signature;
        // // Send user operation directly to EntryPoint contract (bypassing bundler)
        // return await this.sendUserOperationDirectly(owner, userOp as UserOperation);
        return await this.provider.sendUserOperation(userOp, this.config.entryPoint);
    }
    /**
     * Send user operation directly to EntryPoint contract (bypassing bundler)
     * Note: This requires a signer to pay for gas. For now, we'll try with the read-only provider.
     */
    async sendUserOperationDirectly(owner, userOp) {
        // TODO: We need a signer here to pay for gas
        // For now, let's see what error we get with the read-only provider
        const entryPoint = new ethers_1.ethers.Contract(this.config.entryPoint, [
            'function handleOps((address,uint256,bytes,bytes,bytes32,uint256,bytes32,bytes,bytes)[] calldata ops, address payable beneficiary) external'
        ], this.ethersProvider);
        // Convert userOp to the format expected by the contract
        const packedUserOp = [
            userOp.sender,
            userOp.nonce,
            userOp.initCode,
            userOp.callData,
            userOp.accountGasLimits,
            userOp.preVerificationGas,
            userOp.gasFees,
            userOp.paymasterAndData,
            userOp.signature
        ];
        // Create operations array (only one operation)
        const ops = [packedUserOp];
        // Set beneficiary (use owner address)
        const beneficiary = owner;
        console.log('Calling EntryPoint.handleOps directly...');
        console.log('ops:', ops);
        console.log('beneficiary:', beneficiary);
        const signer_pk = process.env.PRIVATE_KEY;
        const signer = new ethers_1.ethers.Wallet(signer_pk, this.ethersProvider);
        console.log('signer:', signer.address);
        try {
            // Call handleOps on EntryPoint contract
            const tx = await entryPoint.connect(signer).handleOps(ops, beneficiary, {
                gasLimit: 1000000,
            });
            console.log('Transaction sent:', tx.hash);
            // Wait for transaction confirmation
            const receipt = await tx.wait();
            console.log('Transaction confirmed:', receipt.hash);
            return tx.hash;
        }
        catch (error) {
            console.error('EntryPoint.handleOps failed:', error);
            throw error;
        }
    }
    /**
     * Get user operation status
     */
    async getUserOperationStatus(userOpHash) {
        return await this.provider.getUserOperationStatus(userOpHash);
    }
    /**
     * Enhanced polling for user operation status with detailed result parsing
     */
    async pollUserOperationStatus(userOpHash, options = {}) {
        const { interval = 2000, timeout = 60000, maxRetries = 30 } = options;
        const startTime = Date.now();
        let retryCount = 0;
        while (Date.now() - startTime < timeout && retryCount < maxRetries) {
            try {
                const status = await this.getUserOperationStatus(userOpHash);
                // Check if operation is completed (either success or failed)
                if (status.status === 'success' || status.status === 'reverted' || status.status === 'failed') {
                    console.log(`UserOp completed:`, {
                        status: status.status,
                        transactionHash: status.transactionHash,
                        gasUsed: status.gasUsed,
                        actualGasCost: status.actualGasCost,
                        reason: status.reason
                    });
                    return status;
                }
                retryCount++;
                if (retryCount < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, interval));
                }
            }
            catch (error) {
                console.error(`polling error (attempt ${retryCount + 1}):`, error);
                retryCount++;
                if (retryCount < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, interval));
                }
            }
        }
        throw new Error(`UserOp polling timeout: ${userOpHash} (attempt ${retryCount})`);
    }
    /**
     * Estimate user operation costs and get paymaster information
     */
    async estimateUserOperation(owner, request) {
        console.log('Estimating UserOp costs...');
        const paymasterAddress = this.config.paymaster;
        try {
            // Always estimate with paymaster for higher gas limits
            const userOp = await this.createUserOperation(owner, request, undefined, paymasterAddress);
            console.log('[estimateUserOperation]userOp:', userOp);
            const gasEstimate = await this.estimateGas(userOp);
            gasEstimate.callGasLimit = gasEstimate.callGasLimit + 5000000n;
            gasEstimate.verificationGasLimit = gasEstimate.verificationGasLimit + 1000000n;
            gasEstimate.preVerificationGas = gasEstimate.preVerificationGas + 1000000n;
            // gasEstimate.maxFeePerGas = BigInt(gasEstimate.maxFeePerGas || 1000000000n); // 1 gwei
            // gasEstimate.maxPriorityFeePerGas = BigInt(gasEstimate.maxPriorityFeePerGas || 1000000000n); // 1 gwei
            gasEstimate.maxFeePerGas = BigInt(1000000000n);
            gasEstimate.maxPriorityFeePerGas = BigInt(1000000000n);
            userOp.gasFees = (0, utils_1.packAccountGasLimits)(gasEstimate.maxPriorityFeePerGas, gasEstimate.maxFeePerGas);
            // Pack gas limits and fees (note: verificationGasLimit first, callGasLimit second)
            userOp.accountGasLimits = (0, utils_1.packAccountGasLimits)(gasEstimate.verificationGasLimit, gasEstimate.callGasLimit);
            userOp.preVerificationGas = gasEstimate.preVerificationGas;
            // Calculate total cost in KITE
            const totalGas = gasEstimate.callGasLimit + gasEstimate.verificationGasLimit + gasEstimate.preVerificationGas;
            const totalCostWei = totalGas * gasEstimate.maxFeePerGas;
            const totalCostKITE = totalCostWei.toString();
            const totalCostKITEFormatted = ethers_1.ethers.formatEther(totalCostWei);
            // Get paymaster info
            const { sponsorshipAvailable, remainingSponsorships, supportedTokens } = await this.getPaymasterInfo(paymasterAddress, userOp.sender, totalCostWei);
            return {
                totalCostKITE,
                totalCostKITEFormatted,
                gasEstimate,
                sponsorshipAvailable,
                remainingSponsorships,
                supportedTokens,
                paymasterAddress,
                userOp
            };
        }
        catch (error) {
            throw new types_1.AASDKError(classifyError(error, 'estimate user operation'));
        }
    }
    /**
     * Get paymaster information including sponsorship status and supported tokens
     */
    async getPaymasterInfo(paymasterAddress, userAddress, estimatedCost) {
        const paymasterABI = [
            'function maxSponsoredTransactions() view returns (uint256)',
            'function userSponsorship(address user) view returns (uint256)',
            'function supportedTokens(address token) view returns (uint256)',
            'function maxCostPerSponsoredTransaction() view returns (uint256)'
        ];
        const paymaster = new ethers_1.ethers.Contract(paymasterAddress, paymasterABI, this.ethersProvider);
        // Get sponsorship info
        const [maxSponsorships, userSponsorships, maxCostPerSponsorship] = await Promise.all([
            paymaster.maxSponsoredTransactions(),
            paymaster.userSponsorship(userAddress),
            paymaster.maxCostPerSponsoredTransaction()
        ]);
        const remainingSponsorships = Math.max(0, Number(maxSponsorships) - Number(userSponsorships));
        const sponsorshipAvailable = remainingSponsorships > 0 && estimatedCost <= maxCostPerSponsorship;
        // Check supported tokens from config
        const supportedTokens = [];
        for (const token of this.config.supportedTokens) {
            try {
                const exchangeRate = await paymaster.supportedTokens(token.address);
                if (exchangeRate > 0) {
                    const tokenCost = (estimatedCost * BigInt(1e18)) / exchangeRate;
                    const formattedCost = `${ethers_1.ethers.formatUnits(tokenCost, token.decimals)} ${token.symbol}`;
                    supportedTokens.push({
                        tokenAddress: token.address,
                        tokenSymbol: token.symbol,
                        tokenDecimals: token.decimals,
                        estimatedCost: tokenCost.toString(),
                        formattedCost
                    });
                }
            }
            catch (error) {
                console.warn(`Failed to check token ${token.symbol}:`, error);
            }
        }
        return {
            sponsorshipAvailable,
            remainingSponsorships,
            supportedTokens
        };
    }
    /**
     * Send user operation and wait for completion with detailed status
     */
    /**
     * Send user operation with specified payment token and wait for completion
     */
    async sendUserOperationWithPayment(owner, request, baseUserOp, // base userOp from estimate
    tokenAddress, // token address for payment
    signFn, salt, pollingOptions) {
        console.log('Sending UserOp with token:', tokenAddress);
        let finalRequest = request;
        let finalUserOp = { ...baseUserOp };
        // If using ERC20 token (not 0x0), add approve operations
        if (tokenAddress !== '0x0000000000000000000000000000000000000000') {
            // Add approve operations to the request
            finalRequest = await this.addApproveOperation(owner, request, tokenAddress, this.config.paymaster);
            // Rebuild userOp with approve operations
            finalUserOp = await this.createUserOperation(owner, finalRequest, salt, this.config.paymaster, tokenAddress);
            // Copy gas estimates from base userOp
            finalUserOp.accountGasLimits = baseUserOp.accountGasLimits;
            finalUserOp.preVerificationGas = baseUserOp.preVerificationGas;
            finalUserOp.gasFees = baseUserOp.gasFees;
        }
        // Get user operation hash
        const userOpHash = await this.getUserOpHash(finalUserOp);
        // Sign user operation
        const signature = await signFn(userOpHash);
        finalUserOp.signature = signature;
        // Send to bundler
        const sentUserOpHash = await this.provider.sendUserOperation(finalUserOp, this.config.entryPoint);
        console.log(`UserOp sent: ${sentUserOpHash}`);
        // Poll for status
        const status = await this.pollUserOperationStatus(sentUserOpHash, pollingOptions);
        return {
            userOpHash: sentUserOpHash,
            status
        };
    }
    /**
     * Add ERC20 approve operations to the request (approve 0 first, then max)
     */
    async addApproveOperation(owner, request, tokenAddress, paymasterAddress) {
        // Create approve call data - first approve 0, then approve max
        const approve0CallData = (0, utils_1.encodeFunctionCall)(['function approve(address,uint256) returns (bool)'], 'approve', [paymasterAddress, '0']);
        const approveMaxCallData = (0, utils_1.encodeFunctionCall)(['function approve(address,uint256) returns (bool)'], 'approve', [paymasterAddress, ethers_1.ethers.MaxUint256.toString()]);
        // Convert single request to batch if needed
        if ('target' in request) {
            return {
                targets: [tokenAddress, tokenAddress, request.target],
                values: [BigInt(0), BigInt(0), request.value || BigInt(0)],
                callDatas: [approve0CallData, approveMaxCallData, request.callData]
            };
        }
        else {
            return {
                targets: [tokenAddress, tokenAddress, ...request.targets],
                values: [BigInt(0), BigInt(0), ...(request.values || [])],
                callDatas: [approve0CallData, approveMaxCallData, ...request.callDatas]
            };
        }
    }
    async sendUserOperationAndWait(owner, request, signFn, salt, paymasterAddress, pollingOptions) {
        console.log('Sending UserOp and waiting for completion...');
        // Step 1: Send user operation
        const userOpHash = await this.sendUserOperation(owner, request, signFn, salt, paymasterAddress);
        console.log(`UserOp sent: ${userOpHash}`);
        // Step 2: Poll for status until completion
        const status = await this.pollUserOperationStatus(userOpHash, pollingOptions);
        return {
            userOpHash,
            status
        };
    }
}
exports.GokiteAASDK = GokiteAASDK;
