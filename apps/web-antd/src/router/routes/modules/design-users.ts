import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [{
  name: 'DesignUsers', path: '/design-users',
  component: () => import('#/views/design/users/index.vue'),
  meta: { title: '前台用户', icon: 'lucide:users', order: 2 },
}];
export default routes;
