// SPDX-License-Identifier: MIT

pragma solidity 0.8.31;
//import "./console.sol";

interface IERC20 {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function transfer(address to, uint256 value) external returns (bool);
}

contract PrivacyLite {
    string public chain_identifier;
    string public tick;
    address public erc20;

    address public witness;

    bool public live;

    uint256 public total;

    mapping(address => bytes) public privacyBalances;
    mapping(address => uint256) public privacyNonces;

    event PrivacyDeposit(
        address indexed addr,
        uint256 amount
    );

    event PrivacyWithdraw(
        address indexed addr,
        uint256 amount
    );

    event PrivacyTransfer(
        address indexed fromAddr,
        address indexed toAddr,
        bytes amountCipher
    );

    constructor(
        string memory _chain_identifier,
        string memory _tick,
        address _erc20,
        address _witness
    ) {
        chain_identifier = _chain_identifier;
        tick = _tick;
        require(_witness != address(0), "Invalid witness address");
        witness = _witness;
        require(_erc20 != address(0), "Invalid erc20 address");
        erc20 = _erc20;
        live = true;
    }

    function privacyDeposit(
        uint256 amount,
        bytes memory amountCipher,
        bytes memory currentBalanceCipher,
        bytes memory updatedBalanceCipher,
        bytes memory signature
    ) external {
        require(amount > 0, "Amount must be > 0");
        uint256 nonce = privacyNonces[msg.sender] + 1;

        bytes32 messageHash = keccak256(abi.encodePacked(
            chain_identifier,
            msg.sender,
            nonce,
            amount,
            amountCipher,
            currentBalanceCipher,
            updatedBalanceCipher));
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        //console.logBytes32(messageHash);

        address recoveredSigner = _recoverSigner(ethSignedMessageHash, signature);
        require(recoveredSigner == witness, "Invalid signature detected");

        // Transfer ERC20 tokens from sender to this contract
        require(IERC20(erc20).transferFrom(msg.sender, address(this), amount), "Deposit failed");
        total += amount;

        require(keccak256(currentBalanceCipher) == keccak256(privacyBalances[msg.sender]), "Encrypted balance must be equal to current balance");
        privacyBalances[msg.sender] = updatedBalanceCipher;

        privacyNonces[msg.sender] = nonce;
        emit PrivacyDeposit(msg.sender, amount);
    }

    function privacyWithdraw(
        uint256 amount,
        bytes memory amountCipher,
        bytes memory currentBalanceCipher,
        bytes memory updatedBalanceCipher,
        bytes memory signature
    ) external {
        require(amount > 0, "Amount must be > 0");
        uint256 nonce = privacyNonces[msg.sender] + 1;

        bytes32 messageHash = keccak256(abi.encodePacked(
            chain_identifier,
            msg.sender,
            nonce,
            amount,
            amountCipher,
            currentBalanceCipher,
            updatedBalanceCipher));
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        //console.logBytes32(messageHash);

        address recoveredSigner = _recoverSigner(ethSignedMessageHash, signature);
        require(recoveredSigner == witness, "Invalid signature detected");

        require(keccak256(currentBalanceCipher) == keccak256(privacyBalances[msg.sender]), "Encrypted balance must be equal to current balance");
        privacyBalances[msg.sender] = updatedBalanceCipher;

        total -= amount;
        require(IERC20(erc20).transfer(msg.sender, amount), "Withdraw failed");
        
        emit PrivacyWithdraw(msg.sender, amount);
        privacyNonces[msg.sender] = nonce;
    }

    function privacyTransfer(
        address toAddr,
        bytes memory amountCipher,
        bytes memory currentSenderBalanceCipher,
        bytes memory updatedSenderBalanceCipher,
        bytes memory currentReceiverBalanceCipher,
        bytes memory updatedReceiverBalanceCipher,
        bytes memory signature
    ) external {
        require(toAddr != address(0), "Invalid recipient address");
        uint256 nonce = privacyNonces[msg.sender] + 1;

        bytes32 messageHash = keccak256(abi.encodePacked(
            chain_identifier,
            msg.sender,
            nonce,
            toAddr,
            amountCipher,
            currentSenderBalanceCipher,
            updatedSenderBalanceCipher,
            currentReceiverBalanceCipher,
            updatedReceiverBalanceCipher));
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );

        address recoveredSigner = _recoverSigner(ethSignedMessageHash, signature);
        require(recoveredSigner == witness, "Invalid signature detected");

        require(keccak256(currentSenderBalanceCipher) == keccak256(privacyBalances[msg.sender]), "Encrypted sender must be equal to current balance");
        require(keccak256(currentReceiverBalanceCipher) == keccak256(privacyBalances[toAddr]), "Encrypted receiver must be equal to current balance");
        privacyBalances[msg.sender] = updatedSenderBalanceCipher;
        privacyBalances[toAddr] = updatedReceiverBalanceCipher;
        
        emit PrivacyTransfer(
            msg.sender,
            toAddr,
            amountCipher
        );
        privacyNonces[msg.sender] = nonce;
    }

    
    // ============ Utility Functions ============    
    function _recoverSigner(bytes32 ethSignedMessageHash, bytes memory signature) internal pure returns (address) {
        require(signature.length == 65, "Invalid signature length");
        
        bytes32 r;
        bytes32 s;
        uint8 v;
        
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }
        
        // Adjust v if necessary
        if (v < 27) {
            v += 27;
        }
        
        require(v == 27 || v == 28, "Invalid signature v value");
        
        return ecrecover(ethSignedMessageHash, v, r, s);
    }
    
    /// @notice Helper to convert uint to string
    function _uint2str(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
    
    /// @notice Helper to concatenate strings
    function _strConcat(string memory a, string memory b) internal pure returns (string memory) {
        return string(abi.encodePacked(a, b));
    }
    
    function _strConcat3(string memory a, string memory b, string memory c) internal pure returns (string memory) {
        return string(abi.encodePacked(a, b, c));
    }
    
    function _strConcat5(
        string memory a,
        string memory b,
        string memory c,
        string memory d,
        string memory e
    ) internal pure returns (string memory) {
        return string(abi.encodePacked(a, b, c, d, e));
    }
    
    /// @notice Convert address to lowercase hex string (without 0x prefix)
    function _addressToString(address addr) internal pure returns (string memory) {
        bytes memory alphabet = "0123456789abcdef";
        bytes memory data = abi.encodePacked(addr);
        bytes memory str = new bytes(40); // 20 bytes * 2 chars per byte
        
        for (uint256 i = 0; i < 20; i++) {
            str[i * 2] = alphabet[uint8(data[i] >> 4)];
            str[i * 2 + 1] = alphabet[uint8(data[i] & 0x0f)];
        }
        
        return string(abi.encodePacked("0x", string(str)));
    }
}