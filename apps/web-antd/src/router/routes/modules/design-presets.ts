import type { RouteRecordRaw } from 'vue-router';
const routes: RouteRecordRaw[] = [
  {
    name: 'DesignCanvasPresets',
    path: '/design-canvas-presets',
    component: () => import('#/views/design/presets/index.vue'),
    meta: { title: '画布推荐尺寸', icon: 'lucide:layout-template', order: 3 },
  },
];
export default routes;
