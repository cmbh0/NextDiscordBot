import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs/promises'

const execAsync = promisify(exec)

// 项目存储目录
const PROJECTS_DIR = path.join(process.cwd(), '.bot-projects')

// 确保项目目录存在
async function ensureProjectDir(projectId: string) {
  const projectDir = path.join(PROJECTS_DIR, projectId)
  try {
    await fs.access(projectDir)
  } catch {
    await fs.mkdir(projectDir, { recursive: true })
    // 初始化 package.json
    const packageJson = {
      name: `bot-project-${projectId}`,
      version: '1.0.0',
      type: 'commonjs',
      dependencies: {}
    }
    await fs.writeFile(
      path.join(projectDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    )
  }
  return projectDir
}

// 所有命令均允许执行（个人使用，无需限制）

export async function POST(request: NextRequest) {
  try {
    const { command, projectId } = await request.json()

    if (!command || !projectId) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      )
    }

    // 确保项目目录存在
    const projectDir = await ensureProjectDir(projectId)

    // 特殊处理 clear 和 help 命令
    if (command.trim() === 'clear') {
      return NextResponse.json({ output: '', success: true })
    }

    if (command.trim() === 'help') {
      return NextResponse.json({
        output: `DC Bot Studio - 终端
支持执行任意系统命令，包括:
  npm/pnpm install <package>  - 安装依赖包
  node <file.js>              - 运行 JavaScript 文件
  python <file.py>            - 运行 Python 脚本
  npm start/dev               - 启动项目
  npm run build               - 构建项目
  git clone/pull/push         - Git 操作
  以及任何其他系统命令...

此终端无任何命令限制，充分自由。`,
        success: true
      })
    }

    // 执行命令
    const { stdout, stderr } = await execAsync(command, {
      cwd: projectDir,
      timeout: 60000, // 60秒超时
      maxBuffer: 1024 * 1024, // 1MB buffer
      env: {
        ...process.env,
        PATH: process.env.PATH,
        NODE_ENV: 'development'
      }
    })

    const output = stdout || stderr || '命令执行完成'
    
    return NextResponse.json({
      output: output.trim(),
      success: !stderr || stderr.includes('npm WARN')
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '执行失败'
    
    // 尝试从 stderr 获取有用信息
    if (error && typeof error === 'object' && 'stderr' in error) {
      return NextResponse.json({
        output: String(error.stderr) || errorMessage,
        success: false
      })
    }
    
    return NextResponse.json({
      output: errorMessage,
      success: false
    })
  }
}
