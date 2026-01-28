"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseContractCreatedEvent = exports.getTransparentProxyBytecode = exports.handleAAError = exports.initializeSDK = exports.registerService = exports.checkTokenBalance = exports.withdrawFunds = exports.viewSpendingRules = exports.configureSpendingRules = exports.deployKitePass = exports.transferERC20 = void 0;
const gokite_aa_sdk_1 = require("./gokite-aa-sdk");
const types_1 = require("./types");
const ethers_1 = require("ethers");
require("dotenv/config");
/**
 * Sections:
 * 1. General Use - ERC20 Token Transfer (通用功能 - ERC20代币转账)
 * 2. KitePass Related - ClientAgentVault Operations (KitePass相关 - 客户端代理金库操作)
 * 3. Subnet Related - Subnet Management (子网相关 - 子网管理)
 * 4. Service Related - Service Registry Operations (服务相关 - 服务注册表操作)
 */
// Contract addresses on kite_testnet
const ADDRESSES = {
    SETTLEMENT_TOKEN: '0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63',
    SETTLEMENT_CONTRACT: '0x8d9FaD78d5Ce247aA01C140798B9558fd64a63E3',
    CLIENT_AGENT_VAULT_IMPL: '0xB5AAFCC6DD4DFc2B80fb8BCcf406E1a2Fd559e23',
    SERVICE_REGISTRY: '0xF727EDE22C9e338a7d1d57B930dcEBbC6a66c008'
};
// SDK initialization - 初始化SDK
function initializeSDK() {
    return new gokite_aa_sdk_1.GokiteAASDK('kite_testnet', 'https://rpc-testnet.gokite.ai', 'https://bundler-service.staging.gokite.ai/rpc/');
}
exports.initializeSDK = initializeSDK;
function handleAAError(error) {
    if (error instanceof types_1.AASDKError) {
        return {
            type: error.type,
            message: error.message,
            details: error.details
        };
    }
    return {
        type: 'UNKNOWN_ERROR',
        message: error.message || 'An unknown error occurred',
        details: error
    };
}
exports.handleAAError = handleAAError;
// =============================================================================
// 1. GENERAL USE - ERC20 Token Transfer
// 通用功能 - ERC20代币转账
// =============================================================================
/**
 * Transfer ERC20 tokens from AA wallet to another address
 * 从AA钱包转账ERC20代币到其他地址
 *
 * @param eoa - User's EOA address (from Privy)
 * @param to - Recipient address
 * @param amount - Amount to transfer
 * @param tokenAddress - Token contract address
 * @param tokenDecimals - Token decimals (usually 18)
 * @param signFunction - Signing function from Privy
 */
async function transferERC20(eoa, to, amount, tokenAddress, tokenDecimals = 18, signFunction) {
    const sdk = initializeSDK();
    try {
        const transferRequest = {
            target: tokenAddress,
            value: 0n,
            callData: ethers_1.ethers.Interface.from([
                'function transfer(address to, uint256 amount)'
            ]).encodeFunctionData('transfer', [
                to,
                ethers_1.ethers.parseUnits(amount, tokenDecimals)
            ])
        };
        console.log(`Transferring ${amount} tokens to ${to}...`);
        const result = await sdk.sendUserOperationAndWait(eoa, transferRequest, signFunction);
        if (result.status.status === 'success') {
            return {
                success: true,
                transactionHash: result.status.transactionHash,
                message: 'Transfer successful'
            };
        }
        else {
            return {
                success: false,
                error: result.status.reason,
                message: 'Transfer failed'
            };
        }
    }
    catch (error) {
        const aaError = handleAAError(error);
        return {
            success: false,
            error: aaError,
            message: 'Transfer failed'
        };
    }
}
exports.transferERC20 = transferERC20;
// =============================================================================
// 2. KITEPASS RELATED - ClientAgentVault Operations
// KitePass相关 - 客户端代理金库操作
// =============================================================================
/**
 * 部署KitePass合约
 *
 * @param eoa - User's EOA address
 * @param signFunction - Signing function from Privy
 * @returns Deployed KitePass address
 */
