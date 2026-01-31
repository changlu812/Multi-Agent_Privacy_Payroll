# MVP: KiteAI Testnet 隐私支付系统

本MVP（最小可行产品）在KiteAI Testnet上实现了一个隐私支付系统，允许用户使用LITE协议发送带有隐私保护的USDT代币。

## 目录

- [功能特点](#功能特点)
- [环境搭建](#环境搭建)
- [快速开始](#快速开始)
- [使用方法](#使用方法)
- [配置说明](#配置说明)
- [核心组件](#核心组件)
- [技术架构](#技术架构)
- [故障排除](#故障排除)

## 功能特点

✅ **隐私支付**：使用LITE协议发送带有隐私保护的USDT
✅ **KiteAI Testnet集成**：在KiteAI测试网上完全功能
✅ **API集成**：使用LITE API获取隐私签名
✅ **智能合约交互**：与LITE和USDT合约交互
✅ **命令行界面**：易于使用的CLI执行支付
✅ **地址簿**：使用人类可读的名称管理收款人

## 环境搭建

### 先决条件

- Python 3.8+
- pip (Python包管理器)
- 互联网连接

### 安装步骤

1. **克隆仓库**（如果尚未完成）：

   ```bash
   git clone <repository-url>
   cd Multi-Agent_Payment
   ```

2. **创建并激活虚拟环境**：

   ```bash
   # Windows
   python -m venv venv
   venv\Scripts\activate

   # Linux/Mac
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **安装所需依赖**：

   ```bash
   pip install web3 requests
   ```

4. **设置环境变量**：

   ```bash
   # Windows
   set ETH_PRIVATE_KEY=0xYOUR_PRIVATE_KEY

   # Linux/Mac
   export ETH_PRIVATE_KEY=0xYOUR_PRIVATE_KEY
   ```

   _注意：将 `0xYOUR_PRIVATE_KEY` 替换为您的实际以太坊私钥。_

## 快速开始

### 1. 测试网络连接

```bash
python mvp/pay.py
```

这将：

- 连接到KiteAI Testnet
- 检查LITE合约的USDT余额
- 尝试发送支付（如果未设置私钥将失败）

### 2. 执行隐私支付

```bash
# 使用环境变量中的私钥
python mvp/main.py --recipient target --amount 1.0

# 或直接提供私钥
python mvp/main.py --recipient target --amount 1.0 --private-key 0xYOUR_PRIVATE_KEY
```

## 使用方法

### 主命令

```bash
python mvp/main.py [OPTIONS]
```

### 选项

| 选项          | 简写 | 描述                 | 默认值                      |
| ------------- | ---- | -------------------- | --------------------------- |
| --recipient   | -r   | 地址簿中的收款人名称 | target                      |
| --amount      | -a   | 发送的USDT金额       | 1.0                         |
| --private-key | -k   | 以太坊私钥           | 使用ETH_PRIVATE_KEY环境变量 |

### 示例

1. **向target发送1.0 USDT**：

   ```bash
   python mvp/main.py
   ```

2. **向laowang发送5.0 USDT**：

   ```bash
   python mvp/main.py --recipient laowang --amount 5.0
   ```

3. **使用显式私钥发送**：
   ```bash
   python mvp/main.py --recipient target --amount 1.0 --private-key 0xYOUR_PRIVATE_KEY
   ```

## 配置说明

### 网络设置 (pay.py)

```python
# KiteAI Testnet Settings
RPC_URL = "https://rpc-testnet.gokite.ai/"
CHAIN_ID = 2368

# Contract Addresses
LITE_ADDR = '0x35A9b4E215c8Bf9b7bFF83Ac08aD32dEE8D19F64'
USDT_ADDR = "0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63"

# LITE API
LITE_API = "https://pusdc-kite-testnet.zentra.dev"
```

### 地址簿 (pay.py)

```python
address_book = {
    'laowang': '0x35A9b4E215c8Bf9b7bFF83Ac08aD32dEE8D19F64',
    'target': '0x376d3737Da2A540318BbA02A98f03a97d1DD8f6d'
}
```

## 核心组件

### 1. `pay.py`

- **主要支付逻辑**：处理整个隐私支付过程
- **网络连接**：连接到KiteAI Testnet
- **智能合约交互**：查询余额并发送交易
- **API集成**：从LITE API获取隐私签名
- **交易管理**：构建、签名和发送交易

### 2. `main.py`

- **命令行界面**：解析命令行参数
- **用户交互**：提供友好的输出和错误信息
- **流程控制**：协调支付过程

### 3. `hr.py`

- **薪资信息系统**：提供演示用的薪资数据
- **AI集成**：使用OpenAI API进行自然语言交互

## 技术架构

### 支付流程

1. **初始化**：连接到KiteAI Testnet
2. **余额检查**：查询LITE合约的USDT余额
3. **状态获取**：从LITE合约获取nonce和余额
4. **签名请求**：从LITE API获取隐私签名
5. **交易构建**：构建privacyTransfer交易
6. **交易签名**：使用私钥签名交易
7. **交易发送**：将交易提交到网络
8. **确认等待**：等待交易确认

### 数据流

```
用户 → main.py → pay.py → Web3 → KiteAI Testnet
                          ↓
                       LITE API → 签名
                          ↓
用户 ← main.py ← pay.py ← 交易收据
```

## 故障排除

### 常见问题

1. **连接失败**
   - 检查互联网连接
   - 验证RPC URL是否正确
   - 确保KiteAI Testnet正常运行

2. **认证错误**
   - 验证私钥是否正确
   - 确保私钥有足够的资金支付gas

3. **API错误**
   - 检查LITE API可用性
   - 验证交易参数是否有效

4. **交易失败**
   - 检查gas价格和限制
   - 验证发送方有足够的余额
   - 检查收款人地址是否有效

### 错误消息

| 错误消息                    | 可能原因           | 解决方案                            |
| --------------------------- | ------------------ | ----------------------------------- |
| `ETH_PRIVATE_KEY not found` | 未设置私钥         | 设置环境变量或使用--private-key选项 |
| `Recipient not found`       | 收款人不在地址簿中 | 在pay.py的address_book中添加收款人  |
| `Failed to connect`         | 网络问题           | 检查RPC URL和互联网连接             |
| `API Error`                 | LITE API问题       | 检查API可用性和参数                 |

## 安全注意事项

⚠️ **重要**：永远不要将私钥提交到版本控制。使用环境变量或安全的密钥管理解决方案。

⚠️ **仅测试网**：本系统专为KiteAI Testnet设计。不要在主网上使用真实资金。

## 许可证

MIT License
