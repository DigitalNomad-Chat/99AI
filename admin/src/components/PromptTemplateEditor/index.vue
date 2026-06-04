<script setup lang="ts">
  import { Delete, Lock, Plus, Rank } from '@element-plus/icons-vue';
  import { ElMessage } from 'element-plus';
  import { v4 as uuidv4 } from 'uuid';
  import { computed, ref } from 'vue';
  import draggable from 'vuedraggable';

  // 定义字段类型接口
  interface TemplateField {
    id: string;
    title: string;
    type: 'input' | 'select' | 'file' | 'image';
    placeholder: string;
    options?: string[];
    isVariable?: boolean;
    variableName?: string;
    required?: boolean;
    systemType?: 'userPrompt' | null; // 标识系统字段
  }

  // 定义 Props 和 Emits
  const props = defineProps<{
    modelValue: TemplateField[];
    appType?: number; // 0=智能体, 1=FastGPT, 2=Dify, 3=n8n
  }>();

  const emit = defineEmits<{
    (e: 'update:modelValue', value: TemplateField[]): void;
  }>();

  // 本地状态，避免直接修改 prop
  const localFields = ref<TemplateField[]>([]);

  // 使用计算属性同步 prop 和本地状态
  const fields = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value),
  });

  // 添加新字段
  const addField = (type: 'input' | 'select' | 'file' | 'image' = 'input') => {
    const isFastGPT = props.appType === 1;

    fields.value = [
      ...fields.value,
      {
        id: uuidv4(),
        type,
        title: '',
        placeholder: '',
        options: type === 'select' ? [''] : undefined,
        // FastGPT 模式下新建字段默认为变量，非工作流模式固定为 false
        isVariable: isFastGPT ? true : false,
        variableName: '',
        required: false,
      },
    ];
  };

  // 删除字段
  const removeField = (id: string) => {
    fields.value = fields.value.filter((field) => field.id !== id);
  };

  // 添加选项（仅用于 select）
  const addOption = (fieldId: string) => {
    fields.value = fields.value.map((field) => {
      if (field.id === fieldId && field.type === 'select') {
        const options = field.options ? [...field.options] : [];
        options.push('');
        return { ...field, options };
      }
      return field;
    });
  };

  // 删除选项（仅用于 select）
  const removeOption = (fieldId: string, optionIndex: number) => {
    fields.value = fields.value.map((field) => {
      if (field.id === fieldId && field.type === 'select' && field.options) {
        const options = [...field.options];
        if (options.length > 1) {
          options.splice(optionIndex, 1);
          return { ...field, options };
        } else {
          ElMessage.warning('下拉框至少需要一个选项');
        }
      }
      return field;
    });
  };

  // 更新字段类型
  const updateFieldType = (id: string, newType: 'input' | 'select' | 'file' | 'image') => {
    fields.value = fields.value.map((field) => {
      if (field.id === id) {
        return {
          ...field,
          type: newType,
          options: newType === 'select' && !field.options ? [''] : field.options,
          // 文件类型默认不作为变量
          isVariable: newType !== 'file' && newType !== 'image' ? field.isVariable : false,
        };
      }
      return field;
    });
  };

  // 更新选项值
  const updateOptionValue = (fieldId: string, optionIndex: number, value: string) => {
    fields.value = fields.value.map((field) => {
      if (field.id === fieldId && field.type === 'select' && field.options) {
        const options = [...field.options];
        options[optionIndex] = value;
        return { ...field, options };
      }
      return field;
    });
  };

  // 更新 Placeholder 值
  const updatePlaceholderValue = (fieldId: string, value: string) => {
    fields.value = fields.value.map((field) => {
      if (field.id === fieldId) {
        return { ...field, placeholder: value };
      }
      return field;
    });
  };

  // 更新 Title 值
  const updateTitleValue = (fieldId: string, value: string) => {
    fields.value = fields.value.map((field) => {
      if (field.id === fieldId) {
        return { ...field, title: value };
      }
      return field;
    });
  };

  // 更新变量名
  const updateVariableName = (fieldId: string, value: string) => {
    fields.value = fields.value.map((field) => {
      if (field.id === fieldId) {
        return { ...field, variableName: value };
      }
      return field;
    });
  };

  // 切换是否作为变量
  const toggleIsVariable = (fieldId: string) => {
    fields.value = fields.value.map((field) => {
      if (field.id === fieldId) {
        return { ...field, isVariable: !field.isVariable };
      }
      return field;
    });
  };

  // 切换是否必填
  const toggleRequired = (fieldId: string) => {
    fields.value = fields.value.map((field) => {
      if (field.id === fieldId) {
        return { ...field, required: !field.required };
      }
      return field;
    });
  };

  // Draggable 配置
  const dragOptions = {
    animation: 200,
    ghostClass: 'ghost',
    handle: '.drag-handle',
  };

  // 获取字段类型标签
  const getFieldTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      input: '输入框',
      select: '下拉框',
      file: '文件上传',
      image: '图片上传',
    };
    return labels[type] || type;
  };

  // 判断字段是否为系统字段（完全锁定）
  const isSystemField = (field: TemplateField): boolean => {
    return field.systemType === 'userPrompt';
  };

  // 判断字段是否应该禁用 isVariable 修改
  const shouldDisableIsVariable = (field: TemplateField): boolean => {
    // 非 FastGPT 模式下，所有字段的 isVariable 都禁用
    if (props.appType !== 1) return true;
    // FastGPT 模式下，所有字段的 isVariable 都禁用（锁定为变量）
    return true;
  };