async function deployKitePass(eoa, signFunction) {
    const sdk = initializeSDK();
    const aa = sdk.getAccountAddress(eoa);
    try {
        // Prepare initialization data
        const initializeCallData = ethers_1.ethers.Interface.from([
            'function initialize(address allowedToken, address owner)'
        ]).encodeFunctionData('initialize', [
            ADDRESSES.SETTLEMENT_TOKEN,
            aa
        ]);
        // Create KitePass deployment bytecode
        const proxyConstructorData = ethers_1.ethers.AbiCoder.defaultAbiCoder().encode(['address', 'address', 'bytes'], [ADDRESSES.CLIENT_AGENT_VAULT_IMPL, aa, initializeCallData]);
        const transparentProxyBytecode = getTransparentProxyBytecode();
        const fullInitCode = transparentProxyBytecode + proxyConstructorData.slice(2);
        const deployRequest = {
            target: aa,
            value: 0n,
            callData: ethers_1.ethers.Interface.from([
                'function performCreate(uint256 value, bytes calldata initCode) returns (address)'
            ]).encodeFunctionData('performCreate', [0n, fullInitCode])
        };
        console.log('Deploying KitePass proxy...');
        const result = await sdk.sendUserOperationAndWait(eoa, deployRequest, signFunction);
        if (result.status.status === 'success') {
            const proxyAddress = await parseContractCreatedEvent(result.status.transactionHash);
            return {
                success: true,
                proxyAddress: proxyAddress || undefined
            };
        }
        else {
            return {
                success: false,
                error: result.status.reason
            };
        }
    }
    catch (error) {
        return {
            success: false,
            error: handleAAError(error)
        };
    }
}
exports.deployKitePass = deployKitePass;
/**
 * Configure spending rules for KitePass
 *  setSpendingRules方法会先清除现有的rules，然后设置新的rules
 * 1. 新增/修改：需要先获取现有的rules，然后append新的rules，或者在现有rules的基础上修改
 * 2. 删除：需要先获取现有的rules，然后删除对应的rules
 *
 * @param eoa - User's EOA address
 * @param kitepassAddress - KitePass proxy address
 * @param rules - Spending rules to configure
 * @param signFunction - Signing function
 */
async function configureSpendingRules(eoa, kitepassAddress, signFunction) {
    const sdk = initializeSDK();
    try {
        // Convert rules to contract format
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const todayStartTimestamp = Math.floor(todayStart.getTime() / 1000);
        // get current week's monday 00:00:00 timestamp
        const dayOfWeek = today.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
        const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert Sunday=0 to Sunday=6
        const currentWeekStartTimestamp = todayStartTimestamp - (daysFromMonday * 86400); // 86400 = seconds in a day
        // rules fields:
        //   - TimeWindow: time window in seconds, 0 means per transaction, >0 means per time window
        //   - Budget: budget in wei, 18 decimals, like 1e18 means 1 token
        //   - InitialWindowStartTime: start time of the time window in unix timestamp
        //      should be set to the start time of the day/week/month in local time (or utc) 00:00:00
        //   - TargetProviders: target service providers array, empty array means applies to all providers
        const rulesToAdd = [
            {
                timeWindow: 86400n,
                budget: ethers_1.ethers.parseUnits('100', 18),
                initialWindowStartTime: todayStartTimestamp,
                targetProviders: [] // Empty means applies to all providers
            },
            {
                timeWindow: 604800n,
                budget: ethers_1.ethers.parseUnits('1000', 18),
                initialWindowStartTime: currentWeekStartTimestamp,
                targetProviders: []
            },
            {
                timeWindow: 0,
                budget: ethers_1.ethers.parseUnits('10', 18),
                initialWindowStartTime: 0n,
                targetProviders: [ethers_1.ethers.keccak256(ethers_1.ethers.toUtf8Bytes('provider1'))]
            }
        ];
        // 获取现有的rules
        const existingRules = await viewSpendingRules(kitepassAddress);
        const existingRulesArray = existingRules.rules;
        // append new rules
        const newRules = [...existingRulesArray, ...rulesToAdd];
        const configureRequest = {
            target: kitepassAddress,
            value: 0n,
            callData: ethers_1.ethers.Interface.from([
                'function setSpendingRules(tuple(uint256 timeWindow, uint160 budget, uint96 initialWindowStartTime, bytes32[] targetProviders)[] calldata rules)'
            ]).encodeFunctionData('setSpendingRules', [newRules])
        };
        console.log('Configuring spending rules...');
        const result = await sdk.sendUserOperationAndWait(eoa, configureRequest, signFunction);
        if (result.status.status === 'success') {
            return {
                success: true,
                transactionHash: result.status.transactionHash
            };
        }
        else {
            return {
                success: false,
                error: result.status.reason
            };
        }
    }
    catch (error) {
        return {
            success: false,
            error: handleAAError(error)
        };
    }
}
exports.configureSpendingRules = configureSpendingRules;
/**
 * View current spending rules (read-only)
 * 查看当前消费规则（只读）
 */
