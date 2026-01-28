<template>
  <div class="dashboard">
    <h1>系统状态</h1>
    
    <div class="status-grid">
      <!-- 网络状态 -->
      <div class="status-card">
        <h3>网络状态</h3>
        <div class="status-item">
          <span class="label">当前网络：</span>
          <span class="value">Kite Testnet</span>
        </div>
      </div>

      <!-- 合约信息 -->
      <div class="status-card">
        <h3>合约信息</h3>
        <div class="status-item">
          <span class="label">Payroll 合约地址：</span>
          <span class="value address">{{ payrollContractAddress }}</span>
        </div>
      </div>

      <!-- 地址信息 -->
      <div class="status-card">
        <h3>Agent 地址</h3>
        <div class="status-item">
          <span class="label">HR 地址：</span>
          <span class="value address">{{ hrAddress }}</span>
        </div>
        <div class="status-item">
          <span class="label">Payroll 地址：</span>
          <span class="value address">{{ payrollAddress }}</span>
        </div>
        <div class="status-item">
          <span class="label">Employee 地址：</span>
          <span class="value address">{{ employeeAddress }}</span>
        </div>
      </div>

      <!-- 余额信息 -->
      <div class="status-card">
        <h3>余额信息</h3>
        <div class="status-item">
          <span class="label">当前余额：</span>
          <span class="value">{{ currentBalance }} CNY</span>
        </div>
      </div>

      <!-- 发薪状态 -->
      <div class="status-card">
        <h3>发薪状态</h3>
        <div class="status-item">
          <span class="label">最近一次发薪：</span>
          <span class="value">{{ lastPayrollDate || '未执行' }}</span>
        </div>
        <div class="status-item">
          <span class="label">发薪状态：</span>
          <span class="value status-badge" :class="lastPayrollStatus">{{ lastPayrollStatusText }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import axios from 'axios';

// 系统状态数据
const payrollContractAddress = ref('0x1234567890123456789012345678901234567890');
const hrAddress = ref('0x0987654321098765432109876543210987654321');
const payrollAddress = ref('0x1122334455667788990011223344556677889900');
const employeeAddress = ref('0x2233445566778899001122334455667788990011');
const currentBalance = ref('100000');
const lastPayrollDate = ref('2026-01-28 14:50:14');
const lastPayrollStatus = ref('success');
const lastPayrollStatusText = ref('成功');
const isLoading = ref(false);

// 定时器
let statusUpdateInterval = null;

// 获取系统状态
const getSystemStatus = async () => {
  isLoading.value = true;
  try {
    // 实际项目中这里应该调用API获取真实数据
    // 暂时模拟数据更新
    console.log('Getting system status...');
    
    // 模拟余额更新
    const newBalance = (parseInt(currentBalance.value) - Math.floor(Math.random() * 1000)).toString();
    currentBalance.value = newBalance;
    
    // 模拟最后发薪时间更新
    lastPayrollDate.value = new Date().toLocaleString();
    
  } catch (error) {
    console.error('Failed to get system status:', error);
  } finally {
    isLoading.value = false;
  }
};

// 初始化定时器
const startStatusUpdates = () => {
  // 每30秒更新一次系统状态
  statusUpdateInterval = setInterval(getSystemStatus, 30000);
};

// 清理定时器
const clearStatusUpdates = () => {
  if (statusUpdateInterval) {
    clearInterval(statusUpdateInterval);
    statusUpdateInterval = null;
  }
};

onMounted(() => {
  getSystemStatus();
  startStatusUpdates();
});

onBeforeUnmount(() => {
  clearStatusUpdates();
});
</script>

<style scoped>
.dashboard {
  padding: 20px;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.status-card {
  background: #f5f5f5;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.status-card h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #333;
  font-size: 16px;
  border-bottom: 1px solid #ddd;
  padding-bottom: 10px;
}

.status-item {
  margin-bottom: 10px;
  display: flex;
  flex-direction: column;
}

.label {
  font-size: 14px;
  color: #666;
  margin-bottom: 5px;
}

.value {
  font-size: 14px;
  color: #333;
  font-family: 'Courier New', monospace;
}

.address {
  font-size: 12px;
  word-break: break-all;
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.success {
  background: #e6f7ee;
  color: #137333;
}

.status-badge.failed {
  background: #fff1f0;
  color: #c5221f;
}

.status-badge.pending {
  background: #fffbf0;
  color: #d48806;
}
</style>