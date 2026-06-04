import type { RouteRecordRaw } from 'vue-router';

function Layout() {
  return import('@/layouts/index.vue');
}

const routes: RouteRecordRaw = {
  path: '/skills',
  component: Layout,
  redirect: '/skills/index',
  name: 'skillsMenu',
  meta: {
    title: '技能管理',
    icon: 'majesticons:lightbulb-line',
  },
  children: [
    {
      path: 'index',
      name: 'skillsList',
      component: () => import('@/views/skills/index.vue'),
      meta: {
        title: '技能列表',
        icon: 'fa6-solid:list-ul',
      },
    },
    {
      path: 'category',
      name: 'skillsCategory',
      component: () => import('@/views/skills/category.vue'),
      meta: {
        title: '技能分类',
        icon: 'material-symbols-light:category-outline',
      },
    },
    {
      path: 'execution',
      name: 'skillsExecution',
      component: () => import('@/views/skills/execution.vue'),
      meta: {
        title: '执行记录',
        icon: 'material-symbols-light:history',
      },
    },
  ],
};

export default routes;
