const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

// 导入调度器
const Orchestrator = require('./src/orchestrator');

const app = express();
const port = 3000;

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 静态文件服务
app.use(express.static(path.join(__dirname, 'frontend', 'dist')));

// API接口
app.post('/api/runPayroll', async (req, res) => {
  try {
    const { employees } = req.body;
    
    if (!employees || !Array.isArray(employees)) {
      return res.status(400).json({ error: 'Invalid employees data' });
    }

    console.log('Received payroll request:', employees);

    // 初始化调度器
    const orchestrator = new Orchestrator();
    
    // 运行发薪流程
    const result = await orchestrator.runPayrollProcess(employees);

    console.log('Payroll process completed:', result);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error running payroll:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 健康检查接口
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// 所有其他路由都返回前端应用
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
});

// 启动服务器
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log('API endpoints:');
  console.log('  POST /api/runPayroll - Run payroll process');
  console.log('  GET /api/health - Health check');
});

module.exports = app;