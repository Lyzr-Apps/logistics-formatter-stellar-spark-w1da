'use client'

import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { FiSearch, FiChevronDown, FiChevronUp, FiTrash2, FiAlertTriangle, FiClock, FiPackage, FiTruck } from 'react-icons/fi'
import { cn } from '@/lib/utils'

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

interface HistoryEntry {
  id: string
  timestamp: string
  rawMessage: string
  shipments: Shipment[]
  summary?: string
  total_shipments_found?: number
}

interface ShipmentHistoryProps {
  history: HistoryEntry[]
  onDeleteEntry: (id: string) => void
  onClearHistory: () => void
  onNavigateToParser: () => void
}

type SortField = 'timestamp' | 'reference_number' | 'pickup_location' | 'delivery_location'
type SortDir = 'asc' | 'desc'
type FilterStatus = 'all' | 'complete' | 'incomplete'

const PAGE_SIZE = 10

export default function ShipmentHistory({
  history,
  onDeleteEntry,
  onClearHistory,
  onNavigateToParser,
}: ShipmentHistoryProps) {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [sortField, setSortField] = useState<SortField>('timestamp')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [page, setPage] = useState(0)

  const safeHistory = Array.isArray(history) ? history : []

  const flatEntries = useMemo(() => {
    return safeHistory.map((entry) => {
      const shipments = Array.isArray(entry?.shipments) ? entry.shipments : []
      const hasIncomplete = shipments.some((s) => {
        const mf = Array.isArray(s?.missing_fields) ? s.missing_fields : []
        return mf.length > 0
      })
      return { ...entry, shipments, isComplete: !hasIncomplete }
    })
  }, [safeHistory])

  const filtered = useMemo(() => {
    let result = flatEntries

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((entry) => {
        const matchRaw = entry.rawMessage?.toLowerCase().includes(q)
        const matchShipment = entry.shipments.some(
          (s) =>
            s?.reference_number?.toLowerCase().includes(q) ||
            s?.pickup_location?.toLowerCase().includes(q) ||
            s?.delivery_location?.toLowerCase().includes(q) ||
            s?.cargo_description?.toLowerCase().includes(q) ||
            s?.shipper_contact?.toLowerCase().includes(q) ||
            s?.receiver_contact?.toLowerCase().includes(q)
        )
        return matchRaw || matchShipment
      })
    }

    if (filterStatus === 'complete') {
      result = result.filter((e) => e.isComplete)
    } else if (filterStatus === 'incomplete') {
      result = result.filter((e) => !e.isComplete)
    }

    result = [...result].sort((a, b) => {
      let valA = ''
      let valB = ''
      if (sortField === 'timestamp') {
        valA = a.timestamp ?? ''
        valB = b.timestamp ?? ''
      } else {
        valA = a.shipments[0]?.[sortField] ?? ''
        valB = b.shipments[0]?.[sortField] ?? ''
      }
      const cmp = valA.localeCompare(valB)
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [flatEntries, search, filterStatus, sortField, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
    setPage(0)
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDir === 'asc' ? <FiChevronUp className="w-3 h-3 inline ml-0.5" /> : <FiChevronDown className="w-3 h-3 inline ml-0.5" />
  }

  if (safeHistory.length === 0) {
    return (
      <Card className="bg-card backdrop-blur-md border border-border shadow-md border-dashed">
        <CardContent className="py-20 text-center">
          <FiClock className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold text-foreground/80 mb-1">No shipments parsed yet</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Go to Parser to get started. Parsed shipments will appear here once you save them.
          </p>
          <Button onClick={onNavigateToParser} variant="outline">
            <FiTruck className="w-4 h-4 mr-2" />
            Go to Parser
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="bg-card backdrop-blur-md border border-border shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold tracking-tight flex items-center gap-2">
              <FiClock className="w-5 h-5 text-primary" />
              Shipment History
              <Badge variant="secondary" className="font-mono text-xs ml-1">{safeHistory.length} records</Badge>
            </CardTitle>
            <Button variant="outline" size="sm" onClick={onClearHistory} className="gap-1.5 text-xs text-destructive hover:text-destructive">
              <FiTrash2 className="w-3.5 h-3.5" /> Clear All
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search across all fields..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0) }}
                className="pl-9 bg-background"
              />
            </div>
            <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v as FilterStatus); setPage(0) }}>
              <SelectTrigger className="w-[160px] bg-background">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="complete">Complete</SelectItem>
                <SelectItem value="incomplete">Incomplete</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="w-full">
            <div className="min-w-[900px]">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="w-[40px]" />
                    <TableHead className="text-xs font-semibold cursor-pointer hover:text-foreground" onClick={() => handleSort('timestamp')}>
                      Date <SortIcon field="timestamp" />
                    </TableHead>
                    <TableHead className="text-xs font-semibold cursor-pointer hover:text-foreground" onClick={() => handleSort('reference_number')}>
                      Ref # <SortIcon field="reference_number" />
                    </TableHead>
                    <TableHead className="text-xs font-semibold cursor-pointer hover:text-foreground" onClick={() => handleSort('pickup_location')}>
                      Pickup <SortIcon field="pickup_location" />
                    </TableHead>
                    <TableHead className="text-xs font-semibold cursor-pointer hover:text-foreground" onClick={() => handleSort('delivery_location')}>
                      Delivery <SortIcon field="delivery_location" />
                    </TableHead>
                    <TableHead className="text-xs font-semibold">Cargo</TableHead>
                    <TableHead className="text-xs font-semibold">Vehicle</TableHead>
                    <TableHead className="text-xs font-semibold w-[80px]">Status</TableHead>
                    <TableHead className="text-xs font-semibold w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((entry) => {
                    const isExpanded = expandedId === entry.id
                    const firstShipment = entry.shipments[0]
                    const shipmentCount = entry.shipments.length
                    return (
                      <React.Fragment key={entry.id}>
                        <TableRow
                          className={cn('border-border cursor-pointer hover:bg-accent/50 transition-colors', isExpanded && 'bg-accent/30')}
                          onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                        >
                          <TableCell className="text-center">
                            {isExpanded ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">
                            {entry.timestamp ? new Date(entry.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                          </TableCell>
                          <TableCell className="font-mono text-xs font-medium">
                            {firstShipment?.reference_number ?? '-'}
                            {shipmentCount > 1 && <Badge variant="secondary" className="ml-1 text-[10px]">+{shipmentCount - 1}</Badge>}
                          </TableCell>
                          <TableCell className="text-xs">{firstShipment?.pickup_location ?? '-'}</TableCell>
                          <TableCell className="text-xs">{firstShipment?.delivery_location ?? '-'}</TableCell>
                          <TableCell className="text-xs">{firstShipment?.cargo_description ?? '-'}</TableCell>
                          <TableCell className="text-xs">{firstShipment?.vehicle_type ?? '-'}</TableCell>
                          <TableCell>
                            {entry.isComplete ? (
                              <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200">Complete</Badge>
                            ) : (
                              <Badge variant="destructive" className="text-[10px] gap-0.5">
                                <FiAlertTriangle className="w-2.5 h-2.5" /> Gaps
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); onDeleteEntry(entry.id) }}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            >
                              <FiTrash2 className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow className="border-border bg-accent/20 hover:bg-accent/20">
                            <TableCell colSpan={9} className="p-4">
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div>
                                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Original Message</h4>
                                  <div className="bg-background rounded-lg border border-border p-3 max-h-48 overflow-y-auto">
                                    <pre className="text-xs font-mono whitespace-pre-wrap text-foreground/80 leading-relaxed">{entry.rawMessage ?? 'N/A'}</pre>
                                  </div>
                                </div>
                                <div>
                                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Parsed Details ({shipmentCount} shipment{shipmentCount !== 1 ? 's' : ''})</h4>
                                  <div className="space-y-3">
                                    {entry.shipments.map((s, si) => {
                                      const mf = Array.isArray(s?.missing_fields) ? s.missing_fields : []
                                      return (
                                        <div key={si} className="bg-background rounded-lg border border-border p-3 space-y-1.5">
                                          <div className="flex items-center justify-between">
                                            <span className="font-mono text-xs font-semibold">{s?.reference_number ?? `Shipment ${si + 1}`}</span>
                                            {mf.length > 0 && (
                                              <Badge variant="destructive" className="text-[10px] gap-0.5">
                                                <FiAlertTriangle className="w-2.5 h-2.5" /> {mf.length} missing
                                              </Badge>
                                            )}
                                          </div>
                                          <Separator className="my-1" />
                                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                            <DetailRow label="Pickup" value={s?.pickup_location} missing={mf.includes('pickup_location')} />
                                            <DetailRow label="Delivery" value={s?.delivery_location} missing={mf.includes('delivery_location')} />
                                            <DetailRow label="Pickup Date" value={s?.pickup_datetime} missing={mf.includes('pickup_datetime')} />
                                            <DetailRow label="Delivery Date" value={s?.delivery_datetime} missing={mf.includes('delivery_datetime')} />
                                            <DetailRow label="Cargo" value={s?.cargo_description} missing={mf.includes('cargo_description')} />
                                            <DetailRow label="Weight/Dims" value={s?.weight_dimensions} missing={mf.includes('weight_dimensions')} />
                                            <DetailRow label="Vehicle" value={s?.vehicle_type} missing={mf.includes('vehicle_type')} />
                                            <DetailRow label="Shipper" value={s?.shipper_contact} missing={mf.includes('shipper_contact')} />
                                            <DetailRow label="Receiver" value={s?.receiver_contact} missing={mf.includes('receiver_contact')} />
                                            <DetailRow label="Notes" value={s?.notes} missing={mf.includes('notes')} />
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground">
                Page {page + 1} of {totalPages} ({filtered.length} results)
              </span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="text-xs h-7 px-3">
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)} className="text-xs h-7 px-3">
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function DetailRow({ label, value, missing }: { label: string; value?: string; missing?: boolean }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}: </span>
      {missing && !value ? (
        <span className="text-destructive/70 italic">Not provided</span>
      ) : (
        <span className="text-foreground/80">{value || '-'}</span>
      )}
    </div>
  )
}
