require('dotenv').config();

const config = {
  // Kite AI支付配置
  kite: {
    rpcUrl: process.env.KITE_RPC_URL || 'https://rpc.kite.ai',
    apiKey: process.env.KITE_API_KEY || '',
    chainId: process.env.KITE_CHAIN_ID || 1 // 默认主网，根据实际网络调整
  },
  
  // Agent配置
  agents: {
    hr: {
      privateKey: process.env.HR_AGENT_KEY || ''
    },
    payroll: {
      privateKey: process.env.PAYROLL_AGENT_KEY || ''
    },
    employee: {
      privateKey: process.env.EMPLOYEE_AGENT_KEY || ''
    }
  },
  
  // 环境配置
  environment: process.env.ENVIRONMENT || 'development',
  
  // 加密配置
  encryption: {
    algorithm: 'aes-256-cbc',
    ivLength: 16
  }
};

module.exports = config;