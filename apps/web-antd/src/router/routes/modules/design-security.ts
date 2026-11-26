import type { RouteRecordRaw } from 'vue-router';
const routes: RouteRecordRaw[] = [
  {
    name: 'DesignAdmins',
    path: '/design-admins',
    component: () => import('#/views/design/security/admins.vue'),
    meta: { title: '管理员账号', icon: 'lucide:user-cog', order: 15 },
  },
  {
    name: 'DesignRoles',
    path: '/design-roles',
    component: () => import('#/views/design/security/roles.vue'),
    meta: { title: '角色与权限', icon: 'lucide:shield-check', order: 16 },
  },
];
export default routes;
