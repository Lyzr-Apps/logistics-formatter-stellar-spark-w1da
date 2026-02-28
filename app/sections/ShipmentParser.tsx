'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FiCopy, FiSave, FiTrash2, FiAlertTriangle, FiPackage } from 'react-icons/fi'
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

interface ParsedResult {
  shipments: Shipment[]
  total_shipments_found?: number
  summary?: string
}

interface ShipmentParserProps {
  rawMessage: string
  setRawMessage: (val: string) => void
  parsedResult: ParsedResult | null
  loading: boolean
  error: string | null
  onParse: () => void
  onClear: () => void
  onAddToHistory: () => void
  statusMessage: string
  useSample: boolean
}

const SAMPLE_MESSAGE = `Hi, we have 2 shipments:

1) Ref: SHP-2026-001
Pickup: Warehouse 7, Industrial Area, Mumbai
Delivery: Block C, Logistics Park, Delhi
Pickup Date: March 1, 2026, 9:00 AM
Delivery Date: March 3, 2026, 2:00 PM
Cargo: 200 cartons of electronics components
Weight: 4500 kg, 20 pallets
Vehicle: 40ft container truck
Shipper: Raj Kumar, +91-9876543210, ABC Electronics
Receiver: Priya Sharma, +91-9123456780, XYZ Distributors
Notes: Handle with care, fragile items.

2) Ref: SHP-2026-002
Pickup: Bay 3, Port Trust, Chennai
Delivery: Unit 12, SEZ, Bangalore
Pickup Date: March 2, 2026, 6:00 AM
Cargo: 50 drums of industrial chemicals
Weight: 8000 kg
Vehicle: Hazmat tanker
Shipper: Anand Mehta, +91-9988776655
Notes: Hazmat protocol required. No delivery date confirmed yet.`

const SAMPLE_RESULT: ParsedResult = {
  shipments: [
    {
      reference_number: 'SHP-2026-001',
      pickup_location: 'Warehouse 7, Industrial Area, Mumbai',
      delivery_location: 'Block C, Logistics Park, Delhi',
      pickup_datetime: '2026-03-01 09:00',
      delivery_datetime: '2026-03-03 14:00',
      cargo_description: '200 cartons of electronics components',
      weight_dimensions: '4500 kg, 20 pallets',
      vehicle_type: '40ft container truck',
      shipper_contact: 'Raj Kumar, +91-9876543210, ABC Electronics',
      receiver_contact: 'Priya Sharma, +91-9123456780, XYZ Distributors',
      notes: 'Handle with care, fragile items.',
      missing_fields: [],
    },
    {
      reference_number: 'SHP-2026-002',
      pickup_location: 'Bay 3, Port Trust, Chennai',
      delivery_location: 'Unit 12, SEZ, Bangalore',
      pickup_datetime: '2026-03-02 06:00',
      delivery_datetime: '',
      cargo_description: '50 drums of industrial chemicals',
      weight_dimensions: '8000 kg',
      vehicle_type: 'Hazmat tanker',
      shipper_contact: 'Anand Mehta, +91-9988776655',
      receiver_contact: '',
      notes: 'Hazmat protocol required. No delivery date confirmed yet.',
      missing_fields: ['delivery_datetime', 'receiver_contact'],
    },
  ],
  total_shipments_found: 2,
  summary: '2 shipments parsed. 1 has missing fields (delivery date, receiver contact).',
}

