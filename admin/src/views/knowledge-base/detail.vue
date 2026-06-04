<route lang="yaml">
meta:
  title: 知识库详情
</route>

<script lang="ts" setup>
  import ApiKnowledgeBase from '@/api/modules/knowledgeBase';
  import api from '@/api/index';
  import { utcToShanghaiTime } from '@/utils/utcFormatTime';
  import { ElMessage } from 'element-plus';
  import { onMounted, reactive, ref } from 'vue';
  import { useRoute, useRouter } from 'vue-router';

  const route = useRoute();
  const router = useRouter();
  const kbId = Number(route.params.id);

  const loading = ref(false);
  const uploading = ref(false);

  /* ---- 知识库基本信息 ---- */
  const kbInfo = reactive({
    name: '',
    description: '',
    fileCount: 0,
    totalChunks: 0,
    status: '',
  });

  /* ---- 文件列表 ---- */
  const tableData = ref<any[]>([]);
  const pagination = reactive({ page: 1, size: 15, total: 0 });

  /* ---- 搜索测试 ---- */
  const searchQuery = ref('');
  const searching = ref(false);
  const searchResults = ref<any[]>([]);

  /* ---- 文件上传 ---- */
  const fileInput = ref<HTMLInputElement | null>(null);

  function triggerUpload() {
    fileInput.value?.click();
  }

  async function handleFileUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    try {
      uploading.value = true;
      const formData = new FormData();
      formData.append('file', file);
      await api.post(`knowledge-base/${kbId}/files/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      ElMessage.success('文件上传成功');
      queryFileList();
    } catch (error) {
      ElMessage.error('文件上传失败');
    } finally {
      uploading.value = false;
      // 重置 input 以允许再次选择同一文件
      if (fileInput.value) fileInput.value.value = '';
    }
  }

  /* ---- processingStatus 映射 ---- */
  const statusMap: Record<
    string,
    { label: string; type: 'success' | 'warning' | 'primary' | 'danger' }
  > = {
    pending: { label: '等待处理', type: 'warning' },
    processing: { label: '处理中', type: 'primary' },
    completed: { label: '已完成', type: 'success' },
    failed: { label: '失败', type: 'danger' },
  };

  function getStatusInfo(status: string) {
    return statusMap[status] || { label: status, type: 'info' as const };
  }

  /* ---- 文件大小格式化 ---- */
  function formatFileSize(bytes: number) {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /* ---- 获取知识库详情 ---- */
  async function queryDetail() {
    try {
      const res = await ApiKnowledgeBase.queryDetail(kbId);
      const data = res.data;
      kbInfo.name = data.name;
      kbInfo.description = data.description;
      kbInfo.fileCount = data.fileCount ?? 0;
      kbInfo.totalChunks = data.totalChunks ?? 0;
      kbInfo.status = data.status;
    } catch (error) {
      ElMessage.error('获取知识库信息失败');
    }
  }

  /* ---- 获取文件列表 ---- */
  async function queryFileList() {
    try {
      loading.value = true;
      const res = await ApiKnowledgeBase.queryFiles(kbId, {
        page: pagination.page,
        size: pagination.size,
      });
      const { rows, count } = res.data;
      tableData.value = rows;
      pagination.total = count;
      loading.value = false;
    } catch (error) {
      loading.value = false;
      ElMessage.error('获取文件列表失败');
    }
  }

  /* ---- 删除文件 ---- */
  async function handleDeleteFile(fileId: number) {
    try {
      await ApiKnowledgeBase.deleteFile(kbId, fileId);
      ElMessage.success('删除成功');
      queryFileList();
      queryDetail();
    } catch (error) {
      ElMessage.error('删除失败');
    }
  }

  /* ---- 重新处理文件 ---- */
  async function handleRetryFile(fileId: number) {
    try {
      await ApiKnowledgeBase.retryFile(kbId, fileId);
      ElMessage.success('已提交重新处理');
      queryFileList();
    } catch (error) {
      ElMessage.error('操作失败');
    }
  }

  /* ---- 搜索测试 ---- */
  async function handleSearch() {
    if (!searchQuery.value.trim()) {
      ElMessage.error('请输入搜索内容');
      return;
    }
    try {
      searching.value = true;
      const res = await ApiKnowledgeBase.search(kbId, {
        query: searchQuery.value,
        topK: 5,
      });
      searchResults.value = res.data || [];
      searching.value = false;
    } catch (error) {
      searching.value = false;
      ElMessage.error('搜索失败');
    }
  }

  /* ---- 返回列表 ---- */
  function goBack() {
    router.push({ name: 'knowledgeBaseList' });
  }

  /* ---- 分页 ---- */
  function handleSizeChange() {
    pagination.page = 1;
    queryFileList();
  }

  onMounted(() => {
    queryDetail();
    queryFileList();
  });
</script>

<template>
  <div>
    <PageHeader>
      <template #title>
        <div class="flex items-center gap-4">
          <el-button @click="goBack">返回列表</el-button>
          <span>知识库详情</span>
        </div>
      </template>
    </PageHeader>

    <page-main>
      <!-- 知识库基本信息 -->
      <el-card class="mb-4" shadow="never">
        <template #header>
          <div class="flex items-center justify-between">
            <span class="text-lg font-bold">{{ kbInfo.name || '加载中...' }}</span>
            <el-button type="primary" :loading="uploading" @click="triggerUpload">
              上传文件
            </el-button>
            <input ref="fileInput" type="file" hidden @change="handleFileUpload" />
          </div>
        </template>
        <el-descriptions :column="4" border>
          <el-descriptions-item label="知识库名称">
            {{ kbInfo.name || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="描述">
            {{ kbInfo.description || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="文件数">
            {{ kbInfo.fileCount }}
          </el-descriptions-item>
          <el-descriptions-item label="分块数">
            {{ kbInfo.totalChunks }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 文件列表 -->
      <el-table v-loading="loading" border :data="tableData" style="width: 100%" size="default">
        <el-table-column prop="id" label="ID" width="80" align="center" />
        <el-table-column prop="fileName" label="文件名" min-width="200" show-overflow-tooltip />
        <el-table-column
          prop="displayName"
          label="显示名称"
          min-width="180"
          show-overflow-tooltip
        />
        <el-table-column prop="fileSize" label="文件大小" width="120" align="center">
          <template #default="scope">
            {{ formatFileSize(scope.row.fileSize) }}
          </template>
        </el-table-column>
        <el-table-column prop="fileType" label="文件类型" width="120" align="center" />
        <el-table-column prop="processingStatus" label="处理状态" width="120" align="center">
          <template #default="scope">
            <el-tag :type="getStatusInfo(scope.row.processingStatus).type">
              {{ getStatusInfo(scope.row.processingStatus).label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="totalChunks" label="分块数" width="100" align="center" />
        <el-table-column prop="createdAt" label="创建时间" width="180" align="center">
          <template #default="scope">
            {{ utcToShanghaiTime(scope.row.createdAt, 'YYYY-MM-DD hh:mm:ss') }}
          </template>
        </el-table-column>
        <el-table-column fixed="right" label="操作" width="200" align="center">
          <template #default="scope">
            <div class="action-buttons-wrapper">
              <el-popconfirm
                title="确认删除此文件？"
                confirm-button-text="确认删除"
                @confirm="handleDeleteFile(scope.row.id)"
              >
                <template #reference>
                  <el-button class="action-btn action-btn-danger">删除</el-button>
                </template>
              </el-popconfirm>
              <el-button
                class="action-btn action-btn-primary"
                :disabled="scope.row.processingStatus === 'processing'"
                @click="handleRetryFile(scope.row.id)"
              >
                重新处理
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-row class="mt-5 flex justify-end">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.size"
          class="mr-5"
          :page-sizes="[15, 30, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="pagination.total"
          @size-change="handleSizeChange"
          @current-change="queryFileList"
        />
      </el-row>

      <!-- 搜索测试区域 -->
      <el-card class="mt-4" shadow="never">
        <template #header>
          <span class="text-lg font-bold">搜索测试</span>
        </template>
        <div class="flex items-center gap-2 mb-4">
          <el-input
            v-model="searchQuery"
            placeholder="输入搜索内容测试知识库检索效果"
            clearable
            style="max-width: 500px"
            @keyup.enter="handleSearch"
          />
          <el-button type="primary" :loading="searching" @click="handleSearch"> 搜索 </el-button>
        </div>

        <div v-if="searchResults.length > 0" class="search-results">
          <el-card v-for="(item, index) in searchResults" :key="index" class="mb-3" shadow="hover">
            <div class="mb-2">
              <el-tag size="small" type="info" class="mr-2">
                相似度: {{ (item.score * 100).toFixed(2) }}%
              </el-tag>
              <span v-if="item.fileName" class="text-gray-500 text-sm"
                >来源: {{ item.fileName }}</span
              >
            </div>
            <div class="text-sm leading-relaxed whitespace-pre-wrap">{{ item.content }}</div>
          </el-card>
        </div>
        <div v-else-if="searchQuery && !searching" class="text-gray-400 text-center py-4">
          暂无搜索结果
        </div>
      </el-card>
    </page-main>
  </div>
</template>

<style scoped>
  /* 操作按钮容器 - 确保按钮在一行显示 */
  .action-buttons-wrapper {
    display: flex;
    gap: 8px;
    justify-content: center;
    align-items: center;
    flex-wrap: nowrap;
    white-space: nowrap;
  }

  /* 操作按钮样式 */
  .action-btn {
    padding: 8px 16px;
    font-size: 14px;
    border: 1px solid transparent;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
    background: transparent;
    font-weight: 500;
    letter-spacing: 0.3px;
  }

  .action-btn-primary {
    color: #409eff;
    border-color: #d9ecff;
  }

  .action-btn-primary:hover {
    background: #ecf5ff;
    border-color: #409eff;
    color: #409eff;
  }

  .action-btn-primary:active {
    background: #d9ecff;
  }

  .action-btn-danger {
    color: #f56c6c;
    border-color: #fde2e2;
  }

  .action-btn-danger:hover {
    background: #fef0f0;
    border-color: #f56c6c;
    color: #f56c6c;
  }

  .action-btn-danger:active {
    background: #fde2e2;
  }
</style>
