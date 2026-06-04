<route lang="yaml">
meta:
  title: 技能执行记录
</route>

<script lang="ts" setup>
  import ApiSkills from '@/api/modules/skills';
  import { utcToShanghaiTime } from '@/utils/utcFormatTime';
  import { ElMessage } from 'element-plus';
  import { onMounted, reactive, ref } from 'vue';

  const total = ref(0);
  const loading = ref(false);

  const searchForm = reactive({
    skillId: '',
    status: '',
    page: 1,
    size: 15,
  });

  interface ExecutionItem {
    id: number;
    skillId: number;
    skillName: string;
    skillCoverImg: string;
    userId: number;
    status: string;
    inputParams: string;
    outputResult: string;
    errorMessage: string;
    executionTime: number;
    tokenUsage: number;
    createdAt: string;
  }

  const tableData = ref<ExecutionItem[]>([]);

  async function queryList() {
    try {
      loading.value = true;
      const res = await ApiSkills.queryExecutions(searchForm);
      const { rows, count } = res.data;
      total.value = count;
      tableData.value = rows;
      loading.value = false;
    } catch (error) {
      loading.value = false;
    }
  }

  function handleSearch() {
    searchForm.page = 1;
    queryList();
  }

  function handleReset() {
    searchForm.skillId = '';
    searchForm.status = '';
    searchForm.page = 1;
    queryList();
  }

  type TagType = 'info' | 'warning' | 'success' | 'danger';
  const statusMap: Record<string, { text: string; type: TagType }> = {
    pending: { text: '待执行', type: 'info' },
    running: { text: '执行中', type: 'warning' },
    completed: { text: '已完成', type: 'success' },
    failed: { text: '失败', type: 'danger' },
    cancelled: { text: '已取消', type: 'info' },
  };

  onMounted(() => queryList());
</script>

<template>
  <div>
    <PageHeader>
      <template #title>
        <div class="flex items-center gap-4">技能执行记录</div>
      </template>
    </PageHeader>
    <page-main>
      <el-form :inline="true" :model="searchForm" class="mb-4">
        <el-form-item label="技能ID" prop="skillId">
          <el-input v-model="searchForm.skillId" placeholder="按技能ID搜索" clearable />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="选择状态" clearable>
            <el-option label="待执行" value="pending" />
            <el-option label="执行中" value="running" />
            <el-option label="已完成" value="completed" />
            <el-option label="失败" value="failed" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="loading" border :data="tableData" style="width: 100%">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="skillName" label="技能名称" min-width="150" />
        <el-table-column prop="userId" label="用户ID" width="80" />
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="statusMap[row.status]?.type || 'info'">
              {{ statusMap[row.status]?.text || row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="inputParams" label="输入参数" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="text-xs text-gray-500">{{ row.inputParams }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="outputResult" label="输出结果" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="text-xs">{{ row.outputResult?.substring(0, 100) }}...</span>
          </template>
        </el-table-column>
        <el-table-column prop="executionTime" label="耗时(ms)" width="90" />
        <el-table-column prop="tokenUsage" label="Token" width="80" />
        <el-table-column prop="createdAt" label="执行时间" width="160">
          <template #default="{ row }">
            {{ utcToShanghaiTime(row.createdAt) }}
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="searchForm.page"
        v-model:page-size="searchForm.size"
        :total="total"
        layout="total, sizes, prev, pager, next"
        class="mt-4 justify-end"
        @change="queryList"
      />
    </page-main>
  </div>
</template>
