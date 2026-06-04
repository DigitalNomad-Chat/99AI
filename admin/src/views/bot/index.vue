<script setup lang="ts">
  import { ref, onMounted } from 'vue';
  import { useRouter } from 'vue-router';
  import { ElMessage, ElMessageBox } from 'element-plus';
  import { getBotInstances, deleteBotInstance } from '@/api/modules/bot';

  const router = useRouter();
  const loading = ref(false);
  const tableData = ref([]);

  const platformMap: Record<string, string> = {
    wecom: '企业微信',
    feishu: '飞书',
    discord: 'Discord',
    qq: 'QQ',
  };

  const statusMap: Record<number, string> = {
    0: '禁用',
    1: '启用',
  };

  async function loadData() {
    loading.value = true;
    try {
      const res: any = await getBotInstances();
      tableData.value = res.data || res || [];
    } finally {
      loading.value = false;
    }
  }

  function handleAdd() {
    router.push({ name: 'BotEdit' });
  }

  function handleEdit(row: any) {
    router.push({ name: 'BotEdit', query: { id: row.id } });
  }

  async function handleDelete(row: any) {
    try {
      await ElMessageBox.confirm('确定删除该 Bot 实例吗？', '提示', { type: 'warning' });
      await deleteBotInstance(row.id);
      ElMessage.success('删除成功');
      loadData();
    } catch {
      // cancel
    }
  }

  onMounted(loadData);
</script>

<template>
  <div class="p-4">
    <el-card>
      <template #header>
        <div class="flex justify-between items-center">
          <span>Bot 实例管理</span>
          <el-button type="primary" @click="handleAdd">新增 Bot</el-button>
        </div>
      </template>
      <el-table v-loading="loading" :data="tableData" border>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="name" label="名称" />
        <el-table-column prop="platform" label="平台">
          <template #default="{ row }">
            {{ platformMap[row.platform] || row.platform }}
          </template>
        </el-table-column>
        <el-table-column prop="appId" label="AppID" />
        <el-table-column prop="model" label="模型" />
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">
              {{ statusMap[row.status] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>