function LoadingSkeleton() {
  return (
    <Card className="bg-card/75 backdrop-blur-md border border-border shadow-md">
      <CardHeader>
        <Skeleton className="h-5 w-48" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-10 w-1/4" />
              <Skeleton className="h-10 w-1/4" />
              <Skeleton className="h-10 w-1/4" />
              <Skeleton className="h-10 w-1/4" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function MissingFieldBadge({ fields }: { fields: string[] }) {
  const safeFields = Array.isArray(fields) ? fields : []
  if (safeFields.length === 0) return null
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="destructive" className="gap-1 cursor-help text-xs">
            <FiAlertTriangle className="w-3 h-3" />
            {safeFields.length} missing
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-xs font-medium">Missing fields:</p>
          <ul className="text-xs list-disc ml-3 mt-1">
            {safeFields.map((f, i) => (
              <li key={i}>{f?.replace(/_/g, ' ') ?? 'unknown'}</li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function CellValue({ value, field, missingFields }: { value?: string; field: string; missingFields?: string[] }) {
  const missing = Array.isArray(missingFields) && missingFields.includes(field)
  if (!value && missing) {
    return <span className="text-destructive/70 italic text-xs">Not provided</span>
  }
  return <span className={cn('text-xs', !value && 'text-muted-foreground italic')}>{value || '-'}</span>
}

export default function ShipmentParser({
  rawMessage,
  setRawMessage,
  parsedResult,
  loading,
  error,
  onParse,
  onClear,
  onAddToHistory,
  statusMessage,
  useSample,
}: ShipmentParserProps) {
  const displayMessage = useSample && !rawMessage ? SAMPLE_MESSAGE : rawMessage
  const displayResult = useSample && !parsedResult ? SAMPLE_RESULT : parsedResult
  const shipments = Array.isArray(displayResult?.shipments) ? displayResult.shipments : []
  const charCount = displayMessage.length

  const handleCopyTable = () => {
    if (shipments.length === 0) return
    const headers = ['Ref #', 'Pickup', 'Delivery', 'Pickup Date', 'Delivery Date', 'Cargo', 'Weight/Dims', 'Vehicle', 'Shipper', 'Receiver', 'Notes']
    const rows = shipments.map((s) => [
      s?.reference_number ?? '',
      s?.pickup_location ?? '',
      s?.delivery_location ?? '',
      s?.pickup_datetime ?? '',
      s?.delivery_datetime ?? '',
      s?.cargo_description ?? '',
      s?.weight_dimensions ?? '',
      s?.vehicle_type ?? '',
      s?.shipper_contact ?? '',
      s?.receiver_contact ?? '',
      s?.notes ?? '',
    ].join('\t'))
    const text = [headers.join('\t'), ...rows].join('\n')
    navigator.clipboard.writeText(text).catch(() => {})
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card/75 backdrop-blur-md border border-border shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <FiPackage className="w-5 h-5 text-primary" />
            Message Input
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Textarea
              placeholder="Paste your WhatsApp shipment message here..."
              value={displayMessage}
              onChange={(e) => setRawMessage(e.target.value)}
              rows={8}
              className="resize-none font-mono text-sm leading-relaxed bg-background/50 border-input"
            />
            <span className="absolute bottom-2 right-3 text-xs text-muted-foreground">
              {charCount} chars
            </span>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-lg border border-destructive/20">
              <FiAlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          <div className="flex justify-end">
            <Button
              onClick={onParse}
              disabled={loading || (!displayMessage.trim())}
              className="px-6 font-medium"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Processing...
                </span>
              ) : (
                'Standardize Shipment'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading && <LoadingSkeleton />}

      {!loading && shipments.length > 0 && (
        <Card className="bg-card/75 backdrop-blur-md border border-border shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg font-semibold tracking-tight">
                  Parsed Shipments
                </CardTitle>
                {displayResult?.summary && (
                  <p className="text-sm text-muted-foreground">{displayResult.summary}</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="secondary" className="font-mono text-xs">
                  {displayResult?.total_shipments_found ?? shipments.length} found
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={handleCopyTable} className="gap-1.5 text-xs">
                      <FiCopy className="w-3.5 h-3.5" /> Copy
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy table to clipboard</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={onAddToHistory} className="gap-1.5 text-xs">
                      <FiSave className="w-3.5 h-3.5" /> Save
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Add to history</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={onClear} className="gap-1.5 text-xs">
                      <FiTrash2 className="w-3.5 h-3.5" /> Clear
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Clear results</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {statusMessage && (
                <span className="ml-2 text-xs text-chart-2 font-medium animate-pulse">{statusMessage}</span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="w-full">
              <div className="min-w-[1200px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-xs font-semibold w-[100px]">Ref #</TableHead>
                      <TableHead className="text-xs font-semibold">Pickup</TableHead>
                      <TableHead className="text-xs font-semibold">Delivery</TableHead>
                      <TableHead className="text-xs font-semibold w-[120px]">Pickup Date</TableHead>
                      <TableHead className="text-xs font-semibold w-[120px]">Delivery Date</TableHead>
                      <TableHead className="text-xs font-semibold">Cargo</TableHead>
                      <TableHead className="text-xs font-semibold w-[110px]">Weight/Dims</TableHead>
                      <TableHead className="text-xs font-semibold w-[100px]">Vehicle</TableHead>
                      <TableHead className="text-xs font-semibold">Shipper</TableHead>
                      <TableHead className="text-xs font-semibold">Receiver</TableHead>
                      <TableHead className="text-xs font-semibold">Notes</TableHead>
                      <TableHead className="text-xs font-semibold w-[80px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shipments.map((shipment, idx) => {
                      const missingFields = Array.isArray(shipment?.missing_fields) ? shipment.missing_fields : []
                      return (
                        <TableRow key={idx} className="border-border hover:bg-accent/50">
                          <TableCell className="font-mono text-xs font-medium">{shipment?.reference_number ?? '-'}</TableCell>
                          <TableCell><CellValue value={shipment?.pickup_location} field="pickup_location" missingFields={missingFields} /></TableCell>
                          <TableCell><CellValue value={shipment?.delivery_location} field="delivery_location" missingFields={missingFields} /></TableCell>
                          <TableCell><CellValue value={shipment?.pickup_datetime} field="pickup_datetime" missingFields={missingFields} /></TableCell>
                          <TableCell><CellValue value={shipment?.delivery_datetime} field="delivery_datetime" missingFields={missingFields} /></TableCell>
                          <TableCell><CellValue value={shipment?.cargo_description} field="cargo_description" missingFields={missingFields} /></TableCell>
                          <TableCell><CellValue value={shipment?.weight_dimensions} field="weight_dimensions" missingFields={missingFields} /></TableCell>
                          <TableCell><CellValue value={shipment?.vehicle_type} field="vehicle_type" missingFields={missingFields} /></TableCell>
                          <TableCell><CellValue value={shipment?.shipper_contact} field="shipper_contact" missingFields={missingFields} /></TableCell>
                          <TableCell><CellValue value={shipment?.receiver_contact} field="receiver_contact" missingFields={missingFields} /></TableCell>
                          <TableCell><CellValue value={shipment?.notes} field="notes" missingFields={missingFields} /></TableCell>
                          <TableCell>
                            {missingFields.length === 0 ? (
                              <Badge variant="secondary" className="text-xs bg-chart-2/15 text-chart-2 border-chart-2/20">Complete</Badge>
                            ) : (
                              <MissingFieldBadge fields={missingFields} />
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {!loading && !displayResult && !error && (
        <Card className="bg-card/75 backdrop-blur-md border border-border shadow-md border-dashed">
          <CardContent className="py-16 text-center">
            <FiPackage className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold text-foreground/80 mb-1">No shipments parsed yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Paste a raw shipment message above and click "Standardize Shipment" to extract structured data.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
