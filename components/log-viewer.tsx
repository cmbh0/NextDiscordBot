'use client'

import { useState, useRef, useEffect } from 'react'
import { LogEntry } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { 
  ChevronDown,
  Trash2, 
  Download,
  Copy,
  Check
} from 'lucide-react'

interface LogViewerProps {
  logs: LogEntry[]
  projectName: string
  onClearLogs: () => void
}

export function LogViewer({ logs, projectName, onClearLogs }: LogViewerProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [copied, setCopied] = useState(false)
  const scrollRef = useRef<HTMLTextAreaElement>(null)

  // 自动滚到底部
  useEffect(() => {
    if (scrollRef.current && isExpanded) {
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
      }, 0)
    }
  }, [logs, isExpanded])

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'error':
        return 'text-red-600'
      case 'success':
        return 'text-green-600'
      case 'warn':
        return 'text-amber-600'
      default:
        return 'text-blue-600'
    }
  }

  const getLogBgColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'error':
        return 'bg-red-50'
      case 'success':
        return 'bg-green-50'
      case 'warn':
        return 'bg-amber-50'
      default:
        return 'bg-blue-50'
    }
  }

  // 生成可复制的日志文本
  const logsText = logs
    .map(log => `[${new Date(log.timestamp).toLocaleTimeString()}] [${log.type.toUpperCase()}] ${log.message}`)
    .join('\n')

  const errorCount = logs.filter(l => l.type === 'error').length
  const successCount = logs.filter(l => l.type === 'success').length
  const warnCount = logs.filter(l => l.type === 'warn').length

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(logsText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleDownloadLogs = () => {
    const element = document.createElement('a')
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(logsText))
    element.setAttribute('download', `${projectName}-logs-${new Date().toISOString().split('T')[0]}.txt`)
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-200">
      {/* 日志头部 - 可折叠 */}
      <div
        className="flex items-center justify-between p-3 md:p-4 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
          <ChevronDown
            className={`w-5 h-5 text-gray-600 shrink-0 transition-transform ${
              isExpanded ? '' : '-rotate-90'
            }`}
          />
          <div className="min-w-0">
            <h3 className="font-semibold text-sm md:text-base">运行日志</h3>
            <p className="text-xs text-gray-500">
              共 {logs.length} 条
              {errorCount > 0 && ` · 错误 ${errorCount}`}
              {warnCount > 0 && ` · 警告 ${warnCount}`}
              {successCount > 0 && ` · 成功 ${successCount}`}
            </p>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-1 md:gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyLogs}
            disabled={logs.length === 0}
            className="h-7 w-7 md:h-8 md:w-8 p-0"
            title="复制日志"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownloadLogs}
            disabled={logs.length === 0}
            className="h-7 w-7 md:h-8 md:w-8 p-0 hidden sm:flex"
            title="下载日志"
          >
            <Download className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearLogs}
            disabled={logs.length === 0}
            className="h-7 w-7 md:h-8 md:w-8 p-0"
            title="清空日志"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 日志内容 - 展开时显示 */}
      {isExpanded && (
        <div className="flex-1 overflow-hidden flex flex-col p-3 md:p-4 gap-2">
          {logs.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-center text-gray-400">
              <div>
                <p className="text-sm">暂无日志</p>
                <p className="text-xs mt-1">运行机器人后日志会显示在这里</p>
              </div>
            </div>
          ) : (
            <textarea
              ref={scrollRef}
              value={logsText}
              readOnly
              className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded font-mono text-xs md:text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 overflow-auto"
              style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
            />
          )}
        </div>
      )}
    </div>
  )
}