</script>

<template>
  <div class="prompt-template-editor">
    <!-- Use CSS Grid for layout -->
    <draggable v-model="fields" item-key="id" v-bind="dragOptions" tag="div" class="field-grid">
      <template #item="{ element: field, index }">
        <el-card
          shadow="never"
          class="field-item border border-gray-200 relative group"
          :class="{ 'system-field-card': isSystemField(field) }"
        >
          <!-- System Field Header -->
          <div v-if="isSystemField(field)" class="system-field-header">
            <el-tag size="small" type="warning" effect="dark">
              <el-icon class="mr-1"><Lock /></el-icon>
              系统字段（不可删除/修改）
            </el-tag>
          </div>

          <div class="flex items-start space-x-3" :class="{ 'mt-2': isSystemField(field) }">
            <!-- Add Number Prefix (系统字段不显示序号) -->
            <div
              v-if="!isSystemField(field)"
              class="field-number font-semibold text-gray-400 pt-2 mr-1"
            >
              {{ index + 1 }}.
            </div>

            <!-- Drag Handle / Lock Icon -->
            <div
              class="drag-handle text-gray-400 hover:text-gray-600 pt-2"
              :class="{
                'cursor-not-allowed': isSystemField(field),
                'cursor-move': !isSystemField(field),
              }"
            >
              <el-icon :size="20">
                <Rank v-if="!isSystemField(field)" />
                <Lock v-else class="text-orange-500" />
              </el-icon>
            </div>

            <!-- Field Content -->
            <div class="flex-grow min-w-0">
              <!-- System Field: 简化显示 -->
              <div v-if="isSystemField(field)" class="system-field-content">
                <div class="flex items-center gap-2 mb-3">
                  <el-tag
                    size="small"
                    :type="
                      field.type === 'input'
                        ? 'primary'
                        : field.type === 'select'
                          ? 'success'
                          : 'warning'
                    "
                  >
                    {{ getFieldTypeLabel(field.type) }}
                  </el-tag>
                  <el-tag size="small" type="danger">必填</el-tag>
                  <el-tag size="small" type="info">作为工作流变量：否</el-tag>
                </div>
                <div class="field-info-display">
                  <div class="info-row">
                    <span class="info-label">字段名称：</span>
                    <span class="info-value">{{ field.title }}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">提示文字：</span>
                    <span class="info-value text-gray-600">{{ field.placeholder }}</span>
                  </div>
                </div>
              </div>

              <!-- Regular Field: 正常表单 -->
              <el-form v-else label-position="top" size="small">
                <div class="flex items-center mb-2 space-x-4">
                  <el-radio-group
                    :model-value="field.type"
                    @update:modelValue="
                      (newType) =>
                        updateFieldType(field.id, newType as 'input' | 'select' | 'file' | 'image')
                    "
                    size="small"
                    :disabled="isSystemField(field)"
                  >
                    <el-radio-button label="input">输入框</el-radio-button>
                    <el-radio-button label="select">下拉框</el-radio-button>
                    <el-radio-button label="file">文件</el-radio-button>
                    <el-radio-button label="image">图片</el-radio-button>
                  </el-radio-group>
                  <el-button
                    :icon="Delete"
                    class="ml-auto field-delete-btn"
                    @click="removeField(field.id)"
                    :disabled="isSystemField(field)"
                  />
                </div>

                <!-- 显示当前字段类型 -->
                <div class="mb-2">
                  <el-tag
                    size="small"
                    :type="
                      field.type === 'input'
                        ? 'primary'
                        : field.type === 'select'
                          ? 'success'
                          : 'warning'
                    "
                  >
                    {{ getFieldTypeLabel(field.type) }}
                  </el-tag>
                  <el-tag v-if="field.required" size="small" type="danger" class="ml-1"
                    >必填</el-tag
                  >
                </div>

                <el-form-item label="字段名称 * (Title / Label)">
                  <el-input
                    :model-value="field.title"
                    @update:modelValue="(val) => updateTitleValue(field.id, val)"
                    placeholder="例如：您的姓名"
                    clearable
                    :disabled="isSystemField(field)"
                  />
                </el-form-item>

                <el-form-item label="提示文字 * (Placeholder)">
                  <el-input
                    :model-value="field.placeholder"
                    @update:modelValue="(val) => updatePlaceholderValue(field.id, val)"
                    placeholder="例如：请输入您的姓名"
                    clearable
                    :disabled="isSystemField(field)"
                  />
                </el-form-item>

                <!-- 工作流变量配置 - 仅对非文件类型显示 -->
                <template v-if="field.type !== 'file' && field.type !== 'image'">
                  <el-form-item label="作为工作流变量">
                    <el-switch
                      :model-value="field.isVariable"
                      @change="() => toggleIsVariable(field.id)"
                      active-text="是"
                      inactive-text="否"
                      :disabled="shouldDisableIsVariable(field)"
                    />
                    <div v-if="props.appType !== 1" class="text-xs text-gray-500 mt-1">
                      仅 FastGPT 工作流模式支持变量
                    </div>
                    <div
                      v-if="props.appType === 1 && !isSystemField(field)"
                      class="text-xs text-gray-500 mt-1"
                    >
                      FastGPT 工作流模式下，所有字段默认作为变量传递
                    </div>
                    <div v-if="isSystemField(field)" class="text-xs text-orange-500 mt-1">
                      系统字段不可修改
                    </div>
                  </el-form-item>
                  <el-form-item v-if="field.isVariable" label="变量名 *">
                    <el-input
                      :model-value="field.variableName"
                      @update:modelValue="(val) => updateVariableName(field.id, val)"
                      placeholder="例如：userName"
                      clearable
                      :disabled="props.appType !== 1"
                    />
                    <div class="text-xs text-gray-500 mt-1">变量名将传递给工作流平台</div>
                  </el-form-item>
                </template>

                <!-- 必填选项 -->
                <el-form-item label="必填">
                  <el-switch
                    :model-value="field.required"
                    @change="() => toggleRequired(field.id)"
                    :disabled="isSystemField(field)"
                  />
                </el-form-item>

                <!-- 下拉框选项配置 -->
                <div v-if="field.type === 'select'">
                  <el-form-item label="下拉选项 *">
                    <div class="space-y-2 w-full">
                      <div
                        v-for="(option, index) in field.options"
                        :key="index"
                        class="flex items-center space-x-2"
                      >
                        <el-input
                          :model-value="option"
                          @update:modelValue="(val) => updateOptionValue(field.id, index, val)"
                          placeholder="选项内容"
                          size="small"
                          clearable
                          class="flex-grow"
                        />
                        <el-button
                          :icon="Delete"
                          size="small"
                          class="option-delete-btn"
                          :disabled="field.options && field.options.length <= 1"
                          @click="removeOption(field.id, index)"
                        />
                      </div>
                      <el-button
                        :icon="Plus"
                        type="primary"
                        link
                        size="small"
                        @click="addOption(field.id)"
                      >
                        添加选项
                      </el-button>
                    </div>
                  </el-form-item>
                </div>

                <!-- 文件上传说明 -->
                <div v-if="field.type === 'file' || field.type === 'image'">
                  <el-alert
                    :title="field.type === 'file' ? '文件上传字段' : '图片上传字段'"
                    type="info"
                    :closable="false"
                    show-icon
                  >
                    <template #default>
                      <div class="text-xs">
                        <p>• 文件将上传到99AI服务器后传递给工作流</p>
                        <p>
                          • 支持格式:
                          {{
                            field.type === 'file' ? 'PDF, DOC, TXT, MD等' : 'JPG, PNG, GIF, WEBP'
                          }}
                        </p>
                      </div>
                    </template>
                  </el-alert>
                </div>
              </el-form>
            </div>
          </div>
        </el-card>
      </template>
    </draggable>

    <!-- 添加按钮组 - 统一视觉语言 -->
    <div class="field-actions">
      <button type="button" class="action-btn action-btn-input" @click="addField('input')">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        <span class="btn-text">输入框</span>
        <span class="btn-type-hint type-input"></span>
      </button>

      <button type="button" class="action-btn action-btn-select" @click="addField('select')">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        <span class="btn-text">下拉框</span>
        <span class="btn-type-hint type-select"></span>
      </button>

      <button type="button" class="action-btn action-btn-file" @click="addField('file')">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        <span class="btn-text">文件上传</span>
        <span class="btn-type-hint type-file"></span>
      </button>

      <button type="button" class="action-btn action-btn-image" @click="addField('image')">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        <span class="btn-text">图片上传</span>
        <span class="btn-type-hint type-image"></span>
      </button>
    </div>
  </div>
