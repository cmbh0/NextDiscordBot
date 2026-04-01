import { NextRequest, NextResponse } from 'next/server'
import { spawn, ChildProcess, exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs/promises'

const execAsync = promisify(exec)

// 全局进程存储 - 使用 global 确保在热重载时保持状态
declare global {
  var botProcesses: Map<string, ChildProcess> | undefined
  var botLogs: Map<string, string[]> | undefined
}

// 初始化全局存储
if (!global.botProcesses) {
  global.botProcesses = new Map()
}
if (!global.botLogs) {
  global.botLogs = new Map()
}

const runningBots = global.botProcesses
const botLogs = global.botLogs

// 数据目录
const DATA_DIR = path.join(process.cwd(), '.bot-data')
const PROJECTS_DIR = path.join(DATA_DIR, 'projects')
const LOGS_DIR = path.join(DATA_DIR, 'logs')

// 确保目录存在
async function ensureDirectories() {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.mkdir(PROJECTS_DIR, { recursive: true })
  await fs.mkdir(LOGS_DIR, { recursive: true })
}

// 确保项目目录存在
async function ensureProjectDir(projectId: string) {
  await ensureDirectories()
  const projectDir = path.join(PROJECTS_DIR, projectId)
  await fs.mkdir(projectDir, { recursive: true })
  return projectDir
}

// 追加日志到文件
async function appendLogToFile(projectId: string, type: string, message: string) {
  await ensureDirectories()
  const logFile = path.join(LOGS_DIR, `${projectId}.json`)
  
  try {
    let logs: any[] = []
    try {
      const data = await fs.readFile(logFile, 'utf-8')
      logs = JSON.parse(data)
    } catch {}
    
    logs.push({
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
      type,
      message
    })
    
    // 只保留最近500条
    if (logs.length > 500) {
      logs = logs.slice(-500)
    }
    
    await fs.writeFile(logFile, JSON.stringify(logs, null, 2))
  } catch (error) {
    console.error('写入日志失败:', error)
  }
}

// 更新项目状态
async function updateProjectStatus(projectId: string, status: string) {
  const projectsFile = path.join(DATA_DIR, 'projects.json')
  try {
    const data = await fs.readFile(projectsFile, 'utf-8')
    const projects = JSON.parse(data)
    const index = projects.findIndex((p: any) => p.id === projectId)
    if (index !== -1) {
      projects[index].status = status
      projects[index].updatedAt = new Date().toISOString()
      await fs.writeFile(projectsFile, JSON.stringify(projects, null, 2))
    }
  } catch {}
}

// POST - 启动/停止机器人
export async function POST(request: NextRequest) {
  try {
    const { action, projectId, code, token } = await request.json()

    if (!projectId) {
      return NextResponse.json({ error: '缺少项目 ID' }, { status: 400 })
    }

    if (action === 'start') {
      // 检查是否已在运行
      if (runningBots.has(projectId)) {
        return NextResponse.json({ error: '机器人已在运行中' }, { status: 400 })
      }

      if (!code || !token) {
        return NextResponse.json({ error: '缺少代码或 Token' }, { status: 400 })
      }

      // 准备项目目录
      const projectDir = await ensureProjectDir(projectId)
      
      // 保存代码
      await fs.writeFile(path.join(projectDir, 'index.js'), code, 'utf-8')
      
      // 创建 .env 文件
      await fs.writeFile(path.join(projectDir, '.env'), `BOT_TOKEN=${token}`, 'utf-8')
      
      // 创建 package.json
      const packageJson = {
        name: `bot-${projectId}`,
        version: '1.0.0',
        main: 'index.js',
        dependencies: {
          'discord.js': '^14.14.1',
          'dotenv': '^16.3.1'
        }
      }
      await fs.writeFile(
        path.join(projectDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      )

      await appendLogToFile(projectId, 'info', '正在准备项目环境...')

      // 检查是否需要安装依赖
      const nodeModulesPath = path.join(projectDir, 'node_modules', 'discord.js')
      let needsInstall = false
      try {
        await fs.access(nodeModulesPath)
      } catch {
        needsInstall = true
      }

      if (needsInstall) {
        await appendLogToFile(projectId, 'info', '正在安装依赖 (discord.js, dotenv)...')
        try {
          await execAsync('npm install --production', { 
            cwd: projectDir,
            timeout: 120000 // 2分钟超时
          })
          await appendLogToFile(projectId, 'success', '依赖安装完成')
        } catch (installError: any) {
          await appendLogToFile(projectId, 'error', `依赖安装失败: ${installError.message}`)
          return NextResponse.json({
            error: '安装依赖失败',
            details: installError.message
          }, { status: 500 })
        }
      }

      // 初始化内存日志
      botLogs.set(projectId, [])
      const logs = botLogs.get(projectId)!

      await appendLogToFile(projectId, 'info', '正在启动机器人进程...')

      // 启动机器人进程
      const botProcess = spawn('node', ['-r', 'dotenv/config', 'index.js'], {
        cwd: projectDir,
        env: {
          ...process.env,
          BOT_TOKEN: token,
          NODE_ENV: 'production'
        },
        detached: false,
        stdio: ['pipe', 'pipe', 'pipe']
      })

      // 捕获 stdout
      botProcess.stdout?.on('data', (data) => {
        const msg = data.toString().trim()
        if (msg) {
          logs.push(`[INFO] ${msg}`)
          if (logs.length > 200) logs.shift()
          appendLogToFile(projectId, 'info', msg)
        }
      })

      // 捕获 stderr
      botProcess.stderr?.on('data', (data) => {
        const msg = data.toString().trim()
        if (msg) {
          logs.push(`[ERROR] ${msg}`)
          if (logs.length > 200) logs.shift()
          appendLogToFile(projectId, 'error', msg)
        }
      })

      // 进程错误
      botProcess.on('error', (error) => {
        logs.push(`[ERROR] 进程错误: ${error.message}`)
        appendLogToFile(projectId, 'error', `进程错误: ${error.message}`)
        runningBots.delete(projectId)
        updateProjectStatus(projectId, 'error')
      })

      // 进程退出
      botProcess.on('exit', (code, signal) => {
        const exitMsg = `进程退出 (代码: ${code}, 信号: ${signal})`
        logs.push(`[INFO] ${exitMsg}`)
        appendLogToFile(projectId, 'warn', exitMsg)
        runningBots.delete(projectId)
        updateProjectStatus(projectId, 'stopped')
      })

      runningBots.set(projectId, botProcess)
      await updateProjectStatus(projectId, 'running')

      return NextResponse.json({
        success: true,
        message: '机器人已启动',
        pid: botProcess.pid
      })

    } else if (action === 'stop') {
      const botProcess = runningBots.get(projectId)
      
      if (!botProcess) {
        await updateProjectStatus(projectId, 'stopped')
        return NextResponse.json({ success: true, message: '机器人未在运行' })
      }

      // 优雅关闭
      botProcess.kill('SIGTERM')
      
      // 等待一秒后强制关闭
      setTimeout(() => {
        if (runningBots.has(projectId)) {
          try {
            botProcess.kill('SIGKILL')
          } catch {}
          runningBots.delete(projectId)
        }
      }, 1000)

      runningBots.delete(projectId)
      await appendLogToFile(projectId, 'warn', '机器人已停止')
      await updateProjectStatus(projectId, 'stopped')

      return NextResponse.json({
        success: true,
        message: '机器人已停止'
      })

    } else if (action === 'restart') {
      // 先停止
      const existingProcess = runningBots.get(projectId)
      if (existingProcess) {
        existingProcess.kill('SIGTERM')
        runningBots.delete(projectId)
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      
      // 重新发送启动请求
      return NextResponse.json({
        success: true,
        message: '请重新发送启动请求'
      })

    } else {
      return NextResponse.json({ error: '未知操作' }, { status: 400 })
    }

  } catch (error) {
    console.error('Bot API Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '服务器错误' },
      { status: 500 }
    )
  }
}

// GET - 获取机器人状态和日志
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')
  const action = searchParams.get('action')

  if (action === 'list') {
    // 返回所有运行中的机器人
    const running = Array.from(runningBots.keys())
    return NextResponse.json({ running })
  }

  if (!projectId) {
    const running = Array.from(runningBots.keys())
    return NextResponse.json({ running })
  }

  const isRunning = runningBots.has(projectId)
  const memoryLogs = botLogs.get(projectId) || []

  return NextResponse.json({
    running: isRunning,
    logs: memoryLogs.slice(-50),
    pid: isRunning ? runningBots.get(projectId)?.pid : null
  })
}
