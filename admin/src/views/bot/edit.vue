<script setup lang="ts">
  import { ref, onMounted } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  import { ElMessage } from 'element-plus';
  import { createBotInstance, updateBotInstance, getBotInstances } from '@/api/modules/bot';

  const route = useRoute();
  const router = useRouter();
  const loading = ref(false);
  const isEdit = ref(false);

  const form = ref({
    name: '',
    platform: 'wecom',
    appId: '',
    appSecret: '',
    extraConfig: '',
    status: 1,
    appId_ref: undefined as number | undefined,
    model: '',
    welcomeMessage: '',
    verifyToken: '',
    encodingAesKey: '',
  });

  const platforms = [
    { value: 'wecom', label: '企业微信' },
    { value: 'feishu', label: '飞书' },
    { value: 'discord', label: 'Discord' },
    { value: 'qq', label: 'QQ' },
  ];

  async function loadData() {
    const id = route.query.id;
    if (!id) return;
    isEdit.value = true;
    const res: any = await getBotInstances();
    const list = res.data || res || [];
    const item = list.find((x: any) => x.id === Number(id));
    if (item) {
      form.value = { ...item };
    }
  }

  async function handleSubmit() {
    loading.value = true;
    try {
      if (isEdit.value) {
        await updateBotInstance(Number(route.query.id), form.value);
      } else {
        await createBotInstance(form.value);
      }
      ElMessage.success('保存成功');
      router.push({ name: 'BotList' });
    } catch (error: any) {
      ElMessage.error(error.message || '保存失败');
    } finally {
      loading.value = false;
    }
  }

  onMounted(loadData);
</script>

<template>
  <div class="p-4">
    <el-card>
      <template #header>
        <span>{{ isEdit ? '编辑 Bot' : '新增 Bot' }}</span>
      </template>
      <el-form :model="form" label-width="120px">
        <el-form-item label="名称" required>
          <el-input v-model="form.name" placeholder="Bot 名称" />
        </el-form-item>
        <el-form-item label="平台" required>
          <el-select v-model="form.platform" placeholder="选择平台">
            <el-option v-for="p in platforms" :key="p.value" :label="p.label" :value="p.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="AppID" required>
          <el-input v-model="form.appId" placeholder="平台 AppID / BotID" />
        </el-form-item>
        <el-form-item label="Secret / Token" required>
          <el-input v-model="form.appSecret" type="password" placeholder="平台 Secret 或 Token" />
        </el-form-item>
        <el-form-item label="使用模型">
          <el-input v-model="form.model" placeholder="如 gpt-3.5-turbo" />
        </el-form-item>
        <el-form-item label="绑定应用ID">
          <el-input-number
            v-model="form.appId_ref"
            :min="0"
            :controls="false"
            placeholder="应用 ID"
          />
        </el-form-item>
        <el-form-item label="欢迎语">
          <el-input v-model="form.welcomeMessage" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="验证令牌">
          <el-input v-model="form.verifyToken" placeholder="Webhook 验证令牌" />
        </el-form-item>
        <el-form-item label="加密密钥">
          <el-input v-model="form.encodingAesKey" placeholder="消息加密密钥" />
        </el-form-item>
        <el-form-item label="附加配置">
          <el-input
            v-model="form.extraConfig"
            type="textarea"
            :rows="3"
            placeholder='JSON 格式，如 {"agentId": 1000002}'
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch
            v-model="form.status"
            :active-value="1"
            :inactive-value="0"
            active-text="启用"
            inactive-text="禁用"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleSubmit">保存</el-button>
          <el-button @click="router.back()">返回</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>
