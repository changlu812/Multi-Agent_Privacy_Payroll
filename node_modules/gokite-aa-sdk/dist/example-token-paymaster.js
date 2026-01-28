"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * GokiteAccount E2E Demo with x402 Facilitator Integration
 *
 * This script demonstrates the complete AA wallet payment flow:
 * 1. Setup AA wallet: addSupportedToken + setMasterBudgetRules
 * 2. Create session with agent and spending rules
 * 3. Agent signs EIP-712 transfer authorization
 * 4. Verify payment via x402 facilitator
 * 5. Settle payment via x402 facilitator (or direct UserOp execution)
 *
 * Usage:
 *   npx tsx example-token-paymaster.ts [--settle] [--direct]
 *
 * Options:
 *   --settle  Execute real settlement via facilitator
 *   --direct  Execute direct UserOp instead of facilitator
 */
const ethers_1 = require("ethers");
const gokite_aa_sdk_1 = require("./gokite-aa-sdk");
require("dotenv/config");
// =============================================================================
// Configuration
// =============================================================================
const NETWORK = "kite_testnet";
const RPC_URL = "https://rpc-testnet.gokite.ai";
const BUNDLER_URL = "https://bundler-service.staging.gokite.ai/rpc/";
const SETTLEMENT_TOKEN = "0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
// x402 Facilitator configuration
const FACILITATOR_URL = process.env.FACILITATOR_URL || "http://localhost:8080";
const X402_NETWORK = "kite-testnet";
const CHAIN_ID = 2368;
const sdk = new gokite_aa_sdk_1.GokiteAASDK(NETWORK, RPC_URL, BUNDLER_URL);
// GokiteAccount interface (includes SessionManager functions)
const gokiteAccountInterface = new ethers_1.ethers.Interface([
    // Token whitelist
    "function addSupportedToken(address token)",
    // Master budget
    "function setMasterBudgetRules(uint256[] timeWindows, uint160[] budgets)",
    // Session management
    "function createSession(bytes32 sessionId, address agent, tuple(uint256 timeWindow, uint160 budget, uint96 initialWindowStartTime, bytes32[] targetProviders)[] rules)",
    "function setSpendingRules(bytes32 sessionId, tuple(uint256 timeWindow, uint160 budget, uint96 initialWindowStartTime, bytes32[] targetProviders)[] rules)",
    // Transfer execution
    "function executeTransferWithAuthorization(bytes32 sessionId, tuple(address from, address to, address token, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce) auth, bytes signature)",
    // Batch execution
    "function executeBatch(address[] dest, uint256[] value, bytes[] func)",
    // ============ View Functions (for frontend queries) ============
    // Token whitelist queries
    "function isTokenSupported(address token) view returns (bool)",
    "function getTokenDecimals(address token) view returns (uint8)",
    "function getAvailableBalance(address token) view returns (uint256)",
    // Session queries
    "function sessionExists(bytes32 sessionId) view returns (bool)",
    "function getSessionAgent(bytes32 sessionId) view returns (address)",
    "function getSpendingRules(bytes32 sessionId) view returns (tuple(tuple(uint256 timeWindow, uint160 budget, uint96 initialWindowStartTime, bytes32[] targetProviders) rule, tuple(uint128 amountUsed, uint128 currentTimeWindowStartTime) usage)[])",
    "function getUsage(bytes32 sessionId, uint256 index) view returns (uint256)",
    "function checkSpendingRules(bytes32 sessionId, uint256 normalizedAmount, bytes32 serviceProvider) view returns (bool)",
    // Master budget queries
    "function getMasterBudgetRules() view returns (tuple(tuple(uint256 timeWindow, uint160 budget, uint96 initialWindowStartTime, bytes32[] targetProviders) rule, tuple(uint128 amountUsed, uint128 currentTimeWindowStartTime) usage)[])",
    "function getMasterBudgetRuleCount() view returns (uint256)",
    // Nonce queries
    "function isNonceUsed(bytes32 nonce) view returns (bool)",
]);
// =============================================================================
// Environment Setup
// =============================================================================
// Owner: controls AA wallet, signs UserOps
const OWNER_PRIVATE_KEY = process.env.PRIVATE_KEY;
// Agent: signs transfer authorizations (can be same as owner for demo)
const AGENT_PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY ?? OWNER_PRIVATE_KEY;
const PAYMENT_TOKEN = process.env.PAYMENT_TOKEN ?? SETTLEMENT_TOKEN;
if (!OWNER_PRIVATE_KEY)
    throw new Error("Missing PRIVATE_KEY env variable");
