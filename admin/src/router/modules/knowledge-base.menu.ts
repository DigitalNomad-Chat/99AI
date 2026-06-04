import type { RouteRecordRaw } from 'vue-router';

function Layout() {
  return import('@/layouts/index.vue');
}

const routes: RouteRecordRaw = {
  path: '/knowledge-base',
  component: Layout,
  redirect: '/knowledge-base/index',
  name: 'knowledgeBaseMenu',
  meta: {
    title: '知识库管理',
    icon: 'majesticons:book-line',
  },
  children: [
    {
      path: 'index',
      name: 'knowledgeBaseList',
      component: () => import('@/views/knowledge-base/index.vue'),
      meta: {
        title: '知识库列表',
        icon: 'fa6-solid:list-ul',
      },
    },
    {
      path: 'detail/:id',
      name: 'knowledgeBaseDetail',
      component: () => import('@/views/knowledge-base/detail.vue'),
      meta: {
        title: '知识库详情',
        icon: 'material-symbols-light:folder-open-outline',
        hidden: true,
        activeMenu: '/knowledge-base/index',
      },
    },
  ],
};

export default routes;
