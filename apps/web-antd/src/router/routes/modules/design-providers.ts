import type { RouteRecordRaw } from 'vue-router';
const routes: RouteRecordRaw[] = [
  {
    name: 'DesignRenderers',
    path: '/design-renderers',
    component: () => import('#/views/design/providers/renderer.vue'),
    meta: { title: '批量导出服务', icon: 'lucide:server', order: 10 },
  },
  {
    name: 'DesignProviders',
    path: '/design-providers',
    component: () => import('#/views/design/providers/index.vue'),
    meta: { title: 'AI 服务配置', icon: 'lucide:sparkles', order: 4 },
  },
];
export default routes;
