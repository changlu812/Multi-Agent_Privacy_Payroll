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
import "dotenv/config";
