'use client'

import { useState, useEffect } from 'react'
import { LoginScreen } from '@/components/login-screen'
import { Dashboard } from '@/components/dashboard'
import { getAuthToken, removeAuthToken } from '@/lib/store'

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 检查本地 token 和服务器验证
    const checkAuth = async () => {
      const token = getAuthToken()
      if (!token) {
        setIsLoggedIn(false)
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'verify',
            token
          })
        })

        const data = await response.json()
        if (data.valid) {
          setIsLoggedIn(true)
        } else {
          removeAuthToken()
          setIsLoggedIn(false)
        }
      } catch (error) {
        console.error('[v0] 认证验证失败:', error)
        setIsLoggedIn(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const handleLogin = () => {
    setIsLoggedIn(true)
  }

  const handleLogout = async () => {
    const token = getAuthToken()
    if (token) {
      try {
        await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'logout',
            token
          })
        })
      } catch (error) {
        console.error('[v0] 登出失败:', error)
      }
    }
    removeAuthToken()
    setIsLoggedIn(false)
  }

  // 加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
  }

  // 未登录显示登录页面
  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />
  }

  // 已登录显示主面板
  return <Dashboard onLogout={handleLogout} />
}
