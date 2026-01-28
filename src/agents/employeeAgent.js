const BaseAgent = require('./baseAgent');
const config = require('../config');

class EmployeeAgent extends BaseAgent {
  constructor(employeeId, name, address) {
    super('Employee', config.agents.employee.privateKey);
    this.employeeId = employeeId;
    this.name = name;
    this.address = address;
  }

  async checkPayment(paymentId) {
    try {
      const payment = await this.callKiteMethod('getPayment', { id: paymentId });
      console.log(`${this.name} checked payment ${paymentId}:`, payment.status);
      return payment;
    } catch (error) {
      console.error(`${this.name} failed to check payment ${paymentId}:`, error);
      throw error;
    }
  }

  async verifyReceipt(expectedAmount) {
    try {
      const balance = await this.getBalance(this.address);
      console.log(`${this.name} current balance: ${balance}`);
      
      // 这里简化处理，实际应该检查交易记录确认到账
      const receipt = {
        employeeId: this.employeeId,
        name: this.name,
        address: this.address,
        expectedAmount: expectedAmount,
        currentBalance: balance,
        verifiedAt: new Date().toISOString(),
        status: 'verified'
      };
      
      console.log(`${this.name} verified receipt:`, receipt);
      return receipt;
    } catch (error) {
      console.error(`${this.name} failed to verify receipt:`, error);
      throw error;
    }
  }

  async receivePayment(paymentInfo) {
    console.log(`${this.name} received payment notification:`, paymentInfo.paymentId);
    
    const payment = await this.checkPayment(paymentInfo.paymentId);
    const receipt = await this.verifyReceipt(paymentInfo.amount);
    
    return {
      ...receipt,
      paymentId: paymentInfo.paymentId,
      paymentStatus: payment.status
    };
  }
}

module.exports = EmployeeAgent;