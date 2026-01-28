<template>
  <div class="payroll-task">
    <h1>发薪任务</h1>

    <div class="form-container">
      <form @submit.prevent="submitPayroll">
        <div class="form-group">
          <label for="employeeAddress">员工地址</label>
          <input
            type="text"
            id="employeeAddress"
            v-model="employeeAddress"
            placeholder="0x1234567890123456789012345678901234567890"
            required
          />
        </div>

        <div class="form-group">
          <label for="amount">金额</label>
          <div class="amount-input">
            <input
              type="number"
              id="amount"
              v-model="amount"
              placeholder="10000"
              required
            />
            <span class="encrypted-badge">已加密</span>
          </div>
        </div>

        <button type="submit" class="submit-btn" :disabled="isSubmitting">
          {{ isSubmitting ? "处理中..." : "启动发薪流程" }}
        </button>
      </form>
    </div>

    <!-- 员工列表 -->
    <div class="employees-list">
      <h3>员工列表</h3>
      <div class="employees-table">
        <table>
          <thead>
            <tr>
              <th>员工地址</th>
              <th>金额</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(employee, index) in employees" :key="index">
              <td>{{ employee.address }}</td>
              <td>
                {{ employee.amount }}
                <span class="encrypted-badge small">已加密</span>
              </td>
              <td>
                <button class="remove-btn" @click="removeEmployee(index)">
                  删除
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import axios from "axios";

const employeeAddress = ref("");
const amount = ref("");
const isSubmitting = ref(false);
const employees = ref([]);

// 添加员工
const submitPayroll = async () => {
  if (!employeeAddress.value || !amount.value) return;

  // 添加员工到列表
  employees.value.push({
    address: employeeAddress.value,
    amount: amount.value,
  });

  // 清空表单
  employeeAddress.value = "";
  amount.value = "";
};

// 移除员工
const removeEmployee = (index) => {
  employees.value.splice(index, 1);
};

// 启动发薪流程
const startPayrollProcess = async () => {
  if (employees.value.length === 0) return;

  isSubmitting.value = true;
  try {
    const response = await axios.post("/api/runPayroll", {
      employees: employees.value.map((emp) => ({
        id: `emp${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
        name: `Employee ${employees.value.indexOf(emp) + 1}`,
        address: emp.address,
        amount: emp.amount,
      })),
    });

    console.log("Payroll process started:", response.data);
    // 可以跳转到流程可视化页面
    window.location.href = "/process";
  } catch (error) {
    console.error("Failed to start payroll process:", error);
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style scoped>
.payroll-task {
  padding: 20px;
}

.form-container {
  background: #f5f5f5;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 30px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  font-family: "Courier New", monospace;
}

.amount-input {
  position: relative;
}

.encrypted-badge {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
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
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.3s;
}

.submit-btn:hover {
  background: #40a9ff;
}

.submit-btn:disabled {
  background: #d9d9d9;
  cursor: not-allowed;
}

.employees-list {
  margin-top: 30px;
}

.employees-list h3 {
  margin-bottom: 15px;
  color: #333;
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

.remove-btn {
  background: #ff4d4f;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.3s;
}

.remove-btn:hover {
  background: #ff7875;
}
</style>
