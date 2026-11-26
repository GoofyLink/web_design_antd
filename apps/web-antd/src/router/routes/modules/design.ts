import type { RouteRecordRaw } from 'vue-router';

import { IFrameView } from '#/layouts';

const routes: RouteRecordRaw[] = [
  {
    name: 'DesignApiDocs',
    path: '/design-api-docs',
    component: IFrameView,
    meta: {
      icon: 'lucide:book-open-text',
      iframeSrc:
        import.meta.env.VITE_DESIGN_DOCS_URL ||
        (import.meta.env.DEV ? 'http://127.0.0.1:8888/docs' : '/docs'),
      order: 90,
      title: '接口文档',
    },
  },
];

export default routes;
