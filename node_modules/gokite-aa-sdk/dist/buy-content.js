"use strict";
/**
 * Buy Content Script
 *
 * This script demonstrates the complete x402 payment flow:
 * 1. Request protected content (receive 402 + PaymentRequirements)
 * 2. Sign EIP-712 transfer authorization
 * 3. Send payment via X-Payment header
 * 4. Receive content (service verifies & settles via facilitator)
 *
 * Usage:
 *   npm run buy
 *
 * Environment variables (from .env.local):
 *   AA_WALLET           - AA wallet address
 *   SESSION_ID          - Session ID for this agent
 *   AGENT_PRIVATE_KEY   - Agent private key (signs authorizations)
 *   SERVICE_URL         - Protected service URL
 *   FACILITATOR_URL     - x402 facilitator URL (for health check)
 */
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
require("dotenv/config");
// =============================================================================
// Configuration
// =============================================================================
const CHAIN_ID = 2368n;
const RPC_URL = "https://rpc-testnet.gokite.ai";
// From environment
const AA_WALLET = process.env.AA_WALLET;
const SESSION_ID = process.env.SESSION_ID;
const AGENT_PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY;
const SERVICE_URL = process.env.SERVICE_URL || "http://localhost:8099";
const FACILITATOR_URL = process.env.FACILITATOR_URL || "http://localhost:8080";
// Validate environment
if (!AA_WALLET || !SESSION_ID || !AGENT_PRIVATE_KEY) {
    console.error("❌ Missing environment variables. Please run setup first:");
    console.error("   npm run setup");
    console.error("\n   Required: AA_WALLET, SESSION_ID, AGENT_PRIVATE_KEY");
    process.exit(1);
}
const agentSigner = new ethers_1.ethers.Wallet(AGENT_PRIVATE_KEY);
// =============================================================================
// EIP-712 Signing
// =============================================================================
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
function getEIP712Domain(aaWallet, chainId) {
    return {
        name: "GokiteAccount",
        version: "1",
        chainId: chainId,
        verifyingContract: aaWallet,
    };
}
async function signTransferAuthorization(aaWallet, chainId, auth) {
    const domain = getEIP712Domain(aaWallet, chainId);
    return agentSigner.signTypedData(domain, TRANSFER_AUTH_TYPES, auth);
}
// =============================================================================
// Payment Flow Functions
// =============================================================================
/**
 * Step 1: Request content without payment
 * Expected: 402 Payment Required with PaymentRequirements
 */
async function requestContent(endpoint) {
    console.log("\n Step 1: Request Content (without payment)");
    console.log("─".repeat(50));
    console.log(`  URL: ${SERVICE_URL}${endpoint}`);
    const response = await fetch(`${SERVICE_URL}${endpoint}`);
    if (response.status === 402) {
        const data = (await response.json());
        console.log(`  Status: 402 Payment Required ✅`);
        // Find kite-testnet payment option (we'll use gokite-aa scheme to pay)
        const kiteOption = data.accepts?.find((req) => req.network === "kite-testnet");
        if (kiteOption) {
            console.log(`  Payment options: ${data.accepts?.length || 0}`);
            console.log(`  Selected: ${kiteOption.network} (using gokite-aa scheme)`);
            console.log(`  Amount: ${ethers_1.ethers.formatUnits(kiteOption.maxAmountRequired, 18)} TestUSD`);
            console.log(`  Pay to: ${kiteOption.payTo}`);
            return kiteOption;
        }
        else {
            console.log("  ❌ No kite-testnet payment option available");
            console.log("  Available networks:", data.accepts?.map((r) => r.network).join(", "));
            return null;
        }
    }
    else if (response.ok) {
        console.log("  ⚠️  Content returned without payment (unexpected)");
        const content = await response.text();
        console.log("  Content:", content.slice(0, 100));
        return null;
    }
    else {
        console.log(`  ❌ Unexpected status: ${response.status}`);
        return null;
    }
}
/**
 * Step 2: Sign payment authorization
 */
async function signPayment(requirements) {
    console.log("\n Step 2: Sign Payment Authorization");
    console.log("─".repeat(50));
    const nonce = ethers_1.ethers.hexlify((0, ethers_1.randomBytes)(32));
    const now = BigInt(Math.floor(Date.now() / 1000));
    const auth = {
        from: AA_WALLET,
        to: requirements.payTo,
        token: requirements.asset,
        value: BigInt(requirements.maxAmountRequired),
        validAfter: now - 60n,
        validBefore: now + 3600n,
        nonce,
    };
    console.log(`  From: ${auth.from}`);
    console.log(`  To: ${auth.to}`);
    console.log(`  Token: ${auth.token}`);
    console.log(`  Value: ${ethers_1.ethers.formatUnits(auth.value, 18)} TestUSD`);
    console.log(`  Nonce: ${nonce.slice(0, 18)}...`);
    const signature = await signTransferAuthorization(AA_WALLET, CHAIN_ID, auth);
    console.log(`  Signature: ${signature.slice(0, 20)}...${signature.slice(-8)}`);
    console.log("  ✅ Authorization signed");
    const paymentPayload = {
        x402Version: 1,
        scheme: "gokite-aa",
        network: requirements.network,
        payload: {
            signature,
            authorization: {
                from: auth.from,
                to: auth.to,
                token: auth.token,
                value: auth.value.toString(),
                validAfter: auth.validAfter.toString(),
                validBefore: auth.validBefore.toString(),
                nonce: auth.nonce,
            },
            sessionId: SESSION_ID,
        },
    };
    return { paymentPayload, nonce };
}
/**
 * Step 3: Send payment and get content
 */
