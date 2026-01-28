import { createRouter, createWebHistory } from "vue-router";
import Dashboard from "../views/Dashboard.vue";
import PayrollTask from "../views/PayrollTask.vue";
import ProcessVisualization from "../views/ProcessVisualization.vue";

const routes = [
  {
    path: "/",
    name: "Dashboard",
    component: Dashboard,
  },
  {
    path: "/payroll",
    name: "PayrollTask",
    component: PayrollTask,
  },
  {
    path: "/process",
    name: "ProcessVisualization",
    component: ProcessVisualization,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
