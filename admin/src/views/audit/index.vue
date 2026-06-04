<route lang="yaml">
meta:
  title: 审计日志
</route>

<script lang="ts" setup>
  import ApiAudit from '@/api/modules/audit';
  import { utcToShanghaiTime } from '@/utils/utcFormatTime';
  import { ElMessage, ElMessageBox } from 'element-plus';
  import { onMounted, reactive, ref } from 'vue';

  const total = ref(0);
  const loading = ref(false);

  const searchForm = reactive({
    module: '',
    action: '',
    userId: '',
    startTime: '',
    endTime: '',
    page: 1,
    size: 15,
  });

  interface AuditItem {
    id: number;
    userId: number;
    action: string;
    module: string;
    method: string;
    path: string;
    requestParams: string;
    statusCode: number;
    ip: string;
    userAgent: string;
    duration: number;
    description: string;
    createdAt: string;
  }

  const tableData = ref<AuditItem[]>([]);

  const moduleOptions = [
    '认证',
    '用户',
    '对话',
    '对话组',
    '应用',
    '技能',
    '知识库',
    '订单',
    '支付',
    '卡密',
    '上传',
    '模型',
    '分享',
    '公众号',
    '签到',
    '配置',
    '敏感词',
    '自动回复',
    '验证码',
    '统计',
    '任务',
    'OpenAI API',
    'API Key',
    'Bot 网关',
    '语音',
    '审计日志',
    '其他',
  ];

  const actionOptions = [
    { label: '查询', value: 'query' },
    { label: '创建', value: 'create' },
    { label: '更新', value: 'update' },
    { label: '删除', value: 'delete' },
    { label: '执行', value: 'execute' },
    { label: '登录', value: 'login' },
    { label: '登出', value: 'logout' },
    { label: '未知', value: 'unknown' },
  ];

  type TagType = 'success' | 'warning' | 'danger' | 'info';
  const statusTypeMap: Record<number, TagType> = {
    200: 'success',
    201: 'success',
    400: 'warning',
    401: 'danger',
    403: 'danger',
    404: 'warning',
    500: 'danger',
  };

  async function queryList() {
    try {
      loading.value = true;
      const res = await ApiAudit.queryList(searchForm);
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
    searchForm.module = '';
    searchForm.action = '';
    searchForm.userId = '';
    searchForm.startTime = '';
    searchForm.endTime = '';
    searchForm.page = 1;
    queryList();
  }

  async function handleCleanup() {
    try {
      await ElMessageBox.confirm('确定要清理 90 天前的审计日志吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      });
      const res = await ApiAudit.cleanup({ days: 90 });
      ElMessage.success(res.data?.message || '清理完成');
      queryList();
    } catch (error) {
      // 用户取消
    }
  }

  onMounted(() => queryList());
</script>

<template>
  <div>
    <PageHeader>
      <template #title>
        <div class="flex items-center gap-4">审计日志</div>
      </template>
    </PageHeader>
    <page-main>
      <el-form :inline="true" :model="searchForm" class="mb-4">
        <el-form-item label="模块">
          <el-select
            v-model="searchForm.module"
            placeholder="选择模块"
            clearable
            style="width: 160px"
          >
            <el-option v-for="m in moduleOptions" :key="m" :label="m" :value="m" />
          </el-select>
        </el-form-item>
        <el-form-item label="操作类型">
          <el-select
            v-model="searchForm.action"
            placeholder="选择操作"
            clearable
            style="width: 120px"
          >
            <el-option
              v-for="a in actionOptions"
              :key="a.value"
              :label="a.label"
              :value="a.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="用户ID">
          <el-input
            v-model="searchForm.userId"
            placeholder="用户ID"
            clearable
            style="width: 100px"
          />
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="searchForm.startTime"
            type="datetime"
            placeholder="开始时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 180px"
          />
          <span class="mx-2">至</span>
          <el-date-picker
            v-model="searchForm.endTime"
            type="datetime"
            placeholder="结束时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 180px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
          <el-button type="danger" @click="handleCleanup">清理过期日志</el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="loading" border :data="tableData" style="width: 100%">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="userId" label="用户ID" width="80" />
        <el-table-column prop="module" label="模块" width="100" />
        <el-table-column prop="action" label="操作" width="90">
          <template #default="{ row }">
            <el-tag
              :type="
                row.action === 'delete' ? 'danger' : row.action === 'create' ? 'success' : 'info'
              "
              size="small"
            >
              {{ actionOptions.find((a) => a.value === row.action)?.label || row.action }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="method" label="方法" width="70">
          <template #default="{ row }">
            <el-tag
              :type="
                row.method === 'GET'
                  ? 'info'
                  : row.method === 'POST'
                    ? 'success'
                    : row.method === 'DELETE'
                      ? 'danger'
                      : 'warning'
              "
              size="small"
            >
              {{ row.method }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="path" label="路径" min-width="180" show-overflow-tooltip />
        <el-table-column prop="statusCode" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="statusTypeMap[row.statusCode] || 'info'" size="small">
              {{ row.statusCode }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="ip" label="IP" width="130" />
        <el-table-column prop="duration" label="耗时(ms)" width="90" />
        <el-table-column prop="createdAt" label="时间" width="160">
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
