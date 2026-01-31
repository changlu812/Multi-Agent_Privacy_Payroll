#!/usr/bin/env python3
"""
Main entry point for executing privacy payments on KiteAI Testnet

Usage:
    python main.py [OPTIONS]

Options:
    --recipient, -r     Recipient name from address book (default: target)
    --amount, -a        Amount to send in USDT (default: 1.0)
    --private-key, -k   Ethereum private key (optional, uses ETH_PRIVATE_KEY env var if not provided)

Example:
    python main.py --recipient target --amount 1.0
"""

import os
import sys
import argparse
from pay import pay, connect_and_check, address_book


def main():
    """Main function to execute privacy payment"""
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Execute privacy payment on KiteAI Testnet')
    parser.add_argument('--recipient', '-r', type=str, default='target',
                        help='Recipient name from address book (default: target)')
    parser.add_argument('--amount', '-a', type=float, default=1.0,
                        help='Amount to send in USDT (default: 1.0)')
    parser.add_argument('--private-key', '-k', type=str,
                        help='Ethereum private key (optional, uses ETH_PRIVATE_KEY env var if not provided)')
    
    args = parser.parse_args()
    
    # Check if recipient exists in address book
    if args.recipient not in address_book:
        print(f"❌ Recipient '{args.recipient}' not found in address book")
        print(f"Available recipients: {list(address_book.keys())}")
        sys.exit(1)
    
    # Set private key if provided
    if args.private_key:
        os.environ['ETH_PRIVATE_KEY'] = args.private_key
    
    # Check if private key is available
    if 'ETH_PRIVATE_KEY' not in os.environ:
        print("❌ Ethereum private key not found")
        print("Please provide it via --private-key option or set ETH_PRIVATE_KEY environment variable")
        sys.exit(1)
    
    # Connect to network and check balance
    connect_and_check()
    
    # Execute payment
    print(f"\n📤 Initiating payment of {args.amount} USDT to {args.recipient}...")
    pay(args.recipient, args.amount)
    
    print("\n✅ Payment process completed!")


if __name__ == "__main__":
    main()