</template>

<style scoped>
  .prompt-template-editor {
    padding: 5px;
  }

  .field-grid {
    /* Use Grid for layout */
    display: grid;
    /* grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); */ /* Try forcing 3 columns */
    grid-template-columns: repeat(3, 1fr); /* Force 3 columns */
    gap: 1rem;
    width: 100%;
  }

  .field-item {
    background-color: #fdfdfd;
    transition: box-shadow 0.2s ease-in-out;
    width: 100%; /* Ensure card takes full width of cell */
  }
  .field-item:hover {
    box-shadow: var(--el-box-shadow-lighter);
  }

  /* 系统字段卡片样式 */
  .system-field-card {
    background: linear-gradient(135deg, #fff9e6 0%, #fffbf0 100%);
    border-color: #f59e0b !important;
    border-width: 2px;
  }
  .system-field-card:hover {
    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.15);
  }

  /* 系统字段内容样式 */
  .system-field-header {
    padding: 12px 12px 0;
    text-align: center;
  }

  .system-field-content {
    padding: 12px 0 0;
  }

  .field-info-display {
    background: rgba(255, 255, 255, 0.6);
    border-radius: 8px;
    padding: 12px;
    border: 1px solid rgba(245, 158, 11, 0.2);
  }

  .field-info-display .info-row {
    display: flex;
    align-items: flex-start;
    padding: 6px 0;
  }

  .field-info-display .info-row:not(:last-child) {
    border-bottom: 1px dashed rgba(245, 158, 11, 0.2);
  }

  .field-info-display .info-label {
    color: #92400e;
    font-weight: 500;
    font-size: 13px;
    min-width: 80px;
    flex-shrink: 0;
  }

  .field-info-display .info-value {
    color: #78350f;
    font-size: 13px;
    word-break: break-all;
  }

  .drag-handle {
    touch-action: none;
  }

  .field-number {
    /* Style for number prefix */
    min-width: 20px;
    text-align: right;
  }

  .ghost {
    opacity: 0.5;
    background: #c8ebfb;
    border: 1px dashed #409eff;
  }

  :deep(.el-form-item__label) {
    line-height: normal;
    margin-bottom: 4px !important;
    padding: 0 !important;
  }
  :deep(.el-form-item) {
    margin-bottom: 10px;
  }

  /* ========================================
     Refined Delete Button Styles
     设计理念：精致专业 - 微交互传达意图
     ======================================== */

  /* 字段卡片删除按钮 - 主要操作 */
  .field-delete-btn {
    /* 基础样式 - 低调但可发现 */
    --btn-delete-default: #9ca3af;
    --btn-delete-hover: #dc2626;
    --btn-delete-bg-hover: #fef2f2;
    --btn-delete-active: #b91c1c;
    --btn-delete-bg-active: #fee2e2;

    color: var(--btn-delete-default);
    background: transparent;
    border: none;
    padding: 8px 10px;
    font-size: 16px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;

    /* 默认隐藏，悬停卡片时显示 */
    opacity: 0;
    transform: translateX(-4px);
  }

  /* 卡片悬停时显示按钮 */
  .field-item:hover .field-delete-btn {
    opacity: 1;
    transform: translateX(0);
  }

  /* 悬停状态 - 精致的红色过渡 */
  .field-delete-btn:hover {
    color: var(--btn-delete-hover);
    background: var(--btn-delete-bg-hover);
    transform: scale(1.08);
    box-shadow: 0 2px 8px rgba(220, 38, 38, 0.15);
  }

  /* 图标微动画 - 倾斜传达删除意图 */
  .field-delete-btn:hover :deep(.el-icon) {
    transform: rotate(-8deg) scale(1.05);
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  /* 激活/按下状态 */
  .field-delete-btn:active {
    color: var(--btn-delete-active);
    background: var(--btn-delete-bg-active);
    transform: scale(0.95);
    box-shadow: 0 1px 4px rgba(220, 38, 38, 0.2);
  }

  /* 禁用状态 */
  .field-delete-btn:disabled {
    color: #d1d5db;
    cursor: not-allowed;
    opacity: 0.5;
  }

  /* 选项删除按钮 - 次要操作 */
  .option-delete-btn {
    --option-delete-default: #9ca3af;
    --option-delete-hover: #ef4444;
    --option-delete-bg-hover: #fef2f2;
    --option-delete-active: #dc2626;

    color: var(--option-delete-default);
    background: transparent;
    border: none;
    padding: 6px 8px;
    font-size: 14px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .option-delete-btn:hover:not(:disabled) {
    color: var(--option-delete-hover);
    background: var(--option-delete-bg-hover);
    transform: scale(1.1);
  }

  .option-delete-btn:hover:not(:disabled) :deep(.el-icon) {
    transform: rotate(-5deg);
    transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .option-delete-btn:active:not(:disabled) {
    color: var(--option-delete-active);
    transform: scale(0.95);
  }

  .option-delete-btn:disabled {
    color: #e5e7eb;
    cursor: not-allowed;
    opacity: 0.5;
  }

  /* 添加按钮的精致样式 - 统一视觉语言 */
  .el-button:has(.el-icon.Plus):has(.el-icon.Delete) {
    font-weight: 500;
  }

  /* ========================================
     Field Action Buttons - Refined Design
     设计理念：统一品牌色 + 图标差异化 + 微妙类型提示
     ======================================== */

  .field-actions {
    display: flex;
    justify-content: center;
    gap: 12px;
    flex-wrap: wrap;
    padding: 20px 0;
  }

  /* 基础按钮样式 - 统一品牌蓝色 */
  .action-btn {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    font-size: 14px;
    font-weight: 500;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #275bff;
    background: #ffffff;
    border: 1.5px solid #e8f0fe;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    outline: none;
    overflow: hidden;
  }

  /* 类型提示标记 - 默认隐藏 */
  .btn-type-hint {
    position: absolute;
    top: 0;
    right: 0;
    width: 8px;
    height: 8px;
    border-radius: 0 10px 0 8px;
    opacity: 0;
    transform: scale(0);
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  /* 悬停状态 - 统一动画 */
  .action-btn:hover {
    border-color: #275bff;
    background: #f8f9ff;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(39, 91, 255, 0.15);
  }

  /* 悬停时显示类型提示 */
  .action-btn:hover .btn-type-hint {
    opacity: 1;
    transform: scale(1);
  }

  /* SVG 图标样式 */
  .action-btn svg {
    flex-shrink: 0;
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .action-btn:hover svg {
    transform: rotate(90deg);
  }

  /* 按钮文字 */
  .action-btn .btn-text {
    letter-spacing: 0.3px;
  }

  /* 激活状态 */
  .action-btn:active {
    transform: translateY(0);
    box-shadow: 0 2px 6px rgba(39, 91, 255, 0.2);
  }

  /* 焦点状态 - 可访问性 */
  .action-btn:focus-visible {
    outline: 2px solid #275bff;
    outline-offset: 2px;
  }

  /* ========================================
     类型专属样式 - 微妙的颜色差异
     ======================================== */

  /* 输入框 - 蓝色 */
  .action-btn-input .btn-type-hint.type-input {
    background: linear-gradient(135deg, #275bff, #1d4ed8);
  }

  .action-btn-input:hover {
    border-color: #275bff;
    box-shadow: 0 4px 12px rgba(39, 91, 255, 0.2);
  }

  /* 下拉框 - 绿色 */
  .action-btn-select .btn-type-hint.type-select {
    background: linear-gradient(135deg, #10b981, #059669);
  }

  .action-btn-select:hover {
    border-color: #10b981;
    background: linear-gradient(135deg, #f0fdf4, #ffffff);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);
  }

  .action-btn-select:hover svg {
    color: #10b981;
  }

  /* 文件上传 - 橙色 */
  .action-btn-file .btn-type-hint.type-file {
    background: linear-gradient(135deg, #f59e0b, #d97706);
  }

  .action-btn-file:hover {
    border-color: #f59e0b;
    background: linear-gradient(135deg, #fffbeb, #ffffff);
    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.15);
  }

  .action-btn-file:hover svg {
    color: #f59e0b;
  }

  /* 图片上传 - 紫色 */
  .action-btn-image .btn-type-hint.type-image {
    background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  }

  .action-btn-image:hover {
    border-color: #8b5cf6;
    background: linear-gradient(135deg, #f5f3ff, #ffffff);
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.15);
  }

  .action-btn-image:hover svg {
    color: #8b5cf6;
  }

  /* ========================================
     响应式设计
     ======================================== */

  @media (max-width: 768px) {
    .field-actions {
      gap: 8px;
    }

    .action-btn {
      padding: 8px 16px;
      font-size: 13px;
    }

    .action-btn .btn-text {
      /* 移动端保持文字显示 */
    }
  }

  @media (max-width: 480px) {
    .field-actions {
      flex-direction: column;
      align-items: stretch;
    }

    .action-btn {
      width: 100%;
      justify-content: center;
    }
  }

  /* ========================================
     暗色模式支持
     ======================================== */

  @media (prefers-color-scheme: dark) {
    .action-btn {
      background: #1e293b;
      border-color: #334155;
    }

    .action-btn:hover {
      background: #1e3a5f;
      border-color: #409eff;
    }

    .action-btn-input:hover {
      background: linear-gradient(135deg, #1e3a5f, #0f172a);
    }

    .action-btn-select:hover {
      background: linear-gradient(135deg, #14532d, #0f172a);
      border-color: #10b981;
    }

    .action-btn-file:hover {
      background: linear-gradient(135deg, #451a03, #0f172a);
      border-color: #f59e0b;
    }

    .action-btn-image:hover {
      background: linear-gradient(135deg, #2e1065, #0f172a);
      border-color: #8b5cf6;
    }
  }

  /* ========================================
     减少动画模式
     ======================================== */

  @media (prefers-reduced-motion: reduce) {
    .action-btn {
      transition:
        border-color 0.15s ease,
        box-shadow 0.15s ease;
    }

    .action-btn:hover {
      transform: none;
    }

    .action-btn:hover svg {
      transform: none;
    }

    .btn-type-hint {
      transition: opacity 0.15s ease;
    }
  }
</style>
