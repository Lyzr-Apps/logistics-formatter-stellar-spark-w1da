'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { FiTruck, FiClock, FiPackage } from 'react-icons/fi'

import ShipmentParser from './sections/ShipmentParser'
import ShipmentHistory from './sections/ShipmentHistory'

const AGENT_ID = '69a25285f5bf13678ddc892a'
const STORAGE_KEY = 'shipmentsync_history'

interface Shipment {
  reference_number?: string
  pickup_location?: string
  delivery_location?: string
  pickup_datetime?: string
  delivery_datetime?: string
  cargo_description?: string
  weight_dimensions?: string
  vehicle_type?: string
  shipper_contact?: string
  receiver_contact?: string
  notes?: string
  missing_fields?: string[]
}

interface ParsedResult {
  shipments: Shipment[]
  total_shipments_found?: number
  summary?: string
}

interface HistoryEntry {
  id: string
  timestamp: string
  rawMessage: string
  shipments: Shipment[]
  summary?: string
  total_shipments_found?: number
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

type Screen = 'parser' | 'history'

export default function Page() {
  const [screen, setScreen] = useState<Screen>('parser')
  const [useSample, setUseSample] = useState(false)
  const [rawMessage, setRawMessage] = useState('')
  const [parsedResult, setParsedResult] = useState<ParsedResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setHistory(parsed)
        }
      }
    } catch {
      // ignore
    }
  }, [])

  const saveHistory = useCallback((entries: HistoryEntry[]) => {
    setHistory(entries)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
    } catch {
      // ignore
    }
  }, [])

  const showStatus = (msg: string) => {
    setStatusMessage(msg)
    setTimeout(() => setStatusMessage(''), 3000)
  }

  const handleParse = async () => {
    if (!rawMessage.trim()) {
      setError('Please paste a shipment message before parsing.')
      return
    }
    setError(null)
    setLoading(true)
    setParsedResult(null)
    setActiveAgentId(AGENT_ID)

    try {
      const result = await callAIAgent(rawMessage, AGENT_ID)
      if (result.success) {
        let parsed = result?.response?.result
        if (typeof parsed === 'string') {
          try {
            parsed = JSON.parse(parsed)
          } catch {
            // fallback
          }
        }
        const shipments = Array.isArray(parsed?.shipments) ? parsed.shipments : []
        if (shipments.length === 0) {
          setError('Could not extract any shipments from this message. Try a different format.')
        } else {
          setParsedResult({
            shipments,
            total_shipments_found: parsed?.total_shipments_found ?? shipments.length,
            summary: parsed?.summary ?? '',
          })
        }
      } else {
        setError(result?.error ?? 'Failed to process the message. Please try again.')
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
      setActiveAgentId(null)
    }
  }

  const handleClear = () => {
    setRawMessage('')
    setParsedResult(null)
    setError(null)
    setStatusMessage('')
  }

  const handleAddToHistory = () => {
    if (!parsedResult) return
    const shipments = Array.isArray(parsedResult?.shipments) ? parsedResult.shipments : []
    if (shipments.length === 0) return
    const entry: HistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date().toISOString(),
      rawMessage,
      shipments,
      summary: parsedResult?.summary,
      total_shipments_found: parsedResult?.total_shipments_found,
    }
    saveHistory([entry, ...history])
    showStatus('Saved to history')
  }

  const handleDeleteEntry = (id: string) => {
    saveHistory(history.filter((e) => e.id !== id))
  }

  const handleClearHistory = () => {
    saveHistory([])
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background text-foreground font-sans" style={{ letterSpacing: '-0.01em', lineHeight: '1.55' }}>
        <div className="flex min-h-screen" style={{ background: 'linear-gradient(135deg, hsl(210 20% 97%) 0%, hsl(220 25% 95%) 35%, hsl(200 20% 96%) 70%, hsl(230 15% 97%) 100%)' }}>
          {/* Sidebar */}
          <aside className="w-64 flex-shrink-0 border-r border-border bg-card/80 backdrop-blur-xl flex flex-col">
            <div className="p-6 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                  <FiTruck className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-base font-semibold tracking-tight text-foreground">ShipmentSync</h1>
                  <p className="text-[11px] text-muted-foreground font-medium">Logistics Message Standardizer</p>
                </div>
              </div>
            </div>
            <Separator className="mx-4" />
            <nav className="flex-1 px-3 py-4 space-y-1">
              <Button
                variant={screen === 'parser' ? 'secondary' : 'ghost'}
                className={cn('w-full justify-start gap-2.5 h-10 font-medium text-sm', screen === 'parser' && 'bg-accent text-accent-foreground')}
                onClick={() => setScreen('parser')}
              >
                <FiPackage className="w-4 h-4" />
                Shipment Parser
              </Button>
              <Button
                variant={screen === 'history' ? 'secondary' : 'ghost'}
                className={cn('w-full justify-start gap-2.5 h-10 font-medium text-sm', screen === 'history' && 'bg-accent text-accent-foreground')}
                onClick={() => setScreen('history')}
              >
                <FiClock className="w-4 h-4" />
                Shipment History
                {history.length > 0 && (
                  <Badge variant="secondary" className="ml-auto text-[10px] h-5 px-1.5 font-mono">{history.length}</Badge>
                )}
              </Button>
            </nav>
            <Separator className="mx-4" />
            {/* Agent Status */}
            <div className="p-4 space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Agent Status</p>
              <div className="flex items-center gap-2">
                <div className={cn('w-2 h-2 rounded-full flex-shrink-0', activeAgentId ? 'bg-orange-500 animate-pulse' : 'bg-emerald-500')} />
                <span className="text-xs text-foreground">Shipment Parser</span>
                <Badge variant="outline" className="ml-auto text-[9px] h-4 px-1 font-mono">{activeAgentId ? 'Active' : 'Idle'}</Badge>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 flex flex-col min-w-0">
            {/* Header */}
            <header className="h-14 border-b border-border bg-card/60 backdrop-blur-md flex items-center justify-between px-6 flex-shrink-0">
              <div>
                <h2 className="text-sm font-semibold tracking-tight">
                  {screen === 'parser' ? 'Shipment Parser' : 'Shipment History'}
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground font-medium">Sample Data</span>
                <Switch
                  checked={useSample}
                  onCheckedChange={setUseSample}
                  aria-label="Toggle sample data"
                />
              </div>
            </header>

            {/* Screen Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {screen === 'parser' && (
                <ShipmentParser
                  rawMessage={rawMessage}
                  setRawMessage={setRawMessage}
                  parsedResult={parsedResult}
                  loading={loading}
                  error={error}
                  onParse={handleParse}
                  onClear={handleClear}
                  onAddToHistory={handleAddToHistory}
                  statusMessage={statusMessage}
                  useSample={useSample}
                />
              )}
              {screen === 'history' && (
                <ShipmentHistory
                  history={history}
                  onDeleteEntry={handleDeleteEntry}
                  onClearHistory={handleClearHistory}
                  onNavigateToParser={() => setScreen('parser')}
                />
              )}
            </div>
          </main>
        </div>
      </div>
    </ErrorBoundary>
  )
}
