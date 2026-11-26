import type { RouteRecordRaw } from 'vue-router';
const routes: RouteRecordRaw[] = [
  {
    name: 'Profile',
    path: '/profile',
    component: () => import('#/views/_core/profile/index.vue'),
    meta: { title: '账户设置', icon: 'lucide:user', hideInMenu: true },
  },
  {
    name: 'LegacyDashboard',
    path: '/dashboard/:section?',
    redirect: '/design-statistics',
    meta: { title: '设计运营概览', hideInMenu: true, hideInTab: true },
  },
];
export default routes;
