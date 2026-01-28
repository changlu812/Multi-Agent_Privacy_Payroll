# Multi-Agent Payment System

基于Kite AI支付的多Agent工资结算系统

## 项目简介

本项目是一个基于Kite AI支付的多Agent工资结算系统，使用Express.js作为后端，Vue 3作为前端，实现了自动化的工资结算流程。

## 技术栈

- **后端**：Node.js, Express.js
- **前端**：Vue 3, Vite
- **部署**：Vercel

## 快速开始

### 本地开发

1. **安装依赖**

```bash
# 安装后端依赖
npm install

# 安装前端依赖
cd frontend
npm install
```

2. **启动开发服务器**

```bash
# 启动后端服务器
npm run dev

# 在另一个终端启动前端开发服务器
cd frontend
npm run dev
```

3. **访问应用**

- 后端API: http://localhost:3000
- 前端应用: http://localhost:5173

### 部署到Vercel

1. **准备工作**

- 确保您有Vercel账号（访问 [vercel.com](https://vercel.com) 注册）
- 安装Vercel CLI（可选）：`npm install -g vercel`

2. **部署方式一：使用Vercel CLI**

```bash
# 在项目根目录执行
vercel login
vercel
```

按照提示完成部署配置，选择默认配置即可。

3. **部署方式二：使用Vercel网站**

- 访问 [vercel.com](https://vercel.com) 登录
- 点击 "Add New Project"
- 选择 "Import Git Repository"
- 连接您的Git仓库
- 选择项目并点击 "Import"
- 配置构建命令和输出目录（Vercel会自动检测）
- 点击 "Deploy"

## API接口

- **POST /api/runPayroll** - 运行工资结算流程
- **GET /api/health** - 健康检查

## 项目结构

```
multi-agent-payment/
├── frontend/           # 前端代码
│   ├── dist/           # 构建输出目录
│   ├── public/         # 静态资源
│   ├── src/            # 源代码
│   ├── index.html      # 入口HTML
│   ├── package.json    # 前端依赖
│   └── vite.config.js  # Vite配置
├── src/                # 后端源代码
│   └── orchestrator.js # 调度器
├── server.js           # 后端服务器
├── package.json        # 后端依赖
├── vercel.json         # Vercel配置
└── README.md           # 项目说明
```

## 注意事项

- 部署到Vercel时，确保环境变量配置正确
- 前端构建会自动在部署过程中执行
- API接口会在Vercel部署后保持与本地开发相同的路径结构

## 故障排除

### 常见问题

1. **部署失败：No Output Directory named "dist" found**
   - 确保前端构建命令正确执行
   - 检查vercel.json配置是否正确

2. **API接口无法访问**
   - 检查server.js中的路由配置
   - 确保vercel.json中的路由规则正确

3. **前端页面无法加载**
   - 检查前端构建是否成功
   - 确保静态文件路径配置正确

## 许可证

MIT License
