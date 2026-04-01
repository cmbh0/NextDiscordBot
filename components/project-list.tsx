"use client"

import { BotProject } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Plus, 
  Bot, 
  MoreVertical, 
  Play, 
  Square, 
  Trash2, 
  Clock,
  Code2
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface ProjectListProps {
  projects: BotProject[]
  activeProjectId: string | null
  onSelectProject: (project: BotProject) => void
  onCreateProject: () => void
  onDeleteProject: (id: string) => void
  onStartProject: (id: string) => void
  onStopProject: (id: string) => void
}

export function ProjectList({
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  onStartProject,
  onStopProject
}: ProjectListProps) {
  const getStatusBadge = (status: BotProject['status']) => {
    switch (status) {
      case 'running':
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">运行中</Badge>
      case 'error':
        return <Badge variant="destructive" className="text-[10px]">错误</Badge>
      case 'stopped':
      default:
        return <Badge variant="secondary" className="text-[10px]">已停止</Badge>
    }
  }

  return (
    <div className="h-full flex flex-col bg-card">
      <div className="flex items-center justify-between p-3 md:p-4 border-b border-border">
        <h2 className="font-semibold text-base">项目</h2>
        <Button size="sm" onClick={onCreateProject} className="h-8">
          <Plus className="w-4 h-4 mr-1" />
          新建
        </Button>
      </div>
      
      <div className="flex-1 overflow-auto p-3 space-y-2">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
              <Bot className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-3">还没有项目</p>
            <Button onClick={onCreateProject} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              创建项目
            </Button>
          </div>
        ) : (
          projects.map((project) => (
            <div 
              key={project.id}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                activeProjectId === project.id 
                  ? 'border-primary bg-primary/5 shadow-sm' 
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
              onClick={() => onSelectProject(project)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    project.status === 'running' 
                      ? 'bg-emerald-100' 
                      : 'bg-muted'
                  }`}>
                    <Code2 className={`w-4 h-4 ${
                      project.status === 'running' 
                        ? 'text-emerald-600' 
                        : 'text-muted-foreground'
                    }`} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium text-sm truncate">{project.name}</h3>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(project.updatedAt, { 
                        addSuffix: true, 
                        locale: zhCN 
                      })}
                    </p>
                  </div>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {project.status === 'running' ? (
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation()
                        onStopProject(project.id)
                      }}>
                        <Square className="w-4 h-4 mr-2" />
                        停止
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation()
                        onStartProject(project.id)
                      }}>
                        <Play className="w-4 h-4 mr-2" />
                        启动
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-destructive focus:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteProject(project.id)
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      删除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                {getStatusBadge(project.status)}
                <span className="text-[10px] text-muted-foreground">
                  {project.token ? 'Token 已配置' : 'Token 未配置'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
