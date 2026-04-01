export interface BotProject {
  id: string
  name: string
  token: string
  code: string
  status: 'stopped' | 'running' | 'error'
  createdAt: number
  updatedAt: number
}

export interface LogEntry {
  id: string
  projectId: string
  timestamp: number
  type: 'info' | 'error' | 'warn' | 'success'
  message: string
}

export interface TerminalCommand {
  id: string
  command: string
  output: string
  timestamp: number
  status: 'success' | 'error'
}

export interface AppState {
  isAuthenticated: boolean
  projects: BotProject[]
  logs: Record<string, LogEntry[]>
  activeProjectId: string | null
}

export const DEFAULT_BOT_CODE = `// Discord.js 机器人示例代码
const { Client, GatewayIntentBits, Events } = require('discord.js');

// 创建客户端实例
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

// 机器人上线时触发
client.once(Events.ClientReady, (readyClient) => {
  console.log(\`机器人已上线! 登录为 \${readyClient.user.tag}\`);
});

// 监听消息
client.on(Events.MessageCreate, async (message) => {
  // 忽略机器人自己的消息
  if (message.author.bot) return;
  
  // 简单的命令响应
  if (message.content === '!ping') {
    await message.reply('Pong! 🏓');
  }
  
  if (message.content === '!hello') {
    await message.reply(\`你好, \${message.author.username}! 👋\`);
  }
});

// 使用环境变量中的 Token 登录
client.login(process.env.BOT_TOKEN);
`
