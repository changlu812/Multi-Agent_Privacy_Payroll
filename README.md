# 基于Kite AI支付的多Agent工资结算系统

## 项目简介

本项目基于Kite AI支付，实现在工资发放场景下的多Agent结算系统。使用html、css、JavaScript、node.js技术栈，暂不接入智能合约。

## 项目结构

```
├── package.json
├── .env
├── README.md
└── src/
    ├── index.js              # 程序入口（启动 orchestrator）
    ├── orchestrator.js       # 调度器
    ├── config.js             # Kite RPC / 合约地址等
    └── agents/
        ├── baseAgent.js      # Agent 基类（封装 Kite SDK）
        ├── hrAgent.js        # HR Agent
        ├── payrollAgent.js   # Payroll Agent
        └── employeeAgent.js  # Employee Agent
```

## Agent分工

| Agent              | 职责                 |
| ------------------ | -------------------- |
| HR Agent           | 创建工资单、加密金额 |
| Payroll Agent      | 解密 + 执行支付      |
| Employee Agent     | 接收 & 验证到账      |
| Orchestrator Agent | 串流程               |

## 技术栈

- Node.js
- JavaScript
- Kite AI支付 SDK (gokite-aa-sdk)

## 安装与运行

### 安装依赖

```bash
npm install
```

### 配置环境变量

编辑 `.env` 文件，填写相关配置：

```
# Kite AI支付配置
KITE_RPC_URL=https://rpc.kite.ai
KITE_API_KEY=your_kite_api_key

# Agent配置
HR_AGENT_KEY=hr_agent_private_key
PAYROLL_AGENT_KEY=payroll_agent_private_key
EMPLOYEE_AGENT_KEY=employee_agent_private_key

# 其他配置
ENVIRONMENT=development
```

### 启动项目

```bash
npm start
```

## 流程说明

1. **HR Agent** 创建工资单并加密金额
2. **Payroll Agent** 解密金额并执行支付
3. **Employee Agent** 接收并验证到账
4. **Orchestrator Agent** 负责整个流程的调度

## 注意事项

- 本项目暂不接入智能合约
- 实际使用时需替换真实的API密钥和私钥
- 确保网络环境能够访问Kite AI支付服务
