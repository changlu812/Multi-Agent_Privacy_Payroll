<template>
  <div class="app">
    <!-- 导航栏 -->
    <nav class="navbar">
      <div class="navbar-brand">
        <h1>Kite Payroll System</h1>
      </div>
      <div class="navbar-menu">
        <router-link to="/" class="nav-link">系统状态</router-link>
        <router-link to="/payroll" class="nav-link">发薪任务</router-link>
        <router-link to="/process" class="nav-link">流程可视化</router-link>
      </div>
    </nav>

    <!-- 主内容区 -->
    <main class="main-content">
      <router-view />
    </main>

    <!-- 页脚 -->
    <footer class="footer">
      <p>© 2026 Kite Payroll System | Powered by Vue 3</p>
    </footer>
  </div>
</template>

<style>
/* 全局样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 16px;
  line-height: 1.5;
  color: #333;
  background: #f5f5f5;
}

/* 应用容器 */
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 导航栏 */
.navbar {
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.navbar-brand h1 {
  font-size: 20px;
  font-weight: 600;
  color: #1890ff;
}

.navbar-menu {
  display: flex;
  gap: 20px;
}

.nav-link {
  text-decoration: none;
  color: #666;
  font-size: 14px;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 4px;
  transition: all 0.3s;
}

.nav-link:hover {
  color: #1890ff;
  background: #e6f7ff;
}

.nav-link.router-link-active {
  color: #1890ff;
  background: #e6f7ff;
  font-weight: 600;
}

/* 主内容区 */
.main-content {
  flex: 1;
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.main-content h1 {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin-bottom: 30px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ddd;
}

/* 页脚 */
.footer {
  background: #fff;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
  text-align: center;
  font-size: 14px;
  color: #666;
  margin-top: auto;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .navbar {
    flex-direction: column;
    height: auto;
    padding: 10px 20px;
  }

  .navbar-brand {
    margin-bottom: 10px;
  }

  .navbar-menu {
    width: 100%;
    justify-content: space-around;
  }

  .main-content {
    padding: 10px;
  }
}
</style>
