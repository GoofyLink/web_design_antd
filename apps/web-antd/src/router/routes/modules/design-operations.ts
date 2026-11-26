import type { RouteRecordRaw } from 'vue-router';
const routes: RouteRecordRaw[] = [
  {
    name: 'DesignJobs',
    path: '/design-jobs',
    component: () => import('#/views/design/operations/jobs.vue'),
    meta: { title: '任务管理', icon: 'lucide:list-checks', order: 11 },
  },
  {
    name: 'DesignTopics',
    path: '/design-topics',
    component: () => import('#/views/design/operations/topics.vue'),
    meta: { title: '专题运营', icon: 'lucide:panels-top-left', order: 8 },
  },
  {
    name: 'DesignStatistics',
    path: '/design-statistics',
    component: () => import('#/views/design/operations/statistics.vue'),
    meta: { title: '设计运营概览', icon: 'lucide:chart-column', order: 1 },
  },
  {
    name: 'DesignExports',
    path: '/design-exports',
    component: () => import('#/views/design/operations/exports.vue'),
    meta: { title: '导出记录', icon: 'lucide:download', order: 12 },
  },
  {
    name: 'DesignAudit',
    path: '/design-audit',
    component: () => import('#/views/design/operations/audit.vue'),
    meta: { title: '审计日志', icon: 'lucide:scroll-text', order: 13 },
  },
];
export default routes;
