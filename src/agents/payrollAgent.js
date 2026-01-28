const BaseAgent = require('./baseAgent');
const config = require('../config');

class PayrollAgent extends BaseAgent {
  constructor() {
    super('Payroll', config.agents.payroll.privateKey);
  }

  async processPayroll(payroll, encryptionKey) {
    console.log('Payroll Agent processing payroll:', payroll.id);
    
    const paymentResults = [];
    
    for (const employee of payroll.employees) {
      try {
        const amount = this.decryptSalary(employee.encryptedAmount, encryptionKey);
        console.log(`Payroll Agent decrypted salary for ${employee.name}: ${amount}`);
        
        const paymentResult = await this.executePayment(employee.address, amount);
        paymentResults.push({
          employeeId: employee.id,
          name: employee.name,
          address: employee.address,
          amount: amount,
          paymentId: paymentResult.id,
          status: paymentResult.status
        });
      } catch (error) {
        console.error(`Payroll Agent failed to process payment for ${employee.name}:`, error);
        paymentResults.push({
          employeeId: employee.id,
          name: employee.name,
          address: employee.address,
          status: 'failed',
          error: error.message
        });
      }
    }
    
    console.log('Payroll Agent completed processing payroll:', payroll.id);
    return {
      payrollId: payroll.id,
      processedAt: new Date().toISOString(),
      results: paymentResults
    };
  }

  decryptSalary(encryptedAmount, encryptionKey) {
    return this.decryptData(
      encryptedAmount.encryptedData,
      encryptionKey,
      encryptedAmount.iv
    );
  }

  async executePayment(address, amount) {
    try {
      const result = await this.sendPayment(address, amount, 'CNY');
      console.log(`Payroll Agent executed payment to ${address}: ${amount}`);
      return {
        id: result.id,
        status: 'success'
      };
    } catch (error) {
      console.error(`Payroll Agent failed to execute payment to ${address}:`, error);
      throw error;
    }
  }
}

module.exports = PayrollAgent;