from web3 import Web3
import os
import requests

LITE_API = "https://pusdc-kite-testnet.zentra.dev"

# KiteAI Testnet Settings
RPC_URL = "https://rpc-testnet.gokite.ai/"
CHAIN_ID = 2368

LITE_ADDR = '0x35A9b4E215c8Bf9b7bFF83Ac08aD32dEE8D19F64'
USDT_ADDR = "0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63"

# ERC20 Minimal ABI
ERC20_ABI = [
    {"constant": True, "inputs": [{"name": "_owner", "type": "address"}], "name": "balanceOf", "outputs": [{"name": "balance", "type": "uint256"}], "type": "function"},
    {"constant": True, "inputs": [], "name": "decimals", "outputs": [{"name": "", "type": "uint8"}], "type": "function"}
]

# LITE ABI (JSON format converted from string list)
LITE_ABI = [
    {"inputs": [{"name": "", "type": "address"}], "name": "privacyBalances", "outputs": [{"name": "", "type": "bytes"}], "stateMutability": "view", "type": "function"},
    {"inputs": [{"name": "", "type": "address"}], "name": "privacyNonces", "outputs": [{"name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"inputs": [{"name": "toAddr", "type": "address"}, {"name": "amountCipher", "type": "bytes"}, {"name": "currentSenderBalanceCipher", "type": "bytes"}, {"name": "updatedSenderBalanceCipher", "type": "bytes"}, {"name": "currentReceiverBalanceCipher", "type": "bytes"}, {"name": "updatedReceiverBalanceCipher", "type": "bytes"}, {"name": "signature", "type": "bytes"}], "name": "privacyTransfer", "outputs": [], "stateMutability": "nonpayable", "type": "function"},
    {"inputs": [], "name": "chain_identifier", "outputs": [{"name": "", "type": "string"}], "stateMutability": "view", "type": "function"},
    {"inputs": [], "name": "tick", "outputs": [{"name": "", "type": "string"}], "stateMutability": "view", "type": "function"},
    {"inputs": [], "name": "erc20", "outputs": [{"name": "", "type": "address"}], "stateMutability": "view", "type": "function"},
    {"inputs": [], "name": "witness", "outputs": [{"name": "", "type": "address"}], "stateMutability": "view", "type": "function"}
]

# Initialize Web3
w3 = Web3(Web3.HTTPProvider(RPC_URL))

def connect_and_check():
    if w3.is_connected():
        print(f"✅ Connected to KiteAI Testnet")
        print(f"Network ID: {w3.eth.chain_id}")

        # Create USDT contract instance
        usdt_contract = w3.eth.contract(address=USDT_ADDR, abi=ERC20_ABI)

        try:
            # Query USDT balance of LITE contract
            balance_raw = usdt_contract.functions.balanceOf(LITE_ADDR).call()
            try:
                decimals = usdt_contract.functions.decimals().call()
            except:
                decimals = 6 # Default for USDT if call fails
            
            balance_formatted = balance_raw / (10 ** decimals)
            
            print(f"\n--- Balance Info ---")
            print(f"LITE Contract: {LITE_ADDR}")
            print(f"USDT Balance: {balance_formatted} USDT")
            print(f"--------------------\n")
        except Exception as e:
            print(f"❌ Error querying USDT balance: {e}")
    else:
        print("❌ Failed to connect to KiteAI Testnet")

address_book = {
    'laowang': '0x35A9b4E215c8Bf9b7bFF83Ac08aD32dEE8D19F64', # Just as example, use real address here if different
    'target': '0x376d3737Da2A540318BbA02A98f03a97d1DD8f6d' # Example employee
}

def pay(name, amount_human=1.0):
    print(f"🚀 Starting payment for: {name}")
    
    # 1. Setup account and contract
    private_key = os.getenv("ETH_PRIVATE_KEY")
    if not private_key:
        print("❌ ETH_PRIVATE_KEY not found")
        return

    account = w3.eth.account.from_key(private_key)
    account_addr = w3.to_checksum_address(account.address)
    
    to_addr_raw = address_book.get(name)
    if not to_addr_raw:
        print(f"❌ Name {name} not found in address book")
        return
    to_addr = w3.to_checksum_address(to_addr_raw)

    lite_contract = w3.eth.contract(address=w3.to_checksum_address(LITE_ADDR), abi=LITE_ABI)
    
    # Convert amount to internal representation (assuming 6 decimals for USDT)
    amount_parsed = int(amount_human * 10**6)

    try:
        # Fetch current state from contract
        print("📡 Fetching nonces and balances...")
        sender_nonce = lite_contract.functions.privacyNonces(account_addr).call()
        sender_balance = lite_contract.functions.privacyBalances(account_addr).call()
        receiver_balance = lite_contract.functions.privacyBalances(to_addr).call()

        # 2. Fetch signature from API
        print("✍️ Requesting witness signature from API...")
        
        params = {
            "from_addr": account.address,
            "to_addr": to_addr,
            "amount": str(amount_parsed),
            "nonce": str(sender_nonce + 1),
            "sender_balance": "0x" + sender_balance.hex() if sender_balance else "0x",
            "receiver_balance": "0x" + receiver_balance.hex() if receiver_balance else "0x"
        }
        
        response = requests.get(f"{LITE_API}/api/sign_transfer", params=params)
        if response.status_code != 200:
            print(f"❌ API Error: {response.status_code} - {response.text}")
            return
            
        data = response.json()
        print("✅ Witness signature received")

        # 3. Call privacyTransfer
        print("🔗 Building privacyTransfer transaction...")
        
        # Prepare arguments (ensure hex strings are converted to bytes)
        tx_args = [
            to_addr,
            w3.to_bytes(hexstr=data['amount_cipher']),
            w3.to_bytes(hexstr=data['current_sender_balance']),
            w3.to_bytes(hexstr=data['updated_sender_balance']),
            w3.to_bytes(hexstr=data['current_receiver_balance']),
            w3.to_bytes(hexstr=data['updated_receiver_balance']),
            w3.to_bytes(hexstr=data['signature'])
        ]
        
        # Build transaction
        nonce = w3.eth.get_transaction_count(account_addr)
        
        # Determine gas (optional: let it be estimated)
        transaction = lite_contract.functions.privacyTransfer(*tx_args).build_transaction({
            'chainId': CHAIN_ID,
            'gas': 2000000, # A safe limit for privacy operations
            'gasPrice': w3.eth.gas_price,
            'nonce': nonce,
            'from': account_addr
        })
        
        print("🔐 Signing transaction...")
        signed_tx = w3.eth.account.sign_transaction(transaction, private_key)
        
        print("📡 Sending transaction to network...")
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        
        print(f"⌛ Transaction sent! Hash: {tx_hash.hex()}")
        print("Waiting for confirmation...")
        
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        
        if receipt.status == 1:
            print("✅ Transaction successful!")
        else:
            print("❌ Transaction failed (status 0)")

    except Exception as e:
        print(f"❌ Payment failed: {e}")

if __name__ == "__main__":
    connect_and_check()
    # Example: Pay 'target' 1.0 USDT
    pay('target', 1.0)