async function viewSpendingRules(kitepassAddress) {
    try {
        const provider = new ethers_1.ethers.JsonRpcProvider('https://rpc-testnet.gokite.ai');
        const contract = new ethers_1.ethers.Contract(kitepassAddress, [
            'function getSpendingRules() view returns (tuple(tuple(uint256 timeWindow, uint160 budget, uint96 initialWindowStartTime, bytes32[] targetProviders) rule, tuple(uint128 amountUsed, uint128 currentTimeWindowStartTime) usage)[])'
        ], provider);
        const spendingRules = await contract.getSpendingRules();
        return {
            success: true,
            rules: spendingRules.map((rule, index) => ({
                index,
                timeWindow: Number(rule.rule.timeWindow),
                budget: ethers_1.ethers.formatUnits(rule.rule.budget, 18),
                used: ethers_1.ethers.formatUnits(rule.usage.amountUsed, 18),
                providersCount: rule.rule.targetProviders.length
            }))
        };
    }
    catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}
exports.viewSpendingRules = viewSpendingRules;
/**
 * Withdraw funds from KitePass
 * 从KitePass提取资金
 */
async function withdrawFunds(eoa, kitepassAddress, amount, tokenAddress = ADDRESSES.SETTLEMENT_TOKEN, signFunction) {
    const sdk = initializeSDK();
    try {
        const withdrawRequest = {
            target: kitepassAddress,
            value: 0n,
            callData: ethers_1.ethers.Interface.from([
                'function withdrawFunds(address token, uint256 amount)'
            ]).encodeFunctionData('withdrawFunds', [
                tokenAddress,
                ethers_1.ethers.parseUnits(amount, 18)
            ])
        };
        console.log(`Withdrawing ${amount} tokens...`);
        const result = await sdk.sendUserOperationAndWait(eoa, withdrawRequest, signFunction);
        if (result.status.status === 'success') {
            return {
                success: true,
                transactionHash: result.status.transactionHash
            };
        }
        else {
            return {
                success: false,
                error: result.status.reason
            };
        }
    }
    catch (error) {
        return {
            success: false,
            error: handleAAError(error)
        };
    }
}
exports.withdrawFunds = withdrawFunds;
/**
 * Check token balance (read-only)
 * 查看代币余额（只读）
 */
