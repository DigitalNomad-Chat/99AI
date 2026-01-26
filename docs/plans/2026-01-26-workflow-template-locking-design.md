# 工作流模板字段锁定功能设计文档

**日期**: 2026-01-26
**作者**: AI Assistant
**状态**: 设计完成，待实施

---

## 1. 概述

### 1.1 功能目标

在 FastGPT 工作流模式下，自动生成一个锁定的"用户提示词"输入框字段，该字段：
- 用户无法删除
- "作为工作流变量"固定为"否"且不可修改
- "必填"固定为"是"且不可修改
- 其他所有编辑功能均被禁用

同时，当用户切换"特殊模型"模式时，弹出警告对话框确认是否清空模板设置。

### 1.2 设计原则

- **YAGNI**: 只实现当前需要的功能，避免过度设计
- **清晰标识**: 使用 `systemType` 属性明确区分系统字段和用户字段
- **用户友好**: 通过视觉标识和禁用状态清晰传达字段的性质
- **数据安全**: 切换模式前强制确认，防止误操作导致数据丢失

---

## 2. 架构设计

### 2.1 组件职责

```
┌─────────────────────────────────────────────────────────────┐
│                    application.vue                          │
│  - 监听 specialModelType 变化                               │
│  - 弹出模式切换确认对话框                                    │
│  - 根据用户选择清空/保留模板                                 │
│  - FastGPT 模式：自动创建锁定的"用户提示词"字段              │
│  - 其他模式：清空模板                                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ props: appType
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              PromptTemplateEditor.vue                       │
│  - 接收 appType prop 判断当前模式                            │
│  - 根据 systemType 识别系统字段                              │
│  - 控制字段的禁用状态                                        │
│  - 提供系统字段的视觉标识                                    │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 数据流

```
用户切换特殊模型下拉框
       │
       ▼
监听 specialModelType 变化
       │
       ▼
检测到变化 → 弹出警告对话框
       │
       ▼
    用户选择？
       │
   ┌───┴───┐
   ▼       ▼
 取消     确认
   │       │
   │       ▼
   │   清空 templateFields
   │       │
   │       ▼
   │   根据新模式生成默认模板
   │       │
   │       ├─ FastGPT: 添加 systemType='userPrompt' 的锁定字段
   │       └─ 其他:   空模板
   │
   ▼
恢复旧值（不做任何操作）
```

---

## 3. 数据结构

### 3.1 TemplateField 接口扩展

```typescript
interface TemplateField {
  id: string;
  title: string;
  type: 'input' | 'select' | 'file' | 'image';
  placeholder: string;
  options?: string[];
  isVariable?: boolean;
  variableName?: string;
  required?: boolean;
  systemType?: 'userPrompt' | null;  // 新增：标识系统字段
}
```

### 3.2 字段状态矩阵

| appType | 字段来源 | 字段类型 | isVariable | 可编辑性 |
|---------|---------|---------|------------|----------|
| 1 (FastGPT) | 系统 | input | false (锁定) | 完全锁定 |
| 1 (FastGPT) | 用户 | input/select | true (默认) | 正常可编辑 |
| 0/其他 | 用户 | input/select | false (锁定) | 正常可编辑，但 isVariable 禁用 |

---

## 4. PromptTemplateEditor 组件设计

### 4.1 计算属性

```typescript
// 判断字段是否为系统字段（完全锁定）
const isSystemField = (field: TemplateField): boolean => {
  return field.systemType === 'userPrompt';
};