async function buyContent(endpoint, paymentPayload) {
    console.log("\n Step 3: Send Payment & Get Content");
    console.log("─".repeat(50));
    // Encode payment payload as base64
    const xPayment = Buffer.from(JSON.stringify(paymentPayload)).toString("base64");
    console.log(`  X-Payment header length: ${xPayment.length} chars`);
    const response = await fetch(`${SERVICE_URL}${endpoint}`, {
        headers: {
            "X-Payment": xPayment,
        },
    });
    console.log(`  Status: ${response.status}`);
    if (response.ok) {
        const contentType = response.headers.get("content-type");
        let content;
        if (contentType?.includes("application/json")) {
            const json = await response.json();
            content = JSON.stringify(json, null, 2);
        }
        else {
            content = await response.text();
        }
        console.log("  ✅ Content received!");
        return { success: true, content };
    }
    else {
        const error = await response.text();
        console.log("  ❌ Payment failed");
        console.log("  Error:", error);
        return { success: false, error };
    }
}
// =============================================================================
// Health Checks
// =============================================================================
async function checkFacilitator() {
    console.log("\n🏥 Facilitator Health Check");
    console.log("─".repeat(50));
    console.log(`  URL: ${FACILITATOR_URL}`);
    try {
        const response = await fetch(`${FACILITATOR_URL}/health`);
        if (response.ok) {
            console.log("  ✅ Facilitator is healthy");
            return true;
        }
        console.log(`  ❌ Status: ${response.status}`);
        return false;
    }
    catch (error) {
        console.log("  ❌ Connection failed:", error.message);
        return false;
    }
}
async function checkService() {
    console.log("\n🏥 Service Health Check");
    console.log("─".repeat(50));
    console.log(`  URL: ${SERVICE_URL}`);
    try {
        const response = await fetch(`${SERVICE_URL}/health`);
        if (response.ok) {
            console.log("  ✅ Service is healthy");
            return true;
        }
        console.log(`  ❌ Status: ${response.status}`);
        return false;
    }
    catch (error) {
        console.log("  ❌ Connection failed:", error.message);
        return false;
    }
}
// =============================================================================
// Main Flow
// =============================================================================
async function main() {
    const endpoint = process.argv[2] || "/protected-route";
    console.log("═".repeat(60));
    console.log("  x402 Gokite Payment Demo - Client");
    console.log("═".repeat(60));
    console.log("\n📍 Configuration");
    console.log("─".repeat(50));
    console.log(`  AA Wallet:   ${AA_WALLET}`);
    console.log(`  Session ID:  ${SESSION_ID.slice(0, 18)}...`);
    console.log(`  Agent:       ${agentSigner.address}`);
    console.log(`  Service:     ${SERVICE_URL}`);
    console.log(`  Endpoint:    ${endpoint}`);
    //   // Health checks
    //   const facilitatorOk = await checkFacilitator();
    //   const serviceOk = await checkService();
    //   if (!facilitatorOk || !serviceOk) {
    //     console.error("\n❌ Health checks failed. Please ensure services are running:");
    //     console.error("   1. Facilitator: cargo run (port 8080)");
    //     console.error("   2. Service: cd examples/x402-axum-example && cargo run (port 8099)");
    //     process.exit(1);
    //   }
    // Step 1: Request content (expect 402)
    const requirements = await requestContent(endpoint);
    if (!requirements) {
        console.error("\n❌ Could not get payment requirements");
        process.exit(1);
    }
    // Step 2: Sign payment
    const { paymentPayload, nonce } = await signPayment(requirements);
    // Step 3: Send payment and get content
    const result = await buyContent(endpoint, paymentPayload);
    // Summary
    console.log("\n" + "═".repeat(60));
    console.log("  Result");
    console.log("═".repeat(60));
    if (result.success) {
        console.log("  ✅ Purchase successful!");
        console.log("\n  Content:");
        console.log("  " + "─".repeat(48));
        console.log(result.content?.split("\n").map((l) => "  " + l).join("\n"));
        console.log("  " + "─".repeat(48));
        console.log(`\n  Payment nonce: ${nonce}`);
        console.log("  (Nonce is now used - replay protection active)");
    }
    else {
        console.log("  ❌ Purchase failed");
        console.log(`  Error: ${result.error}`);
    }
    console.log("═".repeat(60));
}
main().catch((error) => {
    console.error(error);
    process.exit(1);
});
