<route lang="yaml">
meta:
  title: 技能分类管理
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
  const dialogTitle = ref('新增分类');
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
    order: 100,
    status: 1,
    isMember: 0,
    hideFromNonMember: 0,
  });

  const rules = reactive<FormRules>({
    name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }],
  });

  interface CategoryItem {
    id: number;
    name: string;
    description: string;
    order: number;
    status: number;
    isMember: number;
    hideFromNonMember: number;
    skillCount: number;
    createdAt: string;
  }

  const tableData = ref<CategoryItem[]>([]);

  async function queryList() {
    try {
      loading.value = true;
      const res = await ApiSkills.queryCategories(searchForm);
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
    dialogTitle.value = '新增分类';
    resetDialogForm();
    dialogVisible.value = true;
  }

  function handleEdit(row: CategoryItem) {
    isEdit.value = true;
    editingId.value = row.id;
    dialogTitle.value = '编辑分类';
    dialogForm.name = row.name;
    dialogForm.description = row.description || '';
    dialogForm.order = row.order;
    dialogForm.status = row.status;
    dialogForm.isMember = row.isMember;
    dialogForm.hideFromNonMember = row.hideFromNonMember;
    dialogVisible.value = true;
  }

  function resetDialogForm() {
    dialogForm.name = '';
    dialogForm.description = '';
    dialogForm.order = 100;
    dialogForm.status = 1;
    dialogForm.isMember = 0;
    dialogForm.hideFromNonMember = 0;
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
          await ApiSkills.updateCategory({ id: editingId.value, ...dialogForm });
          ElMessage.success('更新分类成功');
        } else {
          await ApiSkills.createCategory(dialogForm);
          ElMessage.success('创建分类成功');
        }
        dialogVisible.value = false;
        queryList();
      } catch (error) {
        ElMessage.error(isEdit.value ? '更新分类失败' : '创建分类失败');
      }
    });
  }

  async function handleDelete(row: CategoryItem) {
    try {
      await ElMessageBox.confirm(`确认删除分类「${row.name}」吗？删除后将无法恢复。`, '删除确认', {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning',
      });
      await ApiSkills.deleteCategory({ id: row.id });
      ElMessage.success('删除分类成功');
      queryList();
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error('删除分类失败');
      }
    }
  }

  onMounted(() => queryList());
</script>

<template>
  <div>
    <PageHeader>
      <template #title>
        <div class="flex items-center gap-4">技能分类管理</div>
      </template>
    </PageHeader>
    <page-main>
      <el-form ref="formRef" :inline="true" :model="searchForm" class="mb-4">
        <el-form-item label="分类名称" prop="name">
          <el-input v-model="searchForm.name" placeholder="按名称搜索" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
          <el-button type="success" @click="handleAdd">新增分类</el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="loading" border :data="tableData" style="width: 100%">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="name" label="分类名称" min-width="150" />
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column prop="skillCount" label="技能数" width="80" />
        <el-table-column prop="order" label="排序" width="80" />
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'danger'">
              {{ row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="isMember" label="会员专属" width="90">
          <template #default="{ row }">
            <el-tag :type="row.isMember === 1 ? 'warning' : 'info'">
              {{ row.isMember === 1 ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
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
      width="600px"
      @close="handleCloseDialog"
    >
      <el-form ref="formRef" :model="dialogForm" :rules="rules" label-width="100px">
        <el-form-item label="分类名称" prop="name">
          <el-input v-model="dialogForm.name" placeholder="请输入分类名称" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="dialogForm.description" type="textarea" placeholder="请输入描述" />
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
        <el-form-item label="会员专属">
          <el-radio-group v-model="dialogForm.isMember">
            <el-radio :label="1">是</el-radio>
            <el-radio :label="0">否</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="非会员隐藏">
          <el-radio-group v-model="dialogForm.hideFromNonMember">
            <el-radio :label="1">是</el-radio>
            <el-radio :label="0">否</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>
