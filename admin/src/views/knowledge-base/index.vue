<route lang="yaml">
meta:
  title: 知识库管理
</route>

<script lang="ts" setup>
  import ApiKnowledgeBase from '@/api/modules/knowledgeBase';
  import { utcToShanghaiTime } from '@/utils/utcFormatTime';
  import type { FormInstance, FormRules } from 'element-plus';
  import { ElMessage, ElMessageBox } from 'element-plus';
  import { onMounted, reactive, ref } from 'vue';
  import { useRouter } from 'vue-router';

  const router = useRouter();
  const formRef = ref<FormInstance>();
  const total = ref(0);
  const loading = ref(false);
  const dialogVisible = ref(false);
  const dialogTitle = ref('新增知识库');
  const isEdit = ref(false);
  const editingId = ref(0);

  const searchForm = reactive({
    name: '',
    page: 1,
    size: 15,
  });

  const dialogForm = reactive({
    name: '',
    description: '',
    chunkMaxSize: 800,
    chunkOverlapSize: 200,
    chunkMinSize: 100,
    isPublic: false,
    isActive: true,
  });

  const rules = reactive<FormRules>({
    name: [{ required: true, message: '请输入知识库名称', trigger: 'blur' }],
    chunkMaxSize: [{ required: true, message: '请输入最大分块大小', trigger: 'blur' }],
    chunkOverlapSize: [{ required: true, message: '请输入分块重叠大小', trigger: 'blur' }],
    chunkMinSize: [{ required: true, message: '请输入最小分块大小', trigger: 'blur' }],
  });

  interface KnowledgeBaseItem {
    id: number;
    name: string;
    description: string;
    userId: number;
    fileCount: number;
    chunkCount: number;
    isPublic: boolean;
    isActive: boolean;
    createdAt: string;
  }

  const tableData = ref<KnowledgeBaseItem[]>([]);

  async function queryList() {
    try {
      loading.value = true;
      const res = await ApiKnowledgeBase.queryList(searchForm);
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
    searchForm.name = '';
    searchForm.page = 1;
    queryList();
  }

  function handleAdd() {
    isEdit.value = false;
    dialogTitle.value = '新增知识库';
    resetDialogForm();
    dialogVisible.value = true;
  }

  function handleEdit(row: KnowledgeBaseItem) {
    isEdit.value = true;
    editingId.value = row.id;
    dialogTitle.value = '编辑知识库';
    dialogForm.name = row.name;
    dialogForm.description = row.description || '';
    dialogForm.isPublic = row.isPublic;
    dialogForm.isActive = row.isActive;
    dialogVisible.value = true;
  }

  function resetDialogForm() {
    dialogForm.name = '';
    dialogForm.description = '';
    dialogForm.chunkMaxSize = 800;
    dialogForm.chunkOverlapSize = 200;
    dialogForm.chunkMinSize = 100;
    dialogForm.isPublic = false;
    dialogForm.isActive = true;
  }

  function handleCloseDialog() {
    formRef.value?.resetFields();
    resetDialogForm();
  }

  async function handleSubmit() {
    formRef.value?.validate(async (valid) => {
      if (!valid) return;
      try {
        if (isEdit.value) {
          await ApiKnowledgeBase.update(editingId.value, {
            name: dialogForm.name,
            description: dialogForm.description,
            isPublic: dialogForm.isPublic,
            isActive: dialogForm.isActive,
          });
          ElMessage.success('更新知识库成功');
        } else {
          await ApiKnowledgeBase.create({
            name: dialogForm.name,
            description: dialogForm.description,
            chunkMaxSize: dialogForm.chunkMaxSize,
            chunkOverlapSize: dialogForm.chunkOverlapSize,
            chunkMinSize: dialogForm.chunkMinSize,
            isPublic: dialogForm.isPublic,
          });
          ElMessage.success('创建知识库成功');
        }
        dialogVisible.value = false;
        queryList();
      } catch (error) {
        ElMessage.error(isEdit.value ? '更新知识库失败' : '创建知识库失败');
      }
    });
  }

  async function handleDelete(row: KnowledgeBaseItem) {
    try {
      await ElMessageBox.confirm(
        `确认删除知识库「${row.name}」吗？删除后将无法恢复。`,
        '删除确认',
        {
          confirmButtonText: '确认删除',
          cancelButtonText: '取消',
          type: 'warning',
        },
      );
      await ApiKnowledgeBase.delete(row.id);
      ElMessage.success('删除知识库成功');
      queryList();
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error('删除知识库失败');
      }
    }
  }

  function handleViewDetail(row: KnowledgeBaseItem) {
    router.push({ name: 'knowledgeBaseDetail', params: { id: row.id } });
  }

  onMounted(() => queryList());
