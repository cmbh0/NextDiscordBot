import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'

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

// 保存文件
export async function POST(request: NextRequest) {
  try {
    const { projectId, filename, content } = await request.json()

    if (!projectId || !filename || content === undefined) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      )
    }

    // 安全检查：防止路径遍历
    const sanitizedFilename = path.basename(filename)
    if (sanitizedFilename !== filename || filename.includes('..')) {
      return NextResponse.json(
        { error: '非法文件名' },
        { status: 400 }
      )
    }

    const projectDir = await ensureProjectDir(projectId)
    const filePath = path.join(projectDir, sanitizedFilename)

    await fs.writeFile(filePath, content, 'utf-8')

    return NextResponse.json({
      success: true,
      message: `文件 ${filename} 已保存`
    })

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '保存失败' },
      { status: 500 }
    )
  }
}

// 读取文件或列出文件
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const filename = searchParams.get('filename')

    if (!projectId) {
      return NextResponse.json(
        { error: '缺少项目 ID' },
        { status: 400 }
      )
    }

    const projectDir = await ensureProjectDir(projectId)

    if (filename) {
      // 读取特定文件
      const sanitizedFilename = path.basename(filename)
      const filePath = path.join(projectDir, sanitizedFilename)

      try {
        const content = await fs.readFile(filePath, 'utf-8')
        return NextResponse.json({ content })
      } catch {
        return NextResponse.json(
          { error: '文件不存在' },
          { status: 404 }
        )
      }
    } else {
      // 列出所有文件
      try {
        const files = await fs.readdir(projectDir)
        const fileInfos = await Promise.all(
          files.map(async (file) => {
            const filePath = path.join(projectDir, file)
            const stat = await fs.stat(filePath)
            return {
              name: file,
              isDirectory: stat.isDirectory(),
              size: stat.size,
              modified: stat.mtime
            }
          })
        )
        return NextResponse.json({ files: fileInfos })
      } catch {
        return NextResponse.json({ files: [] })
      }
    }

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '读取失败' },
      { status: 500 }
    )
  }
}

// 删除文件
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const filename = searchParams.get('filename')

    if (!projectId || !filename) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      )
    }

    // 安全检查
    const sanitizedFilename = path.basename(filename)
    if (sanitizedFilename !== filename) {
      return NextResponse.json(
        { error: '非法文件名' },
        { status: 400 }
      )
    }

    // 禁止删除关键文件
    if (['package.json', 'package-lock.json', 'node_modules'].includes(sanitizedFilename)) {
      return NextResponse.json(
        { error: '无法删除系统文件' },
        { status: 403 }
      )
    }

    const projectDir = path.join(PROJECTS_DIR, projectId)
    const filePath = path.join(projectDir, sanitizedFilename)

    await fs.unlink(filePath)

    return NextResponse.json({
      success: true,
      message: `文件 ${filename} 已删除`
    })

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '删除失败' },
      { status: 500 }
    )
  }
}
