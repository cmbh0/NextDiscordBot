# 贡献指南

感谢您有兴趣为 DC Bot Studio 贡献代码！我们欢迎所有形式的贡献，包括但不限于：

- 🐛 Bug 修复
- ✨ 新功能
- 📚 文档改进
- 🎨 UI/UX 优化
- 🔧 性能优化

## 🚀 快速开始

### 环境设置

1. **Fork 仓库**
   ```bash
   # Fork 本项目到您的 GitHub 账户
   ```

2. **克隆仓库**
   ```bash
   git clone https://github.com/your-username/dc-bot-studio.git
   cd dc-bot-studio
   ```

3. **安装依赖**
   ```bash
   pnpm install
   ```

4. **启动开发服务器**
   ```bash
   pnpm dev
   ```

### 开发流程

1. **创建分支**
   ```bash
   git checkout -b feature/your-feature-name
   # 或者
   git checkout -b fix/issue-description
   ```

2. **进行更改**
   - 编写代码
   - 添加测试（如果适用）
   - 更新文档

3. **提交更改**
   ```bash
   git add .
   git commit -m "feat: 添加新功能描述"
   ```

4. **推送到分支**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **创建 Pull Request**

## 📝 提交规范

我们使用约定式提交格式，请遵循以下格式：

```
<类型>[可选的作用域]: <描述>

[可选的正文]

[可选的脚注]
```

### 类型

- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式调整（不影响功能）
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

### 示例

```
feat: 添加实时日志监控功能

- 实现 WebSocket 连接
- 添加日志级别过滤
- 优化日志显示性能

Closes #123
```

## 🎯 开发指南

### 代码规范

- 使用 TypeScript 进行类型检查
- 遵循 ESLint 规则
- 使用 Prettier 进行代码格式化
- 组件使用 PascalCase 命名
- 函数使用 camelCase 命名

### 组件开发

- 使用 React 19+ 和 Hooks
- 优先使用函数组件
- 合理使用 TypeScript 类型定义
- 遵循 Radix UI 设计模式

### 样式规范

- 使用 Tailwind CSS 进行样式编写
- 遵循响应式设计原则
- 使用 CSS 变量进行主题管理

## 🐛 报告问题

如果您发现了 bug 或有功能建议，请通过 GitHub Issues 报告：

1. 检查是否已有相关 issue
2. 创建新 issue
3. 提供详细的描述和复现步骤
4. 如果是 bug，请提供环境信息

## 💬 社区交流

加入我们的 Discord 社区与其他开发者交流：

[![Discord](https://img.shields.io/discord/WCZmdYQs?color=7289DA&label=Discord%20社区&logo=discord&logoColor=white)](https://discord.gg/WCZmdYQs)

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者！您的每一份贡献都让这个项目变得更好。

---

**有任何问题？欢迎在 Discord 社区提问或通过 Issues 联系我们！**