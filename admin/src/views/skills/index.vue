<route lang="yaml">
meta:
  title: 技能管理
</route>

<script lang="ts" setup>
  import ApiSkills from '@/api/modules/skills';
  import type { FormInstance, FormRules } from 'element-plus';
  import { ElMessage, ElMessageBox } from 'element-plus';
  import { onMounted, reactive, ref } from 'vue';

  const formRef = ref<FormInstance>();
  const total = ref(0);
  const loading = ref(false);
  const dialogVisible = ref(false);
  const dialogTitle = ref('新增技能');
  const isEdit = ref(false);
  const editingId = ref(0);
  const categoryList = ref<any[]>([]);

  const searchForm = reactive({
    name: '',
    type: '',
    status: '',
    page: 1,
    size: 15,
  });

  const dialogForm = reactive({
    name: '',
    description: '',
    catId: '',
    type: 'prompt',
    tags: '',
    systemPrompt: '',
    inputSchema: '',
    outputSchema: '',
    executionConfig: '',
    modelKey: '',
    status: 1,
    order: 100,
    isPublic: true,
  });

  const rules = reactive<FormRules>({
    name: [{ required: true, message: '请输入技能名称', trigger: 'blur' }],
    catId: [{ required: true, message: '请选择分类', trigger: 'change' }],
  });

  interface SkillItem {
    id: number;
    name: string;
    description: string;
    type: string;
    tags: string;
    catId: string;
    catName: string;
    status: number;
    isBuiltIn: number;
    isPublic: boolean;
    useCount: number;
    order: number;
    createdAt: string;
  }

  const tableData = ref<SkillItem[]>([]);

  async function queryList() {
    try {
      loading.value = true;
      const res = await ApiSkills.querySkills(searchForm);
      const { rows, count } = res.data;
      total.value = count;
      tableData.value = rows;
      loading.value = false;
    } catch (error) {
      loading.value = false;
    }
  }

  async function queryCategories() {
    try {
      const res = await ApiSkills.queryCategories({ page: 1, size: 100 });
      categoryList.value = res.data?.rows || [];
    } catch (error) {
      categoryList.value = [];
    }
  }

  function handleSearch() {
    searchForm.page = 1;
    queryList();
  }

  function handleReset() {
    searchForm.name = '';
    searchForm.type = '';
    searchForm.status = '';
    searchForm.page = 1;
    queryList();
  }

  function handleAdd() {
    isEdit.value = false;
    dialogTitle.value = '新增技能';
    resetDialogForm();
    dialogVisible.value = true;
  }

  function handleEdit(row: SkillItem) {
    isEdit.value = true;
    editingId.value = row.id;
    dialogTitle.value = '编辑技能';
    dialogForm.name = row.name;
    dialogForm.description = row.description || '';
    dialogForm.catId = row.catId;
    dialogForm.type = row.type;
    dialogForm.tags = row.tags || '';
    dialogForm.status = row.status;
    dialogForm.order = row.order;
    dialogForm.isPublic = row.isPublic;
    dialogVisible.value = true;
  }

  function resetDialogForm() {
    dialogForm.name = '';
    dialogForm.description = '';
    dialogForm.catId = '';
    dialogForm.type = 'prompt';
    dialogForm.tags = '';
    dialogForm.systemPrompt = '';
    dialogForm.inputSchema = '';
    dialogForm.outputSchema = '';
    dialogForm.executionConfig = '';
    dialogForm.modelKey = '';
    dialogForm.status = 1;
    dialogForm.order = 100;
    dialogForm.isPublic = true;
  }

  function handleCloseDialog() {
    formRef.value?.resetFields();
    resetDialogForm();
  }

  async function handleSubmit() {
    formRef.value?.validate(async (valid) => {
      if (!valid) return;
      try {
        const data = { ...dialogForm };
        if (isEdit.value) {
          await ApiSkills.updateSkill({ id: editingId.value, ...data });
          ElMessage.success('更新技能成功');
        } else {
          await ApiSkills.createSkill(data);
          ElMessage.success('创建技能成功');
        }
        dialogVisible.value = false;
        queryList();
      } catch (error) {
        ElMessage.error(isEdit.value ? '更新技能失败' : '创建技能失败');
      }
    });
  }

  async function handleDelete(row: SkillItem) {
    try {
      await ElMessageBox.confirm(`确认删除技能「${row.name}」吗？删除后将无法恢复。`, '删除确认', {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning',
      });
      await ApiSkills.deleteSkill({ id: row.id });
      ElMessage.success('删除技能成功');
      queryList();
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error('删除技能失败');
      }
    }
  }

  async function handleInitBuiltIn() {
    try {
      await ElMessageBox.confirm('初始化内置技能会更新所有内置技能定义，是否继续？', '初始化确认', {
        confirmButtonText: '确认初始化',
        cancelButtonText: '取消',
        type: 'info',
      });
      await ApiSkills.initBuiltIn();
      ElMessage.success('内置技能初始化成功');
      queryList();
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error('初始化失败');
      }
    }
  }

  const typeMap: Record<string, string> = {
    prompt: '预设Prompt',
    agent: 'Agent技能',
    workflow: '工作流',
    code: '代码执行',
  };

  onMounted(() => {
    queryList();
    queryCategories();
  });
