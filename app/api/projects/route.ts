import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'
import { verifyToken, getTokenFromRequest, createAuthError } from '@/lib/auth-middleware'

// 数据存储目录
const DATA_DIR = path.join(process.cwd(), '.bot-data')
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json')
const LOGS_DIR = path.join(DATA_DIR, 'logs')

// 确保目录存在
async function ensureDirectories() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.mkdir(LOGS_DIR, { recursive: true })
  } catch (error) {
    // 目录已存在
  }
}

// 读取项目数据
async function readProjects(): Promise<any[]> {
  await ensureDirectories()
  try {
    const data = await fs.readFile(PROJECTS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

// 保存项目数据
async function saveProjects(projects: any[]) {
  await ensureDirectories()
  await fs.writeFile(PROJECTS_FILE, JSON.stringify(projects, null, 2))
}

// 读取日志
async function readLogs(projectId: string): Promise<any[]> {
  await ensureDirectories()
  const logFile = path.join(LOGS_DIR, `${projectId}.json`)
  try {
    const data = await fs.readFile(logFile, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

// 保存日志
async function saveLogs(projectId: string, logs: any[]) {
  await ensureDirectories()
  const logFile = path.join(LOGS_DIR, `${projectId}.json`)
  // 只保留最近500条日志
  const trimmedLogs = logs.slice(-500)
  await fs.writeFile(logFile, JSON.stringify(trimmedLogs, null, 2))
}

// GET - 获取所有项目或单个项目
export async function GET(request: NextRequest) {
  // 验证 token
  const token = getTokenFromRequest(request)
  const isValid = await verifyToken(token)
  if (!isValid) {
    return createAuthError()
  }

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('id')
  const logsOnly = searchParams.get('logs')
  
  try {
    if (logsOnly && projectId) {
      const logs = await readLogs(projectId)
      return NextResponse.json({ logs })
    }
    
    const projects = await readProjects()
    
    if (projectId) {
      const project = projects.find(p => p.id === projectId)
      if (!project) {
        return NextResponse.json({ error: '项目不存在' }, { status: 404 })
      }
      return NextResponse.json({ project })
    }
    
    return NextResponse.json({ projects })
  } catch (error) {
    return NextResponse.json({ error: '读取数据失败' }, { status: 500 })
  }
}

// POST - 创建项目
export async function POST(request: NextRequest) {
  // 验证 token
  const authToken = getTokenFromRequest(request)
  const isValid = await verifyToken(authToken)
  if (!isValid) {
    return createAuthError()
  }

  try {
    const body = await request.json()
    const { name, token, code } = body
    
    if (!name) {
      return NextResponse.json({ error: '项目名称不能为空' }, { status: 400 })
    }
    
    const projects = await readProjects()
    
    const newProject = {
      id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      token: token || '',
      code: code || `// ${name} - Discord Bot
const { Client, GatewayIntentBits, Events } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

client.once(Events.ClientReady, (c) => {
  console.log(\`机器人已上线! 登录为 \${c.user.tag}\`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  
  if (message.content === '!ping') {
    await message.reply('Pong! 🏓');
  }
  
  if (message.content === '!hello') {
    await message.reply(\`你好, \${message.author.username}!\`);
  }
});

// 使用环境变量中的 Token
client.login(process.env.BOT_TOKEN);
`,
      status: 'stopped',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    projects.push(newProject)
    await saveProjects(projects)
    
    // 初始化日志
    await saveLogs(newProject.id, [{
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'info',
      message: '项目已创建'
    }])
    
    return NextResponse.json({ project: newProject })
  } catch (error) {
    return NextResponse.json({ error: '创建项目失败' }, { status: 500 })
  }
}

// PUT - 更新项目
export async function PUT(request: NextRequest) {
  // 验证 token
  const token = getTokenFromRequest(request)
  const isValid = await verifyToken(token)
  if (!isValid) {
    return createAuthError()
  }

  try {
    const body = await request.json()
    const { id, ...updates } = body
    
    if (!id) {
      return NextResponse.json({ error: '项目ID不能为空' }, { status: 400 })
    }
    
    const projects = await readProjects()
    const index = projects.findIndex(p => p.id === id)
    
    if (index === -1) {
      return NextResponse.json({ error: '项目不存在' }, { status: 404 })
    }
    
    projects[index] = {
      ...projects[index],
      ...updates,
      updatedAt: new Date().toISOString()
    }
    
    await saveProjects(projects)
    
    return NextResponse.json({ project: projects[index] })
  } catch (error) {
    return NextResponse.json({ error: '更新项目失败' }, { status: 500 })
  }
}

// DELETE - 删除项目
export async function DELETE(request: NextRequest) {
  // 验证 token
  const token = getTokenFromRequest(request)
  const isValid = await verifyToken(token)
  if (!isValid) {
    return createAuthError()
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  
  if (!id) {
    return NextResponse.json({ error: '项目ID不能为空' }, { status: 400 })
  }
  
  try {
    const projects = await readProjects()
    const filtered = projects.filter(p => p.id !== id)
    
    if (filtered.length === projects.length) {
      return NextResponse.json({ error: '项目不存在' }, { status: 404 })
    }
    
    await saveProjects(filtered)
    
    // 删除日志文件
    try {
      await fs.unlink(path.join(LOGS_DIR, `${id}.json`))
    } catch {
      // 日志文件可能不存在
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: '删除项目失败' }, { status: 500 })
  }
}
