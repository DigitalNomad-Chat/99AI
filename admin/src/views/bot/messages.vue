<script setup lang="ts">
  import { ref, onMounted } from 'vue';
  import { ElMessage } from 'element-plus';
  import { getBotMessages, getBotInstances } from '@/api/modules/bot';

  const loading = ref(false);
  const tableData = ref([]);
  const botInstances = ref<any[]>([]);
  const selectedBotId = ref<number | undefined>(undefined);
  const pagination = ref({ page: 1, size: 20, total: 0 });

  async function loadBots() {
    const res: any = await getBotInstances();
    botInstances.value = res.data || res || [];
    if (botInstances.value.length > 0) {
      selectedBotId.value = botInstances.value[0].id;
      loadMessages();
    }
  }

  async function loadMessages() {
    if (!selectedBotId.value) return;
    loading.value = true;
    try {
      const res: any = await getBotMessages(selectedBotId.value, {
        page: pagination.value.page,
        size: pagination.value.size,
      });
      const data = res.data || res;
      tableData.value = data.rows || [];
      pagination.value.total = data.count || 0;
    } catch (error: any) {
      ElMessage.error(error.message || '加载失败');
    } finally {
      loading.value = false;
    }
  }

  function handlePageChange(page: number) {
    pagination.value.page = page;
    loadMessages();
  }

  onMounted(loadBots);
</script>

<template>
  <div class="p-4">
    <el-card>
      <template #header>
        <div class="flex justify-between items-center">
          <span>Bot 消息记录</span>
          <el-select
            v-model="selectedBotId"
            placeholder="选择 Bot"
            style="width: 200px"
            @change="loadMessages"
          >
            <el-option
              v-for="bot in botInstances"
              :key="bot.id"
              :label="bot.name"
              :value="bot.id"
            />
          </el-select>
        </div>
      </template>
      <el-table v-loading="loading" :data="tableData" border>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="platformMsgId" label="平台消息ID" />
        <el-table-column prop="platformUserId" label="平台用户ID" />
        <el-table-column prop="direction" label="方向" width="80">
          <template #default="{ row }">
            <el-tag :type="row.direction === 'in' ? 'primary' : 'success'">
              {{ row.direction === 'in' ? '接收' : '发送' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="msgType" label="类型" width="80" />
        <el-table-column prop="content" label="内容" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="时间" width="180" />
      </el-table>
      <div class="mt-4 flex justify-end">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.size"
          :total="pagination.total"
          layout="total, prev, pager, next"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>
  </div>
</template>
