<template>
  <div class="payroll-task">
    <!-- <h1>发薪任务</h1> -->

    <!-- 员工列表 -->
    <div class="employees-list">
      <div class="list-header">
        <h3>员工列表</h3>
        <button
          class="submit-btn"
          @click="startPayrollProcess"
          :disabled="isSubmitting || employees.length === 0"
        >
          {{ isSubmitting ? "处理中..." : "启动发薪流程" }}
        </button>
      </div>
      <div class="employees-table">
        <table>
          <thead>
            <tr>
              <th>员工ID</th>
              <th>员工姓名</th>
              <th>员工地址</th>
              <th>金额</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="employee in employees" :key="employee.id">
              <td>{{ employee.id }}</td>
              <td>{{ employee.name }}</td>
              <td>{{ employee.address }}</td>
              <td>
                {{ employee.amount }}
                <span class="encrypted-badge small">已加密</span>
              </td>
            </tr>
            <tr v-if="employees.length === 0">
              <td colspan="4" class="no-data">暂无员工数据</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import axios from "axios";

const isSubmitting = ref(false);
const employees = ref([]);

// 获取员工列表
const getEmployees = async () => {
  try {
    // 这里可以从后端API获取员工列表
    // 暂时使用模拟数据
    employees.value = [
      {
        id: "emp001",
        name: "张三",
        address: "0x1234567890123456789012345678901234567890",
        amount: "10000",
      },
      {
        id: "emp002",
        name: "李四",
        address: "0x0987654321098765432109876543210987654321",
        amount: "15000",
      },
      {
        id: "emp003",
        name: "王五",
        address: "0x1122334455667788990011223344556677889900",
        amount: "12000",
      },
    ];
  } catch (error) {
    console.error("Failed to get employees:", error);
  }
};

// 启动发薪流程
const startPayrollProcess = async () => {
  if (employees.value.length === 0) return;

  isSubmitting.value = true;
  try {
    const response = await axios.post("http://localhost:3000/api/runPayroll", {
      employees: employees.value,
    });

    console.log("Payroll process started:", response.data);
    // 跳转到流程可视化页面，添加参数标识来自发薪任务页
    window.location.href = "/process?fromPayroll=true";
  } catch (error) {
    console.error("Failed to start payroll process:", error);
  } finally {
    isSubmitting.value = false;
  }
};

// 页面加载时获取员工列表
onMounted(() => {
  getEmployees();
});
</script>

<style scoped>
.payroll-task {
  padding: 20px;
}

.employees-list {
  margin-top: 20px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.list-header h3 {
  margin: 0;
  color: #333;
}

.encrypted-badge {
  background: #e6f7ee;
  color: #137333;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
}

.encrypted-badge.small {
  font-size: 10px;
  padding: 2px 8px;
}

.submit-btn {
  background: #fff;
  color: #333;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.submit-btn:hover:not(:disabled) {
  background: #f5f5f5;
  border-color: #d0d0d0;
}

.submit-btn:disabled {
  background: #f5f5f5;
  color: #999;
  border-color: #e0e0e0;
  cursor: not-allowed;
}

.employees-table {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  background: #f5f5f5;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

th,
td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

th {
  background: #f0f0f0;
  font-weight: 500;
  color: #333;
}

tr:hover {
  background: #fafafa;
}

.no-data {
  text-align: center;
  padding: 40px;
  color: #999;
}
</style>
