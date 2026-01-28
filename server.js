const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// 导入调度器
const Orchestrator = require('./src/orchestrator');

const app = express();
const port = process.env.PORT || 3000;

// 添加请求日志中间件
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// API接口 - 必须在静态文件服务之前
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

// 静态文件服务
const frontendPath = path.join(__dirname, 'frontend', 'dist');
console.log('Frontend path:', frontendPath);
console.log('Frontend exists:', fs.existsSync(frontendPath));

app.use(express.static(frontendPath));

// 所有其他路由都返回前端应用
app.use((req, res) => {
  const indexPath = path.join(frontendPath, 'index.html');
  console.log('Serving index.html:', indexPath);
  console.log('Index.html exists:', fs.existsSync(indexPath));
  
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('Error serving index.html:', err);
      res.status(500).json({ error: 'Failed to load page' });
    }
  });
});

// 启动服务器
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log('API endpoints:');
  console.log('  POST /api/runPayroll - Run payroll process');
  console.log('  GET /api/health - Health check');
});

module.exports = app;