async function checkTokenBalance(address, tokenAddress = ADDRESSES.SETTLEMENT_TOKEN) {
    try {
        const provider = new ethers_1.ethers.JsonRpcProvider('https://rpc-testnet.gokite.ai');
        const tokenContract = new ethers_1.ethers.Contract(tokenAddress, [
            'function balanceOf(address account) view returns (uint256)',
            'function symbol() view returns (string)',
            'function decimals() view returns (uint8)'
        ], provider);
        const [balance, symbol, decimals] = await Promise.all([
            tokenContract.balanceOf(address),
            tokenContract.symbol(),
            tokenContract.decimals()
        ]);
        return {
            success: true,
            balance: ethers_1.ethers.formatUnits(balance, decimals),
            symbol,
            decimals,
            address
        };
    }
    catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}
exports.checkTokenBalance = checkTokenBalance;
/**
 * Register a service in the service registry
 * 在服务注册表中注册服务
 *
 * @param eoa - Service owner's EOA address
 * @param serviceId - Service ID (bytes32)
 * @param serviceInfo - Service information
 * @param signFunction - Signing function
 */
async function registerService(eoa, serviceId, serviceInfo, signFunction) {
    const sdk = initializeSDK();
    try {
        const registerRequest = {
            target: ADDRESSES.SERVICE_REGISTRY,
            value: 0n,
            callData: ethers_1.ethers.Interface.from([
                'function registerService(bytes32 serviceId, tuple(address serviceOwner, uint8 priceModel, uint256 unitPrice, bytes32 provider, bytes metadata, string name, bool isPublic) service)'
            ]).encodeFunctionData('registerService', [
                serviceId,
                serviceInfo
            ])
        };
        console.log(`Registering service: ${serviceInfo.name}...`);
        const result = await sdk.sendUserOperationAndWait(eoa, registerRequest, signFunction);
        if (result.status.status === 'success') {
            return {
                success: true,
                transactionHash: result.status.transactionHash,
                serviceId
            };
        }
        else {
            return {
                success: false,
                error: result.status.reason
            };
        }
    }
    catch (error) {
        return {
            success: false,
            error: handleAAError(error)
        };
    }
}
exports.registerService = registerService;
// =============================================================================
// UTILITY FUNCTIONS - 工具函数
// =============================================================================
/**
 * Get TransparentUpgradeableProxy bytecode
 * 获取透明可升级代理字节码
 */
