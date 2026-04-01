'use client'

import { useState } from 'react'
import { BotProject } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Save, 
  Play, 
  Square, 
  Settings, 
  Code2, 
  Eye, 
  EyeOff,
  Copy,
  Check
} from 'lucide-react'

interface CodeEditorProps {
  project: BotProject
  onSave: (code: string) => void
  onUpdateToken: (token: string) => void
  onUpdateName: (name: string) => void
  onStart: () => void
  onStop: () => void
}

export function CodeEditor({
  project,
  onSave,
  onUpdateToken,
  onUpdateName,
  onStart,
  onStop
}: CodeEditorProps) {
  const [code, setCode] = useState(project.code)
  const [token, setToken] = useState(project.token)
  const [name, setName] = useState(project.name)
  const [showToken, setShowToken] = useState(false)
  const [copied, setCopied] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const handleCodeChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCode(value)
      setHasChanges(value !== project.code)
    }
  }

  const handleSave = () => {
    onSave(code)
    setHasChanges(false)
  }

  const handleSaveSettings = () => {
    if (token !== project.token) {
      onUpdateToken(token)
    }
    if (name !== project.name) {
      onUpdateName(name)
    }
  }

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header - 响应式 */}
      <div className="flex items-center justify-between p-2 md:p-4 border-b border-border bg-card gap-2">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center shrink-0 ${
            project.status === 'running' 
              ? 'bg-emerald-500/15' 
              : 'bg-muted'
          }`}>
            <Code2 className={`w-4 h-4 md:w-5 md:h-5 ${
              project.status === 'running' 
                ? 'text-emerald-600' 
                : 'text-muted-foreground'
            }`} />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-sm md:text-base truncate">{project.name}</h2>
            <p className="text-xs text-muted-foreground">
              {project.status === 'running' ? '运行中' : '已停止'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleCopyCode}
            className="hidden sm:flex h-8 px-2 md:px-3"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 md:mr-1" />
                <span className="hidden md:inline">已复制</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 md:mr-1" />
                <span className="hidden md:inline">复制</span>
              </>
            )}
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges}
            className="h-8 px-2 md:px-3"
          >
            <Save className="w-4 h-4 md:mr-1" />
            <span className="hidden sm:inline">保存</span>
            {hasChanges && <span className="ml-1 w-2 h-2 rounded-full bg-primary" />}
          </Button>
          
          {project.status === 'running' ? (
            <Button variant="destructive" size="sm" onClick={onStop} className="h-8 px-2 md:px-3">
              <Square className="w-4 h-4 md:mr-1" />
              <span className="hidden sm:inline">停止</span>
            </Button>
          ) : (
            <Button size="sm" onClick={onStart} disabled={!project.token} className="h-8 px-2 md:px-3">
              <Play className="w-4 h-4 md:mr-1" />
              <span className="hidden sm:inline">运行</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs - 响应式 */}
      <Tabs defaultValue="code" className="flex-1 flex flex-col">
        <div className="border-b border-border bg-muted/30">
          <TabsList className="h-auto p-0 bg-transparent rounded-none">
            <TabsTrigger 
              value="code" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 md:px-4 py-2 text-sm"
            >
              <Code2 className="w-4 h-4 mr-1.5 md:mr-2" />
              代码
            </TabsTrigger>
            <TabsTrigger 
              value="settings"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 md:px-4 py-2 text-sm"
            >
              <Settings className="w-4 h-4 mr-1.5 md:mr-2" />
              设置
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="code" className="flex-1 m-0 p-4 overflow-hidden flex flex-col">
          <div className="mb-3">
            <label className="text-xs text-gray-500 mb-2 block">示例代码（你可以复制使用）</label>
            <pre className="p-3 bg-gray-100 rounded border border-gray-200 text-xs font-mono overflow-x-auto max-h-32 text-gray-700">
{`const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({ 
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] 
});

client.on('ready', () => {
  console.log('✅ 机器人已上线');
});

client.on('messageCreate', (msg) => {
  if (msg.author.bot) return;
  if (msg.content === '!ping') {
    msg.reply('Pong!');
  }
});

client.login(process.env.TOKEN);`}
            </pre>
          </div>
          
          <label className="text-xs text-gray-500 mb-2 block">编辑你的代码</label>
          <textarea
            value={code}
            onChange={(e) => {
              setCode(e.target.value)
              setHasChanges(e.target.value !== project.code)
            }}
            placeholder="在这里粘贴或编写你的 JavaScript 代码..."
            className="flex-1 p-3 border border-gray-300 rounded font-mono text-xs md:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            spellCheck="false"
          />
        </TabsContent>

        <TabsContent value="settings" className="flex-1 m-0 p-4 md:p-6 overflow-auto">
          <div className="max-w-lg space-y-4 md:space-y-6">
            <div className="space-y-2">
              <Label htmlFor="project-name">项目名称</Label>
              <Input
                id="project-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="输入项目名称"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bot-token">Bot Token</Label>
              <div className="relative">
                <Input
                  id="bot-token"
                  type={showToken ? 'text' : 'password'}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="粘贴你的 Discord Bot Token"
                  className="pr-10 font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                从 Discord Developer Portal 获取你的 Bot Token
              </p>
            </div>

            <div className="pt-4 border-t border-border">
              <Button onClick={handleSaveSettings}>
                <Save className="w-4 h-4 mr-2" />
                保存设置
              </Button>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <h3 className="font-medium text-sm">快速指南</h3>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>1. 前往 Discord Developer Portal 创建应用</li>
                <li>2. 在 Bot 页面获取 Token 并粘贴到上方</li>
                <li>3. 开启所需的 Intents（如 Message Content）</li>
                <li>4. 使用 OAuth2 URL 邀请机器人到服务器</li>
                <li>5. 编写代码后点击运行按钮启动机器人</li>
              </ul>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
