const BaseAgent = require('./baseAgent');
const config = require('../config');

class HRAgent extends BaseAgent {
  constructor() {
    super('HR', config.agents.hr.privateKey);
    this.encryptionKey = 'hr_encryption_key_2024';
  }

  createPayroll(employees) {
    const payroll = {
      id: `payroll_${Date.now()}`,
      date: new Date().toISOString(),
      employees: employees.map(employee => ({
        id: employee.id,
        name: employee.name,
        address: employee.address,
        encryptedAmount: this.encryptSalary(employee.amount)
      }))
    };
    console.log('HR Agent created payroll:', payroll.id);
    return payroll;
  }

  encryptSalary(amount) {
    const encrypted = this.encryptData(amount.toString(), this.encryptionKey);
    console.log('HR Agent encrypted salary amount');
    return encrypted;
  }

  getEncryptionKey() {
    return this.encryptionKey;
  }
}

module.exports = HRAgent;