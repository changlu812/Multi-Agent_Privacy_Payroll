const Orchestrator = require('./orchestrator');

async function main() {
  console.log('Starting multi-agent payment system...');
  
  try {
    // 初始化调度器
    const orchestrator = new Orchestrator();
    
    // 模拟员工数据
    const employees = [
      {
        id: 'emp001',
        name: '张三',
        address: '0x1234567890123456789012345678901234567890',
        amount: '10000'
      },
      {
        id: 'emp002',
        name: '李四',
        address: '0x0987654321098765432109876543210987654321',
        amount: '15000'
      },
      {
        id: 'emp003',
        name: '王五',
        address: '0x1122334455667788990011223344556677889900',
        amount: '12000'
      }
    ];
    
    // 运行工资发放流程
    console.log('Running payroll process for', employees.length, 'employees...');
    const report = await orchestrator.runPayrollProcess(employees);
    
    // 输出最终报告
    console.log('\n=== Payroll Process Report ===');
    console.log('Payroll ID:', report.payrollId);
    console.log('Processed At:', report.processedAt);
    console.log('Total Employees:', report.totalEmployees);
    console.log('Successful Payments:', report.successfulPayments);
    console.log('\nPayment Results:');
    report.paymentResults.forEach(result => {
      console.log(`${result.name}: ${result.status} - ${result.amount}`);
    });
    console.log('\nReceipt Results:');
    report.receiptResults.forEach(receipt => {
      console.log(`${receipt.name}: ${receipt.status} - Balance: ${receipt.currentBalance}`);
    });
    console.log('\n=== Process Completed ===');
    
  } catch (error) {
    console.error('Error in payroll process:', error);
  }
}

main();