function getTransparentProxyBytecode() {
    return '0x60a0604052610b278038038061001481610293565b928339810160608282031261028e5761002c826102b8565b610038602084016102b8565b604084015190936001600160401b03821161028e570182601f8201121561028e5780519061006d610068836102cc565b610293565b938285526020838301011161028e5760005b828110610279575050602060009184010152803b15610258577f360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc80546001600160a01b0319166001600160a01b0383169081179091557fbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b600080a281511561023f5760008083602061013595519101845af43d15610237573d91610125610068846102cc565b9283523d6000602085013e6102e7565b505b604051906104918083016001600160401b0381118482101761022157602092849261067684396001600160a01b031681520301906000f080156102155760018060a01b031680608052600080516020610b07833981519152547f7e644d79422f17c01e4894b5f4f588d331ebfa28653d42ae832dc59e38c9798f6040805160018060a01b0384168152846020820152a181156101ff576001600160a01b03191617600080516020610b078339815191525560405161032d908161034982396080518160070152f35b633173bdd160e11b600052600060045260246000fd5b6040513d6000823e3d90fd5b634e487b7160e01b600052604160045260246000fd5b6060916102e7565b505034156101375763b398979f60e01b60005260046000fd5b634c9c8ce360e01b60009081526001600160a01b0391909116600452602490fd5b8060208092840101518282880101520161007f565b600080fd5b6040519190601f01601f191682016001600160401b0381118382101761022157604052565b51906001600160a01b038216820361028e57565b6001600160401b03811161022157601f01601f191660200190565b9061030d57508051156102fc57805190602001fd5b630a12f52160e11b60005260046000fd5b8151158061033f575b61031e575090565b639996b31560e01b60009081526001600160a01b0391909116600452602490fd5b50803b1561031656fe6080604052337f00000000000000000000000000000000000000000000000000000000000000006001600160a01b031603610069576000356001600160e01b03191663278f794360e11b1461005f576334ad5dbb60e21b60005260046000fd5b610067610113565b005b7f360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc5460009081906001600160a01b0316368280378136915af43d6000803e156100b1573d6000f35b3d6000fd5b634e487b7160e01b600052604160045260246000fd5b6040519190601f01601f1916820167ffffffffffffffff8111838210176100f257604052565b6100b6565b67ffffffffffffffff81116100f257601f01601f191660200190565b3660041161019d57604036600319011261019d576004356001600160a01b0381169081900361019d576024359067ffffffffffffffff821161019d573660238301121561019d5781600401359061017161016c836100f7565b6100cc565b91808352366024828601011161019d57602081600092602461019b970183870137840101526101a2565b565b600080fd5b90813b15610239577f360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc80546001600160a01b0319166001600160a01b0384169081179091557fbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b600080a280511561021f5761021c9161025b565b50565b50503461022857565b63b398979f60e01b60005260046000fd5b50634c9c8ce360e01b60009081526001600160a01b0391909116600452602490fd5b60008061028f93602081519101845af43d15610292573d9161027f61016c846100f7565b9283523d6000602085013e610296565b90565b6060915b906102bc57508051156102ab57805190602001fd5b630a12f52160e11b60005260046000fd5b815115806102ee575b6102cd575090565b639996b31560e01b60009081526001600160a01b0391909116600452602490fd5b50803b156102c556fea2646970667358221220597147005a6fe654561cbab25a93153cc233180473a65a90bd427f0c1f41018764736f6c634300081c003360803460bc57601f61049138819003918201601f19168301916001600160401b0383118484101760c15780849260209460405283398101031260bc57516001600160a01b0381169081900360bc57801560a657600080546001600160a01b031981168317825560405192916001600160a01b03909116907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e09080a36103b990816100d88239f35b631e4fbdf760e01b600052600060045260246000fd5b600080fd5b634e487b7160e01b600052604160045260246000fdfe6080604052600436101561001257600080fd5b6000803560e01c8063715018a6146102875780638da5cb5b146102605780639623609d1461012f578063ad3cb1cc146100e25763f2fde38b1461005457600080fd5b346100df5760203660031901126100df576004356001600160a01b038116908190036100dd5761008261035a565b80156100c95781546001600160a01b03198116821783556001600160a01b03167f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e08380a380f35b631e4fbdf760e01b82526004829052602482fd5b505b80fd5b50346100df57806003193601126100df575061012b6040516101056040826102e1565b60058152640352e302e360dc1b6020820152604051918291602083526020830190610319565b0390f35b5060603660031901126100df576004356001600160a01b038116908190036100dd576024356001600160a01b038116908190036102405760443567ffffffffffffffff811161025c573660238201121561025c57806004013567ffffffffffffffff8111610248576040518593929091906101b4601f8301601f1916602001846102e1565b81835236602483830101116102445781859260246020930183860137830101526101dc61035a565b833b156102405761021293839260405180968194829363278f794360e11b84526004840152604060248401526044830190610319565b039134905af18015610233576102255780f35b61022e916102e1565b388180f35b50604051903d90823e3d90fd5b8280fd5b8480fd5b634e487b7160e01b85526041600452602485fd5b8380fd5b50346100df57806003193601126100df57546040516001600160a01b039091168152602090f35b50346100df57806003193601126100df576102a061035a565b80546001600160a01b03198116825581906001600160a01b03167f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e08280a380f35b90601f8019910116810190811067ffffffffffffffff82111761030357604052565b634e487b7160e01b600052604160045260246000fd5b919082519283825260005b848110610345575050826000602080949584010152601f8019910116010190565b80602080928401015182828601015201610324565b6000546001600160a01b0316330361036e57565b63118cdaa760e01b6000523360045260246000fdfea26469706673582212207bc32ec723f6be34b228b59aef2ef61b4e6a8eb5bc67fcdd495248566e3b6e0c64736f6c634300081c0033b53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103';
}
exports.getTransparentProxyBytecode = getTransparentProxyBytecode;
/**
 * Parse ContractCreated event from transaction logs
 * 从交易日志中解析合约创建事件
 */
