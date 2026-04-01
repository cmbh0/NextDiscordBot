import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), '.bot-data')
const LOGS_DIR = path.join(DATA_DIR, 'logs')

async function ensureDirectories() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.mkdir(LOGS_DIR, { recursive: true })
  } catch {}
}

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

async function saveLogs(projectId: string, logs: any[]) {
  await ensureDirectories()
  const logFile = path.join(LOGS_DIR, `${projectId}.json`)
  const trimmedLogs = logs.slice(-500)
  await fs.writeFile(logFile, JSON.stringify(trimmedLogs, null, 2))
}

// GET - 获取日志
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')
  
  if (!projectId) {
    return NextResponse.json({ error: '项目ID不能为空' }, { status: 400 })
  }
  
  try {
    const logs = await readLogs(projectId)
    return NextResponse.json({ logs })
  } catch {
    return NextResponse.json({ logs: [] })
  }
}

// POST - 添加日志
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, type, message } = body
    
    if (!projectId || !message) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 })
    }
    
    const logs = await readLogs(projectId)
    
    const newLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
      type: type || 'info',
      message
    }
    
    logs.push(newLog)
    await saveLogs(projectId, logs)
    
    return NextResponse.json({ log: newLog })
  } catch {
    return NextResponse.json({ error: '添加日志失败' }, { status: 500 })
  }
}

// DELETE - 清空日志
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')
  
  if (!projectId) {
    return NextResponse.json({ error: '项目ID不能为空' }, { status: 400 })
  }
  
  try {
    await saveLogs(projectId, [])
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: '清空日志失败' }, { status: 500 })
  }
}
