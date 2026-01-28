const HRAgent = require("./agents/hrAgent");
const PayrollAgent = require("./agents/payrollAgent");
const EmployeeAgent = require("./agents/employeeAgent");

class Orchestrator {
  constructor() {
    this.hrAgent = null;
    this.payrollAgent = null;
    this.employeeAgents = new Map();
    this.init();
  }

  async init() {
    try {
      this.hrAgent = new HRAgent();
      this.payrollAgent = new PayrollAgent();
      console.log("Orchestrator initialized successfully");
    } catch (error) {
      console.error("Orchestrator initialization failed:", error);
      throw error;
    }
  }

  async runPayrollProcess(employees) {
    console.log("Orchestrator starting payroll process");

    try {
      // 1. HR Agent 创建工资单
      const payroll = this.hrAgent.createPayroll(employees);

      // 2. Payroll Agent 处理支付
      const encryptionKey = this.hrAgent.getEncryptionKey();
      const payrollProcessResult = await this.payrollAgent.processPayroll(
        payroll,
        encryptionKey,
      );
      const paymentResults = payrollProcessResult.results;

      // 3. Employee Agents 验证到账
      const receiptResults = [];
      for (const result of paymentResults) {
        if (result.status === "success") {
          const employeeAgent = new EmployeeAgent(
            result.employeeId,
            result.name,
            result.address,
          );

          const receipt = await employeeAgent.receivePayment({
            paymentId: result.paymentId,
            amount: result.amount,
          });

          receiptResults.push(receipt);
        }
      }

      // 4. 生成最终报告
      const report = {
        payrollId: payroll.id,
        processedAt: payrollProcessResult.processedAt,
        totalEmployees: employees.length,
        successfulPayments: paymentResults.filter((r) => r.status === "success")
          .length,
        paymentResults: paymentResults,
        receiptResults: receiptResults,
      };

      console.log("Orchestrator completed payroll process:", report);
      return report;
    } catch (error) {
      console.error("Orchestrator payroll process failed:", error);
      throw error;
    }
  }
}

module.exports = Orchestrator;
