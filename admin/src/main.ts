import '@/utils/system.copyright';

import FloatingVue from 'floating-vue';
import 'floating-vue/dist/style.css';

import 'vue-m-message/dist/style.css';

import 'overlayscrollbars/overlayscrollbars.css';

import App from './App.vue';
import router from './router';
import ui from './ui-provider';

// 自定义指令
import directive from '@/utils/directive';

// 加载 svg 图标
import 'virtual:svg-icons-register';

// 加载 iconify 图标
import { downloadAndInstall } from '@/iconify';
import icons from '@/iconify/index.json';

import 'virtual:uno.css';

// 全局样式
import '@/assets/styles/globals.scss';

// Element Plus 主题覆盖 - 蓝色系品牌风格
import '@/assets/styles/element-plus.scss';

// 布局组件样式优化
import '@/assets/styles/layout.scss';

// 数据表格和表单组件优化
import '@/assets/styles/data-components.scss';

// 数据看板和统计组件优化
import '@/assets/styles/dashboard.scss';

import pinia from './store';

const app = createApp(App);
app.use(FloatingVue, {
  distance: 12,
});
// app.use(Message);
app.use(pinia);
app.use(router);
app.use(ui);
directive(app);
if (icons.isOfflineUse) {
  for (const info of icons.collections) {
    downloadAndInstall(info);
  }
}

app.mount('#app');
