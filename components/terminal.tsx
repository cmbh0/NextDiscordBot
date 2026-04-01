"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Terminal as TerminalIcon, Send, Trash2, Copy, Check } from 'lucide-react'

interface TerminalEntry {
  id: string
  type: 'input' | 'output' | 'error' | 'system'
  content: string
  timestamp: number
}

interface TerminalProps {
  projectId: string
  isRunning: boolean
  onExecuteCommand: (command: string) => Promise<string>
}

export function Terminal({ projectId, isRunning, onExecuteCommand }: TerminalProps) {
  const [entries, setEntries] = useState<TerminalEntry[]>([
    {
      id: '1',
      type: 'system',
      content: '欢迎使用 DC Bot Studio 终端\n输入 help 查看可用命令',
      timestamp: Date.now()
    }
  ])
  const [command, setCommand] = useState('')
  const [isExecuting, setIsExecuting] = useState(false)
  const [copied, setCopied] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [entries])

  const addEntry = (type: TerminalEntry['type'], content: string) => {
    setEntries(prev => [...prev, {
      id: Date.now().toString(),
      type,
      content,
      timestamp: Date.now()
    }])
  }

  const handleSubmit = async () => {
    if (!command.trim() || isExecuting) return

    const cmd = command.trim()
    setCommand('')
    setIsExecuting(true)

    addEntry('input', `$ ${cmd}`)

    try {
      const output = await onExecuteCommand(cmd)
      if (output) {
        addEntry('output', output)
      }
    } catch (error) {
      addEntry('error', `执行错误: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setIsExecuting(false)
      textareaRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const clearTerminal = () => {
    setEntries([{
      id: Date.now().toString(),
      type: 'system',
      content: '终端已清空',
      timestamp: Date.now()
    }])
  }

  const copyAllOutput = async () => {
    const text = entries.map(e => e.content).join('\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getEntryStyle = (type: TerminalEntry['type']) => {
    switch (type) {
      case 'input':
        return 'text-blue-600 font-medium'
      case 'output':
        return 'text-gray-700'
      case 'error':
        return 'text-red-600'
      case 'system':
        return 'text-amber-600 italic'
      default:
        return 'text-gray-700'
    }
  }

  // Generate selectable text content
  const outputText = entries.map(e => e.content).join('\n\n')

  return (
    <div className="h-full flex flex-col bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">终端</span>
          {isRunning && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              运行中
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-gray-500 hover:text-gray-700"
            onClick={copyAllOutput}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-gray-500 hover:text-red-600"
            onClick={clearTerminal}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Terminal Output - Using Textarea for text selection */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-auto p-4 bg-gray-50/50"
      >
        <Textarea
          readOnly
          value={outputText}
          className="w-full h-full min-h-[200px] font-mono text-sm bg-transparent border-0 resize-none focus-visible:ring-0 p-0 text-gray-700 selection:bg-blue-100"
          style={{ 
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}
        />
        {isExecuting && (
          <div className="flex items-center gap-2 text-gray-500 mt-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-sm">执行中...</span>
          </div>
        )}
      </div>

      {/* Command Input */}
      <div className="p-3 bg-white border-t border-gray-200">
        <div className="flex items-start gap-2">
          <span className="text-blue-600 font-mono text-sm mt-2 select-none">$</span>
          <Textarea
            ref={textareaRef}
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入命令..."
            disabled={isExecuting}
            className="flex-1 min-h-[40px] max-h-[100px] bg-gray-50 border-gray-200 focus-visible:ring-1 focus-visible:ring-blue-500 font-mono text-sm resize-none"
            rows={1}
          />
          <Button
            onClick={handleSubmit}
            size="sm"
            className="h-10 px-3 shrink-0"
            disabled={!command.trim() || isExecuting}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-2 pl-5">按 Enter 发送，Shift+Enter 换行</p>
      </div>
    </div>
  )
}
