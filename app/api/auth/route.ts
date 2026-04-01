import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'

const DATA_DIR = path.join(process.cwd(), '.bot-data')
const AUTH_FILE = path.join(DATA_DIR, 'auth.json')
const CORRECT_PASSWORD = 'admin123'
const TOKEN_VALIDITY = 30 * 24 * 60 * 60 * 1000 // 30天

interface AuthData {
  tokens: Record<string, { createdAt: number; expiresAt: number }>
}

// 确保目录存在
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
  } catch (error) {
    // 目录可能已存在
  }
}

// 读取认证数据
async function readAuthData(): Promise<AuthData> {
  try {
    await ensureDataDir()
    const data = await fs.readFile(AUTH_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return { tokens: {} }
  }
}

// 写入认证数据
async function writeAuthData(data: AuthData) {
  await ensureDataDir()
  await fs.writeFile(AUTH_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

// 生成 token
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// 登录处理
export async function POST(request: NextRequest) {
  try {
    const { action, password, token } = await request.json()

    if (action === 'login') {
      if (password !== CORRECT_PASSWORD) {
        return NextResponse.json(
          { error: '密码错误' },
          { status: 401 }
        )
      }

      const newToken = generateToken()
      const authData = await readAuthData()
      const now = Date.now()
      
      authData.tokens[newToken] = {
        createdAt: now,
        expiresAt: now + TOKEN_VALIDITY
      }

      await writeAuthData(authData)

      return NextResponse.json({
        success: true,
        token: newToken,
        expiresAt: now + TOKEN_VALIDITY
      })
    }

    if (action === 'verify') {
      if (!token) {
        return NextResponse.json(
          { valid: false },
          { status: 401 }
        )
      }

      const authData = await readAuthData()
      const tokenData = authData.tokens[token]

      if (!tokenData || tokenData.expiresAt < Date.now()) {
        return NextResponse.json({ valid: false })
      }

      return NextResponse.json({ valid: true })
    }

    if (action === 'logout') {
      if (token) {
        const authData = await readAuthData()
        delete authData.tokens[token]
        await writeAuthData(authData)
      }
      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      { error: '无效的操作' },
      { status: 400 }
    )

  } catch (error) {
    console.error('认证错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
