"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { BotProject, LogEntry } from '@/lib/types'
import { ProjectList } from '@/components/project-list'
import { CodeEditor } from '@/components/code-editor'
import { Terminal } from '@/components/terminal'
import { LogViewer } from '@/components/log-viewer'
import { CreateProjectDialog } from '@/components/create-project-dialog'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getAuthToken } from '@/lib/store'

// API 请求 helper，自动添加 token
const apiRequest = async (url: string, options: RequestInit = {}) => {
  const token = getAuthToken()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }
  
  // 对于 GET 请求，也在 URL 中添加 token
  let finalUrl = url
  if (token && !url.includes('token=')) {
    finalUrl = url.includes('?') ? `${url}&token=${token}` : `${url}?token=${token}`
  }
  
  return fetch(finalUrl, { ...options, headers })
}
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { 
  Bot, 
  LogOut, 
  Menu,
  Terminal as TerminalIcon,
  FileCode,
  ScrollText,
  Loader2,
  FolderOpen
} from 'lucide-react'

interface DashboardProps {
  onLogout: () => void
}

export function Dashboard({ onLogout }: DashboardProps) {
  const [projects, setProjects] = useState<BotProject[]>([])
  const [activeProject, setActiveProject] = useState<BotProject | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mobileTab, setMobileTab] = useState<'code' | 'terminal' | 'logs'>('code')
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  // 从服务器加载项目数据
  const loadProjects = useCallback(async () => {
    try {
      const response = await apiRequest('/api/projects')
      const data = await response.json()
      if (data.projects) {
        setProjects(data.projects)
        return data.projects
      }
    } catch (error) {
      console.error('[v0] 加载项目失败:', error)
    }
    return []
  }, [])

  // 加载项目日志
  const loadLogs = useCallback(async (projectId: string) => {
    try {
      const response = await apiRequest(`/api/logs?projectId=${projectId}`)
      const data = await response.json()
      if (data.logs) {
        setLogs(data.logs)
      }
    } catch (error) {
      console.error('[v0] 加载日志失败:', error)
    }
  }, [])

  // 添加日志
  const addLog = async (projectId: string, type: 'info' | 'success' | 'warn' | 'error', message: string) => {
    try {
      await apiRequest('/api/logs', {
        method: 'POST',
        body: JSON.stringify({ projectId, type, message })
      })
    } catch {}
  }

  // 初始化加载
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      const loadedProjects = await loadProjects()
      
      // 检查运行中的机器人状态
      try {
        const statusRes = await apiRequest('/api/bot?action=list')
        const statusData = await statusRes.json()
        const runningIds = statusData.running || []
        
        if (runningIds.length > 0) {
          const updatedProjects = loadedProjects.map((p: BotProject) => ({
            ...p,
            status: runningIds.includes(p.id) ? 'running' : p.status
          }))
          setProjects(updatedProjects)
        }
      } catch {}
      
      if (loadedProjects.length > 0) {
        setActiveProject(loadedProjects[0])
        await loadLogs(loadedProjects[0].id)
      }
      setLoading(false)
    }
    init()
  }, [loadProjects, loadLogs])

  // 切换项目时加载日志
  useEffect(() => {
    if (activeProject) {
      loadLogs(activeProject.id)
    }
  }, [activeProject?.id, loadLogs])

  // 创建项目
  const handleCreateProject = async (name: string, token: string, code: string) => {
    try {
      const response = await apiRequest('/api/projects', {
        method: 'POST',
        body: JSON.stringify({ name, token, code })
      })
      const data = await response.json()
      
      if (data.project) {
        await loadProjects()
        setActiveProject(data.project)
        await loadLogs(data.project.id)
        setSidebarOpen(false)
      }
    } catch (error) {
      console.error('[v0] 创建项目失败:', error)
    }
  }

  // 选择项目
  const handleSelectProject = async (project: BotProject) => {
    setActiveProject(project)
    await loadLogs(project.id)
    setSidebarOpen(false)
  }

  // 删除项目
  const handleDeleteProject = (id: string) => {
    setProjectToDelete(id)
    setShowDeleteDialog(true)
  }

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return
    
    try {
      await apiRequest('/api/bot', {
        method: 'POST',
        body: JSON.stringify({ action: 'stop', projectId: projectToDelete })
      })
      
      await apiRequest(`/api/projects?id=${projectToDelete}`, { method: 'DELETE' })
      
      const loadedProjects = await loadProjects()
      
      if (activeProject?.id === projectToDelete) {
        if (loadedProjects.length > 0) {
          setActiveProject(loadedProjects[0])
          await loadLogs(loadedProjects[0].id)
        } else {
          setActiveProject(null)
          setLogs([])
        }
      }
    } catch (error) {
      console.error('删除项目失败:', error)
    }
    
    setProjectToDelete(null)
    setShowDeleteDialog(false)
  }

  // 更新项目
  const updateProjectOnServer = async (id: string, updates: Partial<BotProject>) => {
    try {
      const response = await apiRequest('/api/projects', {
        method: 'PUT',
        body: JSON.stringify({ id, ...updates })
      })
      const data = await response.json()
      
      if (data.project) {
        await loadProjects()
        if (activeProject?.id === id) {
          setActiveProject(data.project)
        }
        return data.project
      }
    } catch (error) {
      console.error('更新项目失败:', error)
    }
    return null
  }

  // 保存代码
  const handleSaveCode = async (code: string) => {
    if (!activeProject) return
    await updateProjectOnServer(activeProject.id, { code })
    await addLog(activeProject.id, 'info', '代码已保存')
    await loadLogs(activeProject.id)
  }

  // 更新 Token
  const handleUpdateToken = async (token: string) => {
    if (!activeProject) return
    await updateProjectOnServer(activeProject.id, { token })
    await addLog(activeProject.id, 'info', 'Token 已更新')
    await loadLogs(activeProject.id)
  }

  // 更新项目名称
  const handleUpdateName = async (name: string) => {
    if (!activeProject) return
    await updateProjectOnServer(activeProject.id, { name })
    await addLog(activeProject.id, 'info', `项目名称已更新为 "${name}"`)
    await loadLogs(activeProject.id)
  }

  // 启动项目
  const handleStartProject = async (id: string) => {
    const project = projects.find(p => p.id === id)
    if (!project) return
    
    if (!project.token) {
      await addLog(id, 'error', '无法启动: 请先配置 Bot Token')
      await loadLogs(id)
      return
    }
    
    await addLog(id, 'info', '正��启动机器人...')
    await loadLogs(id)
    
    try {
      const response = await apiRequest('/api/bot', {
        method: 'POST',
        body: JSON.stringify({
          action: 'start',
          projectId: id,
          code: project.code,
          token: project.token
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        await addLog(id, 'error', data.error || '启动失败')
        await updateProjectOnServer(id, { status: 'error' })
        await loadLogs(id)
        return
      }
      
      await updateProjectOnServer(id, { status: 'running' })
      await addLog(id, 'success', `机器人已启动 (PID: ${data.pid})`)
      await loadLogs(id)
      
      startLogPolling(id)
      
    } catch (error) {
      await addLog(id, 'error', `启动错误: ${error instanceof Error ? error.message : '未知错误'}`)
      await updateProjectOnServer(id, { status: 'error' })
      await loadLogs(id)
    }
  }

  // 停止项目
  const handleStopProject = async (id: string) => {
    await addLog(id, 'info', '正在停止机器人...')
    await loadLogs(id)
    
    if (pollingRef.current) {
      clearTimeout(pollingRef.current)
      pollingRef.current = null
    }
    
    try {
      const response = await apiRequest('/api/bot', {
        method: 'POST',
        body: JSON.stringify({ action: 'stop', projectId: id })
      })
      
      await response.json()
      await updateProjectOnServer(id, { status: 'stopped' })
      await loadLogs(id)
      
    } catch (error) {
      await addLog(id, 'error', `停止错误: ${error instanceof Error ? error.message : '未知错误'}`)
      await loadLogs(id)
    }
  }
  
  // 轮询获取机器人日志
  const startLogPolling = (projectId: string) => {
    const pollLogs = async () => {
      try {
        const response = await apiRequest(`/api/bot?projectId=${projectId}`)
        const data = await response.json()
        
        await loadLogs(projectId)
        
        const projectsRes = await apiRequest('/api/projects')
        const projectsData = await projectsRes.json()
        const currentProject = projectsData.projects?.find((p: BotProject) => p.id === projectId)
        
        if (currentProject?.status === 'running' && data.running) {
          pollingRef.current = setTimeout(pollLogs, 3000)
        }
      } catch {}
    }
    
    pollingRef.current = setTimeout(pollLogs, 2000)
  }

  // 清除日志
  const handleClearLogs = async () => {
    if (!activeProject) return
    try {
      await apiRequest(`/api/logs?projectId=${activeProject.id}`, { method: 'DELETE' })
      setLogs([])
    } catch {}
  }

  // 执行终端命令
  const handleExecuteCommand = async (command: string): Promise<string> => {
    if (!activeProject) return '错误: 没有选中的项目'
    
    await addLog(activeProject.id, 'info', `执行命令: ${command}`)
    await loadLogs(activeProject.id)
    
    try {
      const response = await apiRequest('/api/execute', {
        method: 'POST',
        body: JSON.stringify({
          command,
          projectId: activeProject.id
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        await addLog(activeProject.id, 'error', data.error || '命令执行失败')
        await loadLogs(activeProject.id)
        return data.error || '命令执行失败'
      }
      
      await addLog(activeProject.id, 'success', '命令执行完成')
      await loadLogs(activeProject.id)
      return data.output || '命令执行完成'
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '网络错误'
      await addLog(activeProject.id, 'error', errorMsg)
      await loadLogs(activeProject.id)
      return errorMsg
    }
  }

  // 清理轮询
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearTimeout(pollingRef.current)
      }
    }
  }, [])

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
  }

  // 侧边栏内容
  const SidebarContent = (
    <ProjectList
      projects={projects}
      activeProjectId={activeProject?.id || null}
      onSelectProject={handleSelectProject}
      onCreateProject={() => setShowCreateDialog(true)}
      onDeleteProject={handleDeleteProject}
      onStartProject={handleStartProject}
      onStopProject={handleStopProject}
    />
  )

  // 空状态
  const EmptyState = (
    <div className="h-full flex flex-col items-center justify-center text-center p-8">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Bot className="w-8 h-8 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold mb-2">开始创建机器人</h2>
      <p className="text-sm text-muted-foreground mb-4 max-w-xs">
        创建项目，编写代码，配置 Token，一键运行
      </p>
      <Button onClick={() => setShowCreateDialog(true)} size="sm">
        创建新项目
      </Button>
    </div>
  )

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-12 md:h-14 border-b border-border flex items-center justify-between px-3 md:px-4 bg-card shrink-0">
        <div className="flex items-center gap-2 md:gap-3">
          {/* 移动端菜单 */}
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden">
                <Menu className="w-4 h-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetTitle className="sr-only">项目列表</SheetTitle>
              <SheetDescription className="sr-only">管理你的 Discord 机器人项目</SheetDescription>
              <div className="h-full">
                {SidebarContent}
              </div>
            </SheetContent>
          </Sheet>
          
          <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bot className="w-4 h-4 md:w-5 md:h-5 text-primary" />
          </div>
          <h1 className="font-semibold text-sm md:text-base">DC Bot Studio</h1>
        </div>
        
        <div className="flex items-center gap-1 md:gap-2">
          {activeProject && (
            <span className="text-xs text-muted-foreground hidden sm:block truncate max-w-32">
              {activeProject.name}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="h-8 px-2 md:px-3"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline ml-2">退出</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* 桌面端侧边栏 */}
        <aside className="hidden md:flex w-64 lg:w-72 border-r border-border shrink-0">
          {SidebarContent}
        </aside>

        {/* 主内容区 */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {activeProject ? (
            <>
              {/* 移动端 Tab 切换 */}
              <div className="md:hidden border-b border-border">
                <Tabs value={mobileTab} onValueChange={(v) => setMobileTab(v as typeof mobileTab)}>
                  <TabsList className="w-full justify-start rounded-none h-10 bg-transparent border-0 p-0">
                    <TabsTrigger 
                      value="code" 
                      className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent h-10"
                    >
                      <FileCode className="w-4 h-4 mr-1.5" />
                      代码
                    </TabsTrigger>
                    <TabsTrigger 
                      value="terminal"
                      className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent h-10"
                    >
                      <TerminalIcon className="w-4 h-4 mr-1.5" />
                      终端
                    </TabsTrigger>
                    <TabsTrigger 
                      value="logs"
                      className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent h-10"
                    >
                      <ScrollText className="w-4 h-4 mr-1.5" />
                      日志
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* 移动端内容 */}
              <div className="flex-1 overflow-hidden md:hidden">
                {mobileTab === 'code' && (
                  <CodeEditor
                    key={activeProject.id}
                    project={activeProject}
                    onSave={handleSaveCode}
                    onUpdateToken={handleUpdateToken}
                    onUpdateName={handleUpdateName}
                    onStart={() => handleStartProject(activeProject.id)}
                    onStop={() => handleStopProject(activeProject.id)}
                  />
                )}
                {mobileTab === 'terminal' && (
                  <Terminal
                    projectId={activeProject.id}
                    isRunning={activeProject.status === 'running'}
                    onExecuteCommand={handleExecuteCommand}
                  />
                )}
                {mobileTab === 'logs' && (
                  <LogViewer
                    logs={logs}
                    projectName={activeProject.name}
                    onClearLogs={handleClearLogs}
                  />
                )}
              </div>

              {/* 桌面端布局 */}
              <div className="hidden md:flex flex-1 overflow-hidden">
                {/* 代码编辑器 */}
                <div className="flex-1 border-r border-border">
                  <CodeEditor
                    key={activeProject.id}
                    project={activeProject}
                    onSave={handleSaveCode}
                    onUpdateToken={handleUpdateToken}
                    onUpdateName={handleUpdateName}
                    onStart={() => handleStartProject(activeProject.id)}
                    onStop={() => handleStopProject(activeProject.id)}
                  />
                </div>
                
                {/* 终端和日志 */}
                <div className="w-80 lg:w-96 flex flex-col">
                  <div className="flex-1 border-b border-border overflow-hidden">
                    <Terminal
                      projectId={activeProject.id}
                      isRunning={activeProject.status === 'running'}
                      onExecuteCommand={handleExecuteCommand}
                    />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <LogViewer
                      logs={logs}
                      projectName={activeProject.name}
                      onClearLogs={handleClearLogs}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* 移动端空状态 */}
              <div className="flex-1 md:hidden">
                {EmptyState}
              </div>
              
              {/* 桌面端空状态 */}
              <div className="hidden md:flex flex-1 items-center justify-center">
                <div className="text-center p-8 max-w-md">
                  <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-6 mx-auto">
                    <FolderOpen className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <h2 className="text-xl font-semibold mb-2">开始创建你的机器人</h2>
                  <p className="text-muted-foreground mb-6">
                    创建一个新项目，编写代码，配置 Token，然后一键运行你的 Discord 机器人
                  </p>
                  <Button onClick={() => setShowCreateDialog(true)}>
                    创建新项目
                  </Button>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* Create Project Dialog */}
      <CreateProjectDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreateProject={handleCreateProject}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="max-w-sm mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除项目？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。项目的所有代码和配置都将被永久删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteProject}>
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