// 判断字段是否应该禁用 isVariable 修改
const shouldDisableIsVariable = (field: TemplateField): boolean => {
  // 非 FastGPT 模式下，所有字段的 isVariable 都禁用
  if (props.appType !== 1) return true;
  // FastGPT 模式下，系统字段的 isVariable 禁用
  return isSystemField(field);
};
```

### 4.2 禁用功能清单

对于 `systemType='userPrompt'` 的字段，禁用以下功能：

| 功能 | 实现方式 |
|------|----------|
| 删除按钮 | `:disabled="isSystemField(field)"` |
| 字段类型切换 | `:disabled="isSystemField(field)"` |
| 字段名称编辑 | `:disabled="isSystemField(field)"` |
| 提示文字编辑 | `:disabled="isSystemField(field)"` |
| isVariable 开关 | `:disabled="shouldDisableIsVariable(field)"` |
| required 开关 | `:disabled="isSystemField(field)"` |
| 拖拽排序 | 在 draggable 配置中过滤系统字段 |

### 4.3 视觉标识（可选）

建议为系统字段添加以下视觉区分：

- 金色边框
- 锁图标
- "系统字段"标签

---

## 5. application.vue 页面设计

### 5.1 状态变量

```typescript
// 模式切换确认对话框状态
const showModeSwitchConfirmDialog = ref(false);
const pendingModeType = ref<string>('none');
const previousModeType = ref<string>('none');
```

### 5.2 监听逻辑

```typescript
// 监听特殊模型类型变化，弹出确认对话框
watch(specialModelType, async (newValue, oldValue) => {
  // 初始化时跳过
  if (!oldValue || oldValue === 'none' && !newValue) return;

  // 模式确实发生变化
  if (newValue !== oldValue) {
    // 保存待切换的模式，并弹出确认对话框
    pendingModeType.value = newValue;
    previousModeType.value = oldValue;
    showModeSwitchConfirmDialog.value = true;

    // 暂时恢复旧值，等待用户确认
    nextTick(() => {
      specialModelType.value = oldValue;
    });
  }
});
```

### 5.3 确认/取消处理

```typescript
// 确认切换模式
function confirmModeSwitch() {
  const newMode = pendingModeType.value;

  // 清空模板
  templateFields.value = [];

  // 根据新模式生成默认模板
  if (newMode === 'fastgpt') {
    templateFields.value = [{
      id: uuidv4(),
      type: 'input',
      title: '用户提示词',
      placeholder: '用户将在聊天框中输入问题，此字段仅用于提示',
      isVariable: false,
      variableName: '',
      required: true,
      systemType: 'userPrompt',
    }];
    ElMessage.success('已切换到 FastGPT 工作流模式');
  } else {
    ElMessage.success(`已切换到 ${newMode} 模式`);
  }

  // 更新模式
  specialModelType.value = newMode;
  showModeSwitchConfirmDialog.value = false;
}

// 取消切换模式
function cancelModeSwitch() {
  pendingModeType.value = '';
  showModeSwitchConfirmDialog.value = false;
  ElMessage.info('已取消模式切换');
}
```

### 5.4 确认对话框

```
┌─────────────────────────────────────────┐
│ ⚠️ 警告：切换模式将清空所有模板设置     │
├─────────────────────────────────────────┤
│                                         │
│            ⚠️ (红色警告图标)             │
│                                         │
│  当前模板字段将被全部删除，              │
│  无法恢复。                              │
│                                         │
│  请确认是否继续切换到 XXXX 模式？       │
│                                         │
├─────────────────────────────────────────┤
│          [取消]    [确认切换] (红色)     │
└─────────────────────────────────────────┘
```

---

## 6. 实施计划

### 6.1 修改文件清单

| 序号 | 文件 | 修改内容 |
|------|------|----------|
| 1 | `admin/src/components/PromptTemplateEditor/index.vue` | 添加 systemType、禁用逻辑、视觉标识 |
| 2 | `admin/src/views/app/application.vue` | 模式切换确认逻辑、弹窗模板 |

### 6.2 测试场景

| 场景 | 预期行为 |
|------|----------|
| 切换到 FastGPT | 弹窗确认 → 自动创建锁定的"用户提示词"字段 |
| 切换到不使用/GPTs | 弹窗确认 → 清空模板 |
| FastGPT 新建字段 | isVariable 默认为 true，可修改 |
| 其他模式新建字段 | isVariable 固定为 false，不可修改 |
| 尝试删除系统字段 | 删除按钮禁用 |
| 尝试编辑系统字段 | 所有编辑功能禁用 |
| 取消模式切换 | 模板保持不变，模式不切换 |

---

## 7. 后续扩展

如果将来需要添加其他类型的系统字段，只需：

1. 在 `systemType` 类型中添加新的标识符（如 `'systemConfig'`）
2. 在 `isSystemField` 计算属性中添加相应判断
3. 根据需要调整禁用逻辑

这种设计遵循开闭原则，对扩展开放，对修改封闭。