async function parseContractCreatedEvent(transactionHash) {
    try {
        const provider = new ethers_1.ethers.JsonRpcProvider('https://rpc-testnet.gokite.ai');
        const receipt = await provider.getTransactionReceipt(transactionHash);
        if (!receipt)
            return null;
        const contractCreatedEventSignature = ethers_1.ethers.id('ContractCreated(address)');
        for (const log of receipt.logs) {
            if (log.topics[0] === contractCreatedEventSignature) {
                const contractAddress = ethers_1.ethers.AbiCoder.defaultAbiCoder().decode(['address'], log.topics[1])[0];
                return contractAddress;
            }
        }
        return null;
    }
    catch (error) {
        console.error('Error parsing ContractCreated event:', error);
        return null;
    }
}
exports.parseContractCreatedEvent = parseContractCreatedEvent;
// =============================================================================
// EXAMPLE USAGE - 使用示例
// =============================================================================
/**
 * Example usage for frontend integration
 * 前端集成使用示例
 */
async function exampleUsage() {
    // Replace with actual signing function from Privy/Particle
    // 替换为实际的Privy/Particle签名函数
    const signFunction = async (userOpHash) => {
        const signer_pk = process.env.PRIVATE_KEY;
        const signer = new ethers_1.ethers.Wallet(signer_pk);
        return signer.signMessage(ethers_1.ethers.getBytes(userOpHash));
    };
    const userEoa = '0x4A50DCA63d541372ad36E5A36F1D542d51164F19';
    // actual token recipient address
    const toAddress = '0x4A50DCA63d541372ad36E5A36F1D542d51164F19';
    // // 1. Transfer ERC20 tokens
    // console.log('\n=== 1. ERC20 Transfer ===');
    // const transferResult = await transferERC20(
    //   userEoa,
    //   toAddress,
    //   '10',
    //   ADDRESSES.SETTLEMENT_TOKEN,
    //   18,
    //   signFunction
    // );
    // console.log('Transfer result:', transferResult);
    // 2. Deploy KitePass
    console.log('\n=== 2. Deploy KitePass ===');
    const deployResult = await deployKitePass(userEoa, signFunction);
    console.log('Deploy result:', deployResult);
    // if (deployResult.success && deployResult.proxyAddress) {
    //   // 3. Configure spending rules
    //   console.log('\n=== 3. Configure Spending Rules ===');
    //   const configResult = await configureSpendingRules(
    //     userEoa,
    //     deployResult.proxyAddress,
    //     signFunction
    //   );
    //   console.log('Config result:', configResult);
    //   // 4. View spending rules
    //   console.log('\n=== 4. View Spending Rules ===');
    //   const rulesResult = await viewSpendingRules(deployResult.proxyAddress);
    //   console.log('Rules result:', rulesResult);
    // }
    // // 5. Register service
    // console.log('\n=== 5. Register Service ===');
    // // serviceId, get from backend
    // const serviceId = ethers.hexlify(randomBytes(32));
    // const sdk = initializeSDK();
    // const serviceOwner = sdk.getAccountAddress(userEoa);
    // const serviceResult = await registerService(
    //   userEoa,
    //   serviceId,
    //   {
    //     serviceOwner: serviceOwner,
    //     priceModel: 0,
    //     unitPrice: 100,
    //     // provider Id, bytes32
    //     provider: ethers.hexlify(randomBytes(32)),
    //     // service metadata, currently not used
    //     metadata: '0x',
    //     name: 'Test Service',
    //     isPublic: true
    //   },
    //   signFunction
    // );
    // console.log('Service result:', serviceResult);
}
// Run example if executed directly
if (require.main === module) {
    exampleUsage().catch(console.error);
}