</script>

<template>
  <div>
    <PageHeader>
      <template #title>
        <div class="flex items-center gap-4">知识库管理</div>
      </template>
    </PageHeader>
    <page-main>
      <el-form ref="formRef" :inline="true" :model="searchForm" class="mb-4">
        <el-form-item label="知识库名称" prop="name">
          <el-input v-model="searchForm.name" placeholder="按名称搜索" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
          <el-button type="success" @click="handleAdd">新增知识库</el-button>
        </el-form-item>
      </el-form>

      <el-table
        v-loading="loading"
        border
        :data="tableData"
        style="width: 100%"
        size="default"
        class="mt-4"
      >
        <el-table-column prop="id" label="ID" width="80" align="center" />
        <el-table-column
          prop="name"
          label="名称"
          min-width="180"
          align="left"
          show-overflow-tooltip
        />
        <el-table-column
          prop="description"
          label="描述"
          min-width="200"
          align="left"
          show-overflow-tooltip
        >
          <template #default="scope">
            {{ scope.row.description || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="userId" label="用户ID" width="100" align="center" />
        <el-table-column prop="fileCount" label="文件数" width="100" align="center" />
        <el-table-column prop="chunkCount" label="分块数" width="100" align="center" />
        <el-table-column prop="isPublic" label="是否公开" width="100" align="center">
          <template #default="scope">
            <el-tag :type="scope.row.isPublic ? 'success' : 'info'">
              {{ scope.row.isPublic ? '公开' : '私有' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="isActive" label="状态" width="100" align="center">
          <template #default="scope">
            <el-tag :type="scope.row.isActive ? 'success' : 'danger'">
              {{ scope.row.isActive ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="200" align="center">
          <template #default="scope">
            {{ utcToShanghaiTime(scope.row.createdAt, 'YYYY-MM-DD hh:mm:ss') }}
          </template>
        </el-table-column>
        <el-table-column fixed="right" label="操作" min-width="260" align="center">
          <template #default="scope">
            <div class="action-buttons-wrapper">
              <el-button class="action-btn action-btn-primary" @click="handleViewDetail(scope.row)">
                查看详情
              </el-button>
              <el-button class="action-btn action-btn-primary" @click="handleEdit(scope.row)">
                编辑
              </el-button>
              <el-button class="action-btn action-btn-danger" @click="handleDelete(scope.row)">
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <el-row class="mt-5 flex justify-end">
        <el-pagination
          v-model:current-page="searchForm.page"
          v-model:page-size="searchForm.size"
          class="mr-5"
          :page-sizes="[15, 30, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @size-change="queryList"
          @current-change="queryList"
        />
      </el-row>
    </page-main>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="520px"
      @close="handleCloseDialog"
    >
      <el-form ref="formRef" :model="dialogForm" :rules="rules" label-width="120px">
        <el-form-item label="知识库名称" prop="name">
          <el-input v-model="dialogForm.name" placeholder="请输入知识库名称" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="dialogForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入知识库描述"
          />
        </el-form-item>
        <template v-if="!isEdit">
          <el-form-item label="最大分块大小" prop="chunkMaxSize">
            <el-input-number
              v-model="dialogForm.chunkMaxSize"
              :min="100"
              :max="10000"
              :step="100"
            />
          </el-form-item>
          <el-form-item label="分块重叠大小" prop="chunkOverlapSize">
            <el-input-number
              v-model="dialogForm.chunkOverlapSize"
              :min="0"
              :max="5000"
              :step="50"
            />
          </el-form-item>
          <el-form-item label="最小分块大小" prop="chunkMinSize">
            <el-input-number v-model="dialogForm.chunkMinSize" :min="10" :max="5000" :step="50" />
          </el-form-item>
        </template>
        <el-form-item label="是否公开" prop="isPublic">
          <el-switch v-model="dialogForm.isPublic" />
        </el-form-item>
        <template v-if="isEdit">
          <el-form-item label="是否启用" prop="isActive">
            <el-switch v-model="dialogForm.isActive" />
          </el-form-item>
        </template>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
  .action-buttons-wrapper {
    display: flex;
    gap: 8px;
    justify-content: center;
    align-items: center;
    flex-wrap: nowrap;
    white-space: nowrap;
  }

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

  .el-table .el-table__cell {
    padding: 12px 0;
  }
</style>
