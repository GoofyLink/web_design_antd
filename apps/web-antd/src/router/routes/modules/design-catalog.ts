import type { RouteRecordRaw } from 'vue-router';
const routes: RouteRecordRaw[] = [
  {
    name: 'DesignAssets',
    path: '/design-assets',
    component: () => import('#/views/design/assets/index.vue'),
    meta: { title: '公共素材与字体', icon: 'lucide:images', order: 7 },
  },
  {
    name: 'DesignCategories',
    path: '/design-categories',
    component: () => import('#/views/design/catalog/categories.vue'),
    meta: { title: '模板分类', icon: 'lucide:tags', order: 5 },
  },
  {
    name: 'DesignTemplates',
    path: '/design-templates',
    component: () => import('#/views/design/catalog/templates.vue'),
    meta: { title: '设计模板', icon: 'lucide:layout-template', order: 6 },
  },
];
export default routes;