const ownerSigner = new ethers_1.ethers.Wallet(OWNER_PRIVATE_KEY);
const agentSigner = new ethers_1.ethers.Wallet(AGENT_PRIVATE_KEY);
const sessionId = ethers_1.ethers.hexlify((0, ethers_1.randomBytes)(32));
const SECONDS_PER_DAY = 86400;
function currentDayStart() {
    const now = Math.floor(Date.now() / 1000);
    return BigInt(Math.floor(now / SECONDS_PER_DAY) * SECONDS_PER_DAY);
}
async function signUserOp(hash) {
    return ownerSigner.signMessage(ethers_1.ethers.getBytes(hash));
}
async function sendWithTokenPayment(target, callData) {
    const request = { target, value: 0n, callData };
    const estimate = await sdk.estimateUserOperation(ownerSigner.address, request);
    const tokenAddress = estimate.sponsorshipAvailable ? ZERO_ADDRESS : PAYMENT_TOKEN;
    const response = await sdk.sendUserOperationWithPayment(ownerSigner.address, request, estimate.userOp, tokenAddress, signUserOp);
    if (response.status.status !== "success") {
        throw new Error(response.status.reason ?? "User operation failed");
    }
    return response.status.transactionHash ?? "";
}
// EIP-712 domain for GokiteAccount
function getEIP712Domain(aaWallet, chainId) {
    return {
        name: "GokiteAccount",
        version: "1",
        chainId: chainId,
        verifyingContract: aaWallet,
    };
}
// EIP-712 types for TransferWithAuthorization
const TRANSFER_AUTH_TYPES = {
    TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "token", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
    ],
};
// Sign transfer authorization using EIP-712
async function signTransferAuthorization(aaWallet, chainId, auth) {
    const domain = getEIP712Domain(aaWallet, chainId);
    return agentSigner.signTypedData(domain, TRANSFER_AUTH_TYPES, auth);
}
// Session spending rules
function sessionRules() {
    return [
        {
            timeWindow: BigInt(SECONDS_PER_DAY),
            budget: ethers_1.ethers.parseUnits("100", 18),
            initialWindowStartTime: currentDayStart(),
            targetProviders: [],
        },
        {
            timeWindow: 0n,
            budget: ethers_1.ethers.parseUnits("10", 18),
            initialWindowStartTime: 0n,
            targetProviders: [],
        },
    ];
}
// =============================================================================
// x402 Facilitator API Functions
// =============================================================================
async function facilitatorHealthCheck() {
    console.log("\n[x402] Health Check");
    console.log("=".repeat(50));
    try {
        const response = await fetch(`${FACILITATOR_URL}/health`);
        const data = await response.json();
        console.log("  Response:", JSON.stringify(data, null, 2));
        console.log("  ✅ Facilitator is healthy!");
        return true;
    }
    catch (error) {
        console.error("  ❌ Health check failed:", error);
        return false;
    }
}
async function getSupportedNetworks() {
    console.log("\n[x402] Supported Networks");
    console.log("=".repeat(50));
    try {
        const response = await fetch(`${FACILITATOR_URL}/supported`);
        const data = (await response.json());
        console.log("  Response:", JSON.stringify(data, null, 2));
        const kinds = data.kinds || [];
        const hasKite = kinds.some((k) => k.network === X402_NETWORK);
        if (hasKite) {
            console.log("  ✅ Kite testnet is supported!");
            return true;
        }
        else {
            console.log("  ❌ Kite testnet NOT found in supported networks");
            return false;
        }
    }
    catch (error) {
        console.error("  ❌ Failed to get supported networks:", error);
        return false;
    }
}
function buildVerifyRequest(authorization, signature, sessionIdHex, recipient) {
    return {
        x402Version: 1,
        paymentPayload: {
            x402Version: 1,
            scheme: "gokite-aa",
            network: X402_NETWORK,
            payload: {
                signature,
                authorization,
                sessionId: sessionIdHex,
            },
        },
        paymentRequirements: {
            scheme: "gokite-aa",
            network: X402_NETWORK,
            maxAmountRequired: authorization.value,
            resource: "https://example.com/api",
            description: "Test payment via AA wallet",
            mimeType: "application/json",
            payTo: recipient,
            maxTimeoutSeconds: 30,
            asset: authorization.token,
        },
    };
}
async function verifyPayment(request) {
    console.log("\n[x402] Verify Payment");
    console.log("=".repeat(50));
    console.log("  Request:", JSON.stringify(request, null, 2));
    try {
        const response = await fetch(`${FACILITATOR_URL}/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(request),
        });
        const data = (await response.json());
        console.log("\n  Response:", JSON.stringify(data, null, 2));
        if (data.isValid) {
            console.log("\n  ✅ Verification PASSED!");
        }
        else {
            console.log("\n  ❌ Verification FAILED:", data.invalidReason);
        }
        return data;
    }
    catch (error) {
        console.error("  ❌ Verify request failed:", error);
        return null;
    }
}
async function settlePayment(request) {
    console.log("\n[x402] Settle Payment");
    console.log("=".repeat(50));
    console.log("  Request:", JSON.stringify(request, null, 2));
    try {
        const response = await fetch(`${FACILITATOR_URL}/settle`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(request),
        });
        const data = (await response.json());
        console.log("\n  Response:", JSON.stringify(data, null, 2));
        if (data.success) {
            console.log("\n  ✅ Settlement SUCCESSFUL!");
            if (data.transaction) {
                console.log("  Transaction Hash:", data.transaction);
            }
        }
        else {
            console.log("\n  ❌ Settlement FAILED:", data.errorReason);
        }
        return data;
    }
    catch (error) {
        console.error("  ❌ Settle request failed:", error);
        return null;
    }
}
// =============================================================================
// Query Functions
// =============================================================================
async function queryWalletStatus(aaWallet, provider) {
    console.log("\n[Query] AA Wallet Status");
    console.log("=".repeat(50));
    // Check if wallet is deployed first
    const code = await provider.getCode(aaWallet);
    if (code === "0x") {
        console.log(`  AA Wallet ${aaWallet} is not deployed yet (counterfactual address)`);
        console.log(`  Wallet will be deployed on first UserOp execution`);
        return { isDeployed: false, isSupported: false, balance: 0n };
    }
    const contract = new ethers_1.ethers.Contract(aaWallet, gokiteAccountInterface, provider);
    // 1. Check if token is supported
    const isSupported = await contract.isTokenSupported(SETTLEMENT_TOKEN);
    console.log(`  Token ${SETTLEMENT_TOKEN} supported: ${isSupported}`);
    // 2. Get token balance in AA wallet
    const balance = await contract.getAvailableBalance(SETTLEMENT_TOKEN);
    console.log(`  Token balance: ${ethers_1.ethers.formatUnits(balance, 18)}`);
    // 3. Get master budget rules
    const masterRules = await contract.getMasterBudgetRules();
    console.log(`  Master budget rules count: ${masterRules.length}`);
    for (let i = 0; i < masterRules.length; i++) {
        const rule = masterRules[i];
        const timeWindow = rule.rule.timeWindow;
        const budget = ethers_1.ethers.formatUnits(rule.rule.budget, 18);
        const used = ethers_1.ethers.formatUnits(rule.usage.amountUsed, 18);
        const windowType = timeWindow === 0n ? "per-tx" : `${Number(timeWindow) / 86400} day(s)`;
        console.log(`    Rule ${i}: ${windowType}, budget: ${budget}, used: ${used}`);
    }
    return { isDeployed: true, isSupported, balance };
}
async function querySessionStatus(aaWallet, sessionIdHex, provider) {
    const contract = new ethers_1.ethers.Contract(aaWallet, gokiteAccountInterface, provider);
    console.log("\n[Query] Session Status");
    console.log("=".repeat(50));
    // 1. Check if session exists
    const exists = await contract.sessionExists(sessionIdHex);
    console.log(`  Session ${sessionIdHex.slice(0, 18)}... exists: ${exists}`);
    if (!exists)
        return { exists };
    // 2. Get session agent
    const agent = await contract.getSessionAgent(sessionIdHex);
    console.log(`  Session agent: ${agent}`);
    // 3. Get spending rules
    const spendingRules = await contract.getSpendingRules(sessionIdHex);
    console.log(`  Spending rules count: ${spendingRules.length}`);
    for (let i = 0; i < spendingRules.length; i++) {
        const rule = spendingRules[i];
        const timeWindow = rule.rule.timeWindow;
        const budget = ethers_1.ethers.formatUnits(rule.rule.budget, 18);
        const used = ethers_1.ethers.formatUnits(rule.usage.amountUsed, 18);
        const windowType = timeWindow === 0n ? "per-tx" : `${Number(timeWindow) / 86400} day(s)`;
        console.log(`    Rule ${i}: ${windowType}, budget: ${budget}, used: ${used}`);
    }
    return { exists, agent, spendingRules };
}
async function checkNonceStatus(aaWallet, nonce, provider) {
    const contract = new ethers_1.ethers.Contract(aaWallet, gokiteAccountInterface, provider);
    const isUsed = await contract.isNonceUsed(nonce);
    console.log(`  Nonce ${nonce.slice(0, 18)}... used: ${isUsed}`);
    return isUsed;
}
// =============================================================================
// Main Flow
// =============================================================================
async function main() {
    const args = process.argv.slice(2);
    const shouldSettle = args.includes("--settle");
    const useDirect = args.includes("--direct");
    console.log("=".repeat(60));
    console.log("GokiteAccount E2E Demo with x402 Facilitator");
    console.log("=".repeat(60));
    const aaWallet = sdk.getAccountAddress(ownerSigner.address);
    const provider = new ethers_1.ethers.JsonRpcProvider(RPC_URL);
    const chainId = (await provider.getNetwork()).chainId;
    console.log("\nConfiguration:");
    console.log("  Facilitator URL:", FACILITATOR_URL);
    console.log("  Network:", X402_NETWORK);
    console.log("  Chain ID:", CHAIN_ID);
    console.log("  AA Wallet:", aaWallet);
    console.log("  Owner:", ownerSigner.address);
    console.log("  Agent:", agentSigner.address);
    console.log("  Token:", SETTLEMENT_TOKEN);
    console.log("  Mode:", useDirect ? "Direct UserOp" : "x402 Facilitator");
    // ============ Query Wallet Status ============
    const walletStatus = await queryWalletStatus(aaWallet, provider);
    // ============ Step 1: Setup AA Wallet (only if not deployed) ============
    if (!walletStatus.isDeployed) {
        console.log("\n[Step 1] Setting up AA wallet...");
        const masterBudgetData = gokiteAccountInterface.encodeFunctionData("setMasterBudgetRules", [
            [BigInt(SECONDS_PER_DAY), 0n],
            [ethers_1.ethers.parseUnits("1000", 18), ethers_1.ethers.parseUnits("100", 18)], // 1000 USD/day, 100 USD/tx
        ]);
        const setupBatchData = gokiteAccountInterface.encodeFunctionData("executeBatch", [
            [aaWallet],
            [],
            [masterBudgetData],
        ]);
        const setupTx = await sendWithTokenPayment(aaWallet, setupBatchData);
        console.log(`  Setup (addSupportedToken + setMasterBudgetRules) tx: ${setupTx}`);
        await new Promise((r) => setTimeout(r, 5000));
    }
    else {
        console.log("\n[Step 1] AA wallet already deployed, skipping setup");
    }
    // ============ Step 2: Create Session ============
    console.log("\n[Step 2] Creating session...");
    const createSessionData = gokiteAccountInterface.encodeFunctionData("createSession", [
        sessionId,
        agentSigner.address,
        sessionRules(),
    ]);
    const createSessionTx = await sendWithTokenPayment(aaWallet, createSessionData);
    console.log(`  Session ID: ${sessionId}`);
    console.log(`  createSession tx: ${createSessionTx}`);
    await new Promise((r) => setTimeout(r, 5000));
    // Query session status after creation
    await querySessionStatus(aaWallet, sessionId, provider);
    // ============ Step 2b: Update Spending Rules (setSpendingRules example) ============
    console.log("\n[Step 2b] Updating session spending rules...");
    // Define new spending rules to replace existing ones
    const newSpendingRules = [
        {
            timeWindow: BigInt(SECONDS_PER_DAY),
            budget: ethers_1.ethers.parseUnits("200", 18),
            initialWindowStartTime: currentDayStart(),
            targetProviders: [],
        },
        {
            timeWindow: 0n,
            budget: ethers_1.ethers.parseUnits("20", 18),
            initialWindowStartTime: 0n,
            targetProviders: [],
        },
        {
            timeWindow: BigInt(SECONDS_PER_DAY * 7),
            budget: ethers_1.ethers.parseUnits("500", 18),
            initialWindowStartTime: currentDayStart(),
            targetProviders: [],
        },
    ];
    const setSpendingRulesData = gokiteAccountInterface.encodeFunctionData("setSpendingRules", [
        sessionId,
        newSpendingRules,
    ]);
    const setSpendingRulesTx = await sendWithTokenPayment(aaWallet, setSpendingRulesData);
    console.log(`  setSpendingRules tx: ${setSpendingRulesTx}`);
    await new Promise((r) => setTimeout(r, 5000));
    // Query session status after updating spending rules
    await querySessionStatus(aaWallet, sessionId, provider);
    // // ============ Step 3: Sign Transfer Authorization ============
    // console.log("\n[Step 3] Agent signing transfer authorization...");
    // const recipient = ownerSigner.address; // send to self for demo
    // const transferAmount = ethers.parseUnits("1", 18); // 1 token
    // const nonce = ethers.hexlify(randomBytes(32));
    // const now = BigInt(Math.floor(Date.now() / 1000));
    // const auth = {
    //   from: aaWallet,
    //   to: recipient,
    //   token: SETTLEMENT_TOKEN,
    //   value: transferAmount,
    //   validAfter: now - 60n, // valid from 1 minute ago
    //   validBefore: now + 3600n, // valid for 1 hour
    //   nonce: nonce,
    // };
    // const signature = await signTransferAuthorization(aaWallet, chainId, auth);
    // console.log(`  Authorization nonce: ${nonce}`);
    // console.log(`  Signature: ${signature.slice(0, 42)}...`);
    // // ============ Step 4: Execute Transfer ============
    // if (useDirect) {
    //   // Direct UserOp execution
    //   console.log("\n[Step 4] Executing transfer via direct UserOp...");
    //   const executeTransferData = gokiteAccountInterface.encodeFunctionData(
    //     "executeTransferWithAuthorization",
    //     [sessionId, auth, signature]
    //   );
    //   const executeTx = await sendWithTokenPayment(aaWallet, executeTransferData);
    //   console.log(`  executeTransferWithAuthorization tx: ${executeTx}`);
    // } else {
    //   // x402 Facilitator flow
    //   console.log("\n[Step 4] Verifying via x402 facilitator...");
    //   // Check facilitator health
    //   const healthy = await facilitatorHealthCheck();
    //   if (!healthy) {
    //     console.error("\n❌ Facilitator not available, aborting");
    //     process.exit(1);
    //   }
    //   // Check supported networks
    //   await getSupportedNetworks();
    //   // Build x402 request
    //   const x402Auth: Authorization = {
    //     from: aaWallet,
    //     to: recipient,
    //     token: SETTLEMENT_TOKEN,
    //     value: transferAmount.toString(),
    //     validAfter: auth.validAfter.toString(),
    //     validBefore: auth.validBefore.toString(),
    //     nonce: nonce,
    //   };
    //   const verifyRequest = buildVerifyRequest(x402Auth, signature, sessionId, recipient);
    //   // Verify payment
    //   const verifyResult = await verifyPayment(verifyRequest);
    //   if (!verifyResult?.isValid) {
    //     console.error("\n❌ Verification failed, skipping settle");
    //     process.exit(1);
    //   }
    //   // Settle payment (optional)
    //   if (shouldSettle) {
    //     console.log("\n⚠️  Proceeding with REAL settlement transaction...");
    //     const settleResult = await settlePayment(verifyRequest);
    //     if (settleResult?.success && settleResult.transaction) {
    //       console.log(`  Settlement tx: ${settleResult.transaction}`);
    //     }
    //   } else {
    //     console.log("\n💡 Skipping settle (use --settle flag to execute real transaction)");
    //   }
    // }
    // await new Promise((r) => setTimeout(r, 5000));
    // // ============ Post-Transfer Queries ============
    // console.log("\n[Post-Transfer] Checking status...");
    // // Check nonce is now used (replay protection)
    // await checkNonceStatus(aaWallet, nonce, provider);
    // // Query updated session status (usage should be updated)
    // await querySessionStatus(aaWallet, sessionId, provider);
    // // Query updated wallet status
    // await queryWalletStatus(aaWallet, provider);
    // console.log("\n" + "=".repeat(60));
    // console.log("E2E Demo completed successfully!");
    // console.log("=".repeat(60));
}
main().catch((error) => {
    console.error(error);
    process.exit(1);
});
