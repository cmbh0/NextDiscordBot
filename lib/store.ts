"use client"

import { BotProject, LogEntry } from './types'
import { v4 as uuidv4 } from 'uuid'

const STORAGE_KEY = 'dc-bot-studio-data'
const AUTH_KEY = 'dc-bot-studio-auth'
const TOKEN_KEY = 'dc-bot-studio-token'
const TOKEN_EXPIRES_KEY = 'dc-bot-studio-token-expires'

export interface StoredData {
  projects: BotProject[]
  logs: Record<string, LogEntry[]>
}

// 获取存储数据
export function getStoredData(): StoredData {
  if (typeof window === 'undefined') {
    return { projects: [], logs: {} }
  }
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) {
      return JSON.parse(data)
    }
  } catch (e) {
    console.error('读取存储数据失败:', e)
  }
  return { projects: [], logs: {} }
}

// 保存存储数据
export function saveStoredData(data: StoredData): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (e) {
    console.error('保存存储数据失败:', e)
  }
}

// 获取保存的 token
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  const token = localStorage.getItem(TOKEN_KEY)
  const expiresAt = localStorage.getItem(TOKEN_EXPIRES_KEY)
  
  if (!token || !expiresAt) return null
  
  // 检查是否过期
  if (Date.now() > parseInt(expiresAt)) {
    removeAuthToken()
    return null
  }
  
  return token
}

// 设置 token
export function setAuthToken(token: string, expiresAt: number): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(TOKEN_EXPIRES_KEY, expiresAt.toString())
}

// 移除 token
export function removeAuthToken(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(TOKEN_EXPIRES_KEY)
}

// 检查认证状态（兼容旧方式）
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  return getAuthToken() !== null || localStorage.getItem(AUTH_KEY) === 'true'
}

// 设置认证状态（兼容旧方式）
export function setAuthenticated(value: boolean): void {
  if (typeof window === 'undefined') return
  if (value) {
    localStorage.setItem(AUTH_KEY, 'true')
  } else {
    removeAuthToken()
    localStorage.removeItem(AUTH_KEY)
  }
}

// 创建新项目
export function createProject(name: string, token: string = '', code: string): BotProject {
  const project: BotProject = {
    id: uuidv4(),
    name,
    token,
    code,
    status: 'stopped',
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
  
  const data = getStoredData()
  data.projects.push(project)
  data.logs[project.id] = []
  saveStoredData(data)
  
  return project
}

// 更新项目
export function updateProject(id: string, updates: Partial<BotProject>): BotProject | null {
  const data = getStoredData()
  const index = data.projects.findIndex(p => p.id === id)
  if (index === -1) return null
  
  data.projects[index] = {
    ...data.projects[index],
    ...updates,
    updatedAt: Date.now()
  }
  saveStoredData(data)
  
  return data.projects[index]
}

// 删除项目
export function deleteProject(id: string): boolean {
  const data = getStoredData()
  const index = data.projects.findIndex(p => p.id === id)
  if (index === -1) return false
  
  data.projects.splice(index, 1)
  delete data.logs[id]
  saveStoredData(data)
  
  return true
}

// 添加日志
export function addLog(projectId: string, type: LogEntry['type'], message: string): LogEntry {
  const log: LogEntry = {
    id: uuidv4(),
    projectId,
    timestamp: Date.now(),
    type,
    message
  }
  
  const data = getStoredData()
  if (!data.logs[projectId]) {
    data.logs[projectId] = []
  }
  data.logs[projectId].push(log)
  
  // 只保留最近 500 条日志
  if (data.logs[projectId].length > 500) {
    data.logs[projectId] = data.logs[projectId].slice(-500)
  }
  
  saveStoredData(data)
  return log
}

// 清除项目日志
export function clearLogs(projectId: string): void {
  const data = getStoredData()
  data.logs[projectId] = []
  saveStoredData(data)
}

// 获取项目日志
export function getProjectLogs(projectId: string): LogEntry[] {
  const data = getStoredData()
  return data.logs[projectId] || []
}
