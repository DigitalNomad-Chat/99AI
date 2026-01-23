/**
 * 模板库
 * 预设的 Artifact 模板
 *
 * @module utils/compiler/templates
 */

import type { ArtifactType } from '@/store/modules/artifact/helper'

/**
 * 模板分类
 */
export enum TemplateCategory {
  Basic = 'basic',
  Interactive = 'interactive',
  Visualization = 'visualization',
  Form = 'form',
  Animation = 'animation',
}

/**
 * 模板接口
 */
export interface Template {
  id: string
  name: string
  description: string
  category: TemplateCategory
  type: ArtifactType
  code: string
  icon?: string
  tags?: string[]
}

/**
 * 模板库
 */
export const templateLibrary: Template[] = [
  // HTML 基础模板
  {
    id: 'html-starter',
    name: 'HTML 起始模板',
    description: '基础的 HTML5 页面结构，包含响应式设计',
    category: TemplateCategory.Basic,
    type: 'html',
    icon: '📄',
    tags: ['html', 'starter', 'basic'],
    code: `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Page</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    h1 { color: #2563eb; margin-bottom: 0.5em; }
    p { margin-bottom: 1em; }
  </style>
</head>
<body>
  <h1>Welcome</h1>
  <p>This is a basic HTML template to get you started.</p>
</body>
</html>`,
  },

  // React 组件模板
  {
    id: 'react-counter',
    name: '计数器',
    description: '经典的计数器组件，展示状态管理',
    category: TemplateCategory.Interactive,
    type: 'react',
    icon: '🔢',
    tags: ['react', 'counter', 'basic', 'state'],
    code: `import React, { useState } from 'react'

function Counter() {
  const [count, setCount] = useState(0)
  const increment = () => setCount(c => c + 1)
  const decrement = () => setCount(c => c - 1)
  const reset = () => setCount(0)

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>计数器: {count}</h1>
      <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <button onClick={decrement} style={{ padding: '10px 20px', fontSize: '16px' }}>-</button>
        <button onClick={reset} style={{ padding: '10px 20px', fontSize: '16px' }}>重置</button>
        <button onClick={increment} style={{ padding: '10px 20px', fontSize: '16px' }}>+</button>
      </div>
    </div>
  )
}

export default Counter`,
  },
  {
    id: 'react-todo',
    name: '待办事项',
    description: '功能完整的待办事项列表，支持添加/删除/切换状态',
    category: TemplateCategory.Interactive,
    type: 'react',
    icon: '✅',
    tags: ['react', 'todo', 'interactive', 'list'],
    code: `import React, { useState } from 'react'

function TodoApp() {
  const [todos, setTodos] = useState([
    { id: 1, text: '学习 React', completed: false },
    { id: 2, text: '创建组件', completed: false },
  ])
  const [inputValue, setInputValue] = useState('')

  const addTodo = () => {
    if (inputValue.trim()) {
      setTodos([...todos, {
        id: Date.now(),
        text: inputValue,
        completed: false,
      }])
      setInputValue('')
    }
  }

  const toggleTodo = (id) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ))
  }

  const deleteTodo = (id) => {
    setTodos(todos.filter(todo => todo.id !== id))
  }

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '20px' }}>待办事项</h1>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addTodo()}
          placeholder="添加新任务..."
          style={{ flex: 1, padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px' }}
        />
        <button onClick={addTodo} style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          添加
        </button>
      </div>

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {todos.map(todo => (
          <li key={todo.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', padding: '8px', background: '#f9f9f9', borderRadius: '4px' }}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => toggleTodo(todo.id)}
              style={{ cursor: 'pointer' }}
            />
            <span style={{ flex: 1, textDecoration: todo.completed ? 'line-through' : 'none', color: todo.completed ? '#999' : '#333' }}>
              {todo.text}
            </span>
            <button
              onClick={() => deleteTodo(todo.id)}
              style={{ padding: '4px 8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
            >
              删除
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default TodoApp`,
  },

  // Vue 组件模板
  {
    id: 'vue-counter',
    name: '计数器',
    description: 'Vue 3 组合式 API 实现的计数器',
    category: TemplateCategory.Interactive,
    type: 'vue',
    icon: '🔢',
    tags: ['vue', 'counter', 'composition', 'basic'],
    code: `<template>
  <div class="counter">
    <h1>计数器: {{ count }}</h1>
    <div class="buttons">
      <button @click="decrement">-</button>
      <button @click="reset">重置</button>
      <button @click="increment">+</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const count = ref(0)

const increment = () => count.value++
const decrement = () => count.value--
const reset = () => count.value = 0
</script>

<style scoped>
.counter {
  padding: 20px;
  text-align: center;
}

.buttons {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 20px;
}

button {
  padding: 10px 20px;
  font-size: 16px;
}
</style>`,
  },
  {
    id: 'vue-todo',
    name: '待办事项',
    description: 'Vue 3 响应式待办列表，支持本地存储',
    category: TemplateCategory.Interactive,
    type: 'vue',
    icon: '✅',
    tags: ['vue', 'todo', 'interactive', 'storage'],
    code: `<template>
  <div class="todo-app">
    <h1>待办事项</h1>

    <div class="input-group">
      <input
        v-model="newTodo"
        @keyup.enter="addTodo"
        placeholder="添加新任务..."
      />
      <button @click="addTodo">添加</button>
    </div>

    <ul class="todo-list">
      <li v-for="todo in todos" :key="todo.id" :class="{ completed: todo.completed }">
        <input type="checkbox" v-model="todo.completed" @change="saveTodos">
        <span>{{ todo.text }}</span>
        <button @click="removeTodo(todo.id)">删除</button>
      </li>
    </ul>

    <div class="stats">
      {{ todos.length }} 项任务，{{ completedCount }} 项完成
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const newTodo = ref('')
const todos = ref([])

// 从本地存储加载
onMounted(() => {
  const saved = localStorage.getItem('vue-todos')
  if (saved) {
    todos.value = JSON.parse(saved)
  }
})

const completedCount = computed(() => todos.value.filter(t => t.completed).length)

// 保存到本地存储
function saveTodos() {
  localStorage.setItem('vue-todos', JSON.stringify(todos.value))
}

function addTodo() {
  if (newTodo.value.trim()) {
    todos.value.push({
      id: Date.now(),
      text: newTodo.value,
      completed: false,
    })
    newTodo.value = ''
    saveTodos()
  }
}

function removeTodo(id) {
  todos.value = todos.value.filter(t => t.id !== id)
  saveTodos()
}

function toggleTodo(id) {
  const todo = todos.value.find(t => t.id === id)
  if (todo) {
    todo.completed = !todo.completed
    saveTodos()
  }
}
</script>

<style scoped>
.todo-app {
  padding: 20px;
  max-width: 400px;
  margin: 0 auto;
}

.input-group {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.input-group input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.todo-list {
  list-style: none;
  padding: 0;
}

.todo-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  margin-bottom: 8px;
  background: #f9f9f9;
  border-radius: 4px;
}

.todo-list li.completed span {
  text-decoration: line-through;
  color: #999;
}

.stats {
  margin-top: 20px;
  font-size: 14px;
  color: #666;
}
</style>`,
  },

  // 数据可视化模板
  {
    id: 'mermaid-flowchart',
    name: '流程图',
    description: 'Mermaid 流程图示例',
    category: TemplateCategory.Visualization,
    type: 'mermaid',
    icon: '📊',
    tags: ['mermaid', 'flowchart', 'diagram'],
    code: `graph TD
    A[开始] --> B{是否有数据?}
    B -->|是| C[处理数据]
    B -->|否| D[等待数据]
    C --> E[显示结果]
    D --> B
    E --> F[结束]

    style A fill:#90EE90
    style F fill:#FFB6C1
    style C fill:#87CEEB
    style E fill:#DDA0DD`,
  },
  {
    id: 'mermaid-sequence',
    name: '时序图',
    description: 'Mermaid 时序图示例',
    category: TemplateCategory.Visualization,
    type: 'mermaid',
    icon: '🔄',
    tags: ['mermaid', 'sequence', 'diagram'],
    code: `sequenceDiagram
    participant 用户 as User
    participant 系统 as System
    participant 数据库 as DB

    User->>System: 发起请求
    System->>DB: 查询数据
    DB-->>System: 返回结果
    System-->>User: 显示数据`,
  },

  // 表单模板
  {
    id: 'html-form',
    name: '联系表单',
    description: '响应式联系表单，带验证',
    category: TemplateCategory.Form,
    type: 'html',
    icon: '📝',
    tags: ['html', 'form', 'validation'],
    code: `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>联系表单</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .form-container {
      background: white;
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
      width: 100%;
      max-width: 400px;
    }
    h1 {
      text-align: center;
      color: #333;
      margin-bottom: 20px;
    }
    .form-group {
      margin-bottom: 15px;
    }
    label {
      display: block;
      margin-bottom: 5px;
      color: #555;
      font-weight: 500;
    }
    input, textarea {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      transition: border-color 0.2s;
    }
    input:focus, textarea:focus {
      outline: none;
      border-color: #667eea;
    }
    textarea {
      resize: vertical;
      min-height: 100px;
    }
    button {
      width: 100%;
      padding: 12px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
    }
  </style>
</head>
<body>
  <div class="form-container">
    <h1>联系我们</h1>
    <form onsubmit="handleSubmit(event)">
      <div class="form-group">
        <label for="name">姓名</label>
        <input type="text" id="name" name="name" required>
      </div>
      <div class="form-group">
        <label for="email">邮箱</label>
        <input type="email" id="email" name="email" required>
      </div>
      <div class="form-group">
        <label for="message">消息</label>
        <textarea id="message" name="message" required></textarea>
      </div>
      <button type="submit">发送</button>
    </form>
  </div>
  <script>
    function handleSubmit(e) {
      e.preventDefault()
      alert('表单已提交！')
    }
  </script>
</body>
</html>`,
  },
]

/**
 * 根据类型获取模板
 */
export function getTemplatesByType(type: ArtifactType): Template[] {
  return templateLibrary.filter(t => t.type === type)
}

/**
 * 根据分类获取模板
 */
export function getTemplatesByCategory(category: TemplateCategory): Template[] {
  return templateLibrary.filter(t => t.category === category)
}

/**
 * 根据标签搜索模板
 */
export function searchTemplates(query: string): Template[] {
  const lowerQuery = query.toLowerCase()
  return templateLibrary.filter(
    t =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
  )
}

/**
 * 根据 ID 获取模板
 */
export function getTemplateById(id: string): Template | undefined {
  return templateLibrary.find(t => t.id === id)
}

/**
 * 获取所有模板
 */
export function getAllTemplates(): Template[] {
  return [...templateLibrary]
}
