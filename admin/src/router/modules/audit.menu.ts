import type { RouteRecordRaw } from 'vue-router';

const route: RouteRecordRaw = {
  path: '/audit',
  component: () => import('@/layouts/index.vue'),
  redirect: '/audit/list',
  name: 'Audit',
  meta: {
    title: '审计日志',
    icon: 'ep:document',
  },
  children: [
    {
      path: 'list',
      name: 'AuditList',
      component: () => import('@/views/audit/index.vue'),
      meta: {
        title: '审计日志',
        icon: 'ep:document',
        cache: true,
      },
    },
  ],
};

export default route;
