<template>
  <div class="process-visualization">
    <h1>流程可视化</h1>
    
    <!-- 时间线 -->
    <div class="timeline">
      <h3>发薪流程时间线</h3>
      <div class="timeline-container">
        <div 
          v-for="(step, index) in processSteps" 
          :key="index"
          class="timeline-item"
          :class="step.status"
        >
          <div class="timeline-marker">
            {{ step.status === 'completed' ? '✓' : step.status === 'processing' ? '⏳' : '○' }}
          </div>
          <div class="timeline-content">
            <h4>{{ step.title }}</h4>
            <p class="timeline-description">{{ step.description }}</p>
            <p class="timeline-time">{{ step.time || '' }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 日志窗口 -->
    <div class="logs-window">
      <h3>流程日志</h3>
      <div class="logs-container">
        <div 
          v-for="(log, index) in processLogs" 
          :key="index"
          class="log-item"
          :class="log.level"
        >
          <span class="log-time">{{ log.time }}</span>
          <span class="log-level">{{ log.level.toUpperCase() }}</span>
          <span class="log-message">{{ log.message }}</span>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="action-buttons">
      <button class="refresh-btn" @click="refreshProcess">刷新状态</button>
      <button class="clear-btn" @click="clearLogs">清空日志</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const processSteps = ref([
  {
    title: '初始化流程',
    description: '系统准备发薪流程，验证参数',
    status: 'completed',
    time: new Date().toLocaleString()
  },
  {
    title: 'HR创建工资单',
    description: 'HR Agent 创建工资单并加密金额',
    status: 'completed',
    time: new Date().toLocaleString()
  },
  {
    title: 'Payroll处理支付',
    description: 'Payroll Agent 解密金额并执行支付',
    status: 'completed',
    time: new Date().toLocaleString()
  },
  {
    title: 'Employee验证到账',
    description: 'Employee Agent 验证支付到账情况',
    status: 'completed',
    time: new Date().toLocaleString()
  },
  {
    title: '生成最终报告',
    description: '系统生成发薪流程最终报告',
    status: 'completed',
    time: new Date().toLocaleString()
  }
]);

const processLogs = ref([
  {
    time: new Date().toLocaleString(),
    level: 'info',
    message: '系统启动发薪流程'
  },
  {
    time: new Date().toLocaleString(),
    level: 'info',
    message: 'HR Agent 创建工资单: payroll_1769583013998'
  },
  {
    time: new Date().toLocaleString(),
    level: 'info',
    message: 'HR Agent 加密工资金额'
  },
  {
    time: new Date().toLocaleString(),
    level: 'info',
    message: 'Payroll Agent 处理工资单: payroll_1769583013998'
  },
  {
    time: new Date().toLocaleString(),
    level: 'info',
    message: 'Payroll Agent 解密张三工资: 10000'
  },
  {
    time: new Date().toLocaleString(),
    level: 'success',
    message: 'Payroll Agent 执行支付到 0x1234567890123456789012345678901234567890: 10000'
  },
  {
    time: new Date().toLocaleString(),
    level: 'info',
    message: 'Payroll Agent 解密李四工资: 15000'
  },
  {
    time: new Date().toLocaleString(),
    level: 'success',
    message: 'Payroll Agent 执行支付到 0x0987654321098765432109876543210987654321: 15000'
  },
  {
    time: new Date().toLocaleString(),
    level: 'info',
    message: 'Payroll Agent 解密王五工资: 12000'
  },
  {
    time: new Date().toLocaleString(),
    level: 'success',
    message: 'Payroll Agent 执行支付到 0x1122334455667788990011223344556677889900: 12000'
  },
  {
    time: new Date().toLocaleString(),
    level: 'info',
    message: 'Employee Agent 验证张三到账: success'
  },
  {
    time: new Date().toLocaleString(),
    level: 'info',
    message: 'Employee Agent 验证李四到账: success'
  },
  {
    time: new Date().toLocaleString(),
    level: 'info',
    message: 'Employee Agent 验证王五到账: success'
  },
  {
    time: new Date().toLocaleString(),
    level: 'success',
    message: '发薪流程完成，共成功发放 3 笔工资'
  }
]);

// 刷新流程状态
const refreshProcess = () => {
  // 模拟刷新操作
  processLogs.value.push({
    time: new Date().toLocaleString(),
    level: 'info',
    message: '刷新流程状态'
  });
};

// 清空日志
const clearLogs = () => {
  processLogs.value = [];
};

onMounted(() => {
  // 模拟流程执行
  console.log('Process visualization mounted');
});
</script>

<style scoped>
.process-visualization {
  padding: 20px;
}

/* 时间线样式 */
.timeline {
  margin-bottom: 30px;
}

.timeline h3 {
  margin-bottom: 20px;
  color: #333;
}

.timeline-container {
  position: relative;
  padding-left: 30px;
}

.timeline-container::before {
  content: '';
  position: absolute;
  left: 15px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #ddd;
}

.timeline-item {
  position: relative;
  margin-bottom: 30px;
  padding-left: 30px;
}

.timeline-marker {
  position: absolute;
  left: -30px;
  top: 0;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  z-index: 1;
}

.timeline-item.completed .timeline-marker {
  background: #52c41a;
  color: white;
}

.timeline-item.processing .timeline-marker {
  background: #1890ff;
  color: white;
}

.timeline-item.pending .timeline-marker {
  background: #f0f0f0;
  color: #999;
}

.timeline-content {
  background: #f5f5f5;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.timeline-content h4 {
  margin-top: 0;
  margin-bottom: 5px;
  color: #333;
  font-size: 16px;
}

.timeline-description {
  margin: 5px 0;
  color: #666;
  font-size: 14px;
}

.timeline-time {
  margin: 5px 0 0 0;
  color: #999;
  font-size: 12px;
}

/* 日志窗口样式 */
.logs-window {
  margin-bottom: 30px;
}

.logs-window h3 {
  margin-bottom: 15px;
  color: #333;
}

.logs-container {
  background: #f5f5f5;
  border-radius: 8px;
  padding: 15px;
  max-height: 400px;
  overflow-y: auto;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.log-item {
  padding: 8px 0;
  border-bottom: 1px solid #eee;
  display: flex;
  font-family: 'Courier New', monospace;
  font-size: 13px;
}

.log-item:last-child {
  border-bottom: none;
}

.log-time {
  color: #999;
  margin-right: 15px;
  min-width: 140px;
}

.log-level {
  margin-right: 15px;
  min-width: 70px;
  font-weight: bold;
}

.log-level.INFO {
  color: #1890ff;
}

.log-level.SUCCESS {
  color: #52c41a;
}

.log-level.ERROR {
  color: #ff4d4f;
}

.log-level.WARNING {
  color: #faad14;
}

.log-message {
  color: #333;
  flex: 1;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  gap: 10px;
}

.refresh-btn, .clear-btn {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
}

.refresh-btn:hover {
  background: #f0f0f0;
  border-color: #1890ff;
  color: #1890ff;
}

.clear-btn:hover {
  background: #f0f0f0;
  border-color: #ff4d4f;
  color: #ff4d4f;
}
</style>