</script>

<template>
  <div>
    <PageHeader>
      <template #title>
        <div class="flex items-center gap-4">技能管理</div>
      </template>
    </PageHeader>
    <page-main>
      <el-form ref="formRef" :inline="true" :model="searchForm" class="mb-4">
        <el-form-item label="技能名称" prop="name">
          <el-input v-model="searchForm.name" placeholder="按名称搜索" clearable />
        </el-form-item>
        <el-form-item label="技能类型">
          <el-select v-model="searchForm.type" placeholder="选择类型" clearable>
            <el-option label="预设Prompt" value="prompt" />
            <el-option label="Agent技能" value="agent" />
            <el-option label="工作流" value="workflow" />
            <el-option label="代码执行" value="code" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="选择状态" clearable>
            <el-option label="启用" value="1" />
            <el-option label="禁用" value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
          <el-button type="success" @click="handleAdd">新增技能</el-button>
          <el-button type="warning" @click="handleInitBuiltIn">初始化内置技能</el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="loading" border :data="tableData" style="width: 100%">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="name" label="技能名称" min-width="150" />
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag>{{ typeMap[row.type] || row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="catName" label="分类" width="120" />
        <el-table-column prop="isBuiltIn" label="内置" width="70">
          <template #default="{ row }">
            <el-tag :type="row.isBuiltIn === 1 ? 'success' : 'info'" size="small">
              {{ row.isBuiltIn === 1 ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'">
              {{ row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="useCount" label="使用次数" width="90" />
        <el-table-column prop="order" label="排序" width="70" />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" size="small" @click="handleDelete(row)">删除</el-button>
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

    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="700px"
      @close="handleCloseDialog"
    >
      <el-form ref="formRef" :model="dialogForm" :rules="rules" label-width="100px">
        <el-form-item label="技能名称" prop="name">
          <el-input v-model="dialogForm.name" placeholder="请输入技能名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="dialogForm.description" type="textarea" placeholder="请输入描述" />
        </el-form-item>
        <el-form-item label="分类" prop="catId">
          <el-select v-model="dialogForm.catId" placeholder="选择分类" style="width: 100%">
            <el-option
              v-for="cat in categoryList"
              :key="cat.id"
              :label="cat.name"
              :value="String(cat.id)"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="技能类型">
          <el-select v-model="dialogForm.type" placeholder="选择类型">
            <el-option label="预设Prompt" value="prompt" />
            <el-option label="Agent技能" value="agent" />
            <el-option label="工作流" value="workflow" />
            <el-option label="代码执行" value="code" />
          </el-select>
        </el-form-item>
        <el-form-item label="标签">
          <el-input v-model="dialogForm.tags" placeholder="多个标签用逗号分隔" />
        </el-form-item>
        <el-form-item label="SystemPrompt">
          <el-input
            v-model="dialogForm.systemPrompt"
            type="textarea"
            :rows="4"
            placeholder="输入System Prompt"
          />
        </el-form-item>
        <el-form-item label="输入参数JSON">
          <el-input
            v-model="dialogForm.inputSchema"
            type="textarea"
            :rows="3"
            placeholder="输入参数模板JSON"
          />
        </el-form-item>
        <el-form-item label="执行配置JSON">
          <el-input
            v-model="dialogForm.executionConfig"
            type="textarea"
            :rows="3"
            placeholder="执行配置JSON（Agent技能需配置tools）"
          />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="dialogForm.order" :min="0" :max="9999" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="dialogForm.status">
            <el-radio :label="1">启用</el-radio>
            <el-radio :label="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="公开">
          <el-switch v-model="dialogForm.isPublic" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>
