import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), '.bot-data')
const AUTH_FILE = path.join(DATA_DIR, 'auth.json')

interface AuthData {
  tokens: Record<string, { createdAt: number; expiresAt: number }>
}

// 读取认证数据
async function readAuthData(): Promise<AuthData> {
  try {
    const data = await fs.readFile(AUTH_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return { tokens: {} }
  }
}

// 验证 token
export async function verifyToken(token: string | null): Promise<boolean> {
  if (!token) return false

  try {
    const authData = await readAuthData()
    const tokenData = authData.tokens[token]

    if (!tokenData || tokenData.expiresAt < Date.now()) {
      return false
    }

    return true
  } catch (error) {
    console.error('[v0] Token 验证失败:', error)
    return false
  }
}

// 从请求头提取 token
export function getTokenFromRequest(request: NextRequest): string | null {
  // 尝试从 Authorization header 获取
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }

  // 尝试从查询参数获取
  const token = request.nextUrl.searchParams.get('token')
  if (token) {
    return token
  }

  return null
}

// 创建认证错误响应
export function createAuthError(message: string = '未授权') {
  return NextResponse.json(
    { error: message },
    { status: 401 }
  )
}
