export default {
  description: '创建一个标准的列表管理页面（已修复UI问题）',
  prompts: [
    {
      type: 'input',
      name: 'componentName',
      message: '请输入页面组件名称（英文）:',
      validate: (value) => {
        if (!value) {
          return '组件名称不能为空'
        }
        return true
      },
    },
    {
      type: 'input',
      name: 'title',
      message: '请输入页面标题（中文）:',
      default: '{{ title }}列表',
    },
    {
      type: 'confirm',
      name: 'hasQueryFields',
      message: '是否需要自定义查询字段?',
      default: false,
    },
  ],
  actions: (data) => {
    const actions = [
      {
        type: 'add',
        path: 'src/views/{{camelCase componentName}}/index.vue',
        templateFile: 'plop-templates/list-page/index.hbs',
        data: {
          ...data,
          queryFields: data.hasQueryFields
            ? [
                { name: 'keyword', label: '关键词', placeholder: '请输入关键词' },
              ]
            : [
                { name: 'keyword', label: '关键词', placeholder: '请输入关键词' },
              ],
          tableColumns: [
            { prop: 'id', label: 'ID', width: '80', align: 'center' },
            { prop: 'name', label: '名称', width: '200' },
            { prop: 'status', label: '状态', width: '100', align: 'center' },
            { prop: 'createdAt', label: '创建时间', width: '180', align: 'center' },
          ],
        },
      },
    ]

    return actions
  },
}
