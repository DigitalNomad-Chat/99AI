import type { RouteRecordRaw } from 'vue-router';

const route: RouteRecordRaw = {
  path: '/bot',
  component: () => import('@/layouts/index.vue'),
  redirect: '/bot/list',
  name: 'Bot',
  meta: {
    title: 'Bot 管理',
    icon: 'ep:chat-dot-round',
  },
  children: [
    {
      path: 'list',
      name: 'BotList',
      component: () => import('@/views/bot/index.vue'),
      meta: {
        title: 'Bot 实例',
        icon: 'ep:bot',
        cache: true,
      },
    },
    {
      path: 'edit',
      name: 'BotEdit',
      component: () => import('@/views/bot/edit.vue'),
      meta: {
        title: '编辑 Bot',
        hidden: true,
      },
    },
    {
      path: 'messages',
      name: 'BotMessages',
      component: () => import('@/views/bot/messages.vue'),
      meta: {
        title: '消息记录',
        icon: 'ep:message',
        cache: true,
      },
    },
  ],
};

export default route;
