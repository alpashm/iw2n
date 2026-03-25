'use client'

import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { differenceInDays, format } from 'date-fns'
import Link from 'next/link'

interface Stage {
  id: string
  name: string
  order: number
  color?: string
}

interface DealActivity {
  id: string
  type: string
  createdAt: string
}

interface Deal {
  id: string
  title: string
  value: number | null
  stage: string
  status: string
  contactId: string | null
  updatedAt: string
  activities: DealActivity[]
}

interface Pipeline {
  id: string
  name: string
  stages: Stage[]
}

interface Slideover {
  deal: Deal | null
  open: boolean
}

export default function PipelinePage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null)
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [slideover, setSlideover] = useState<Slideover>({ deal: null, open: false })
  const [newDeal, setNewDeal] = useState({ title: '', value: '', stage: '' })
  const [showNewDeal, setShowNewDeal] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/pipeline')
      .then((r) => r.json())
      .then((data) => {
        setPipelines(data)
        if (data.length > 0) {
          setSelectedPipeline(data[0])
          loadDeals(data[0].id)
        } else {
          setLoading(false)
        }
      })
  }, [])

  async function loadDeals(pipelineId: string) {
    setLoading(true)
    const res = await fetch(`/api/admin/deals?pipelineId=${pipelineId}&status=open`)
    const data = await res.json()
    setDeals(data)
    setLoading(false)
  }

  async function onDragEnd(result: DropResult) {
    if (!result.destination) return
    const dealId = result.draggableId
    const newStage = result.destination.droppableId
    const deal = deals.find((d) => d.id === dealId)
    if (!deal || deal.stage === newStage) return

    setDeals(deals.map((d) => (d.id === dealId ? { ...d, stage: newStage } : d)))

    await fetch(`/api/admin/deals/${dealId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: newStage }),
    })
  }

  async function createDeal() {
    if (!selectedPipeline || !newDeal.title || !newDeal.stage) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pipelineId: selectedPipeline.id,
          title: newDeal.title,
          value: newDeal.value ? parseFloat(newDeal.value) : null,
          stage: newDeal.stage,
        }),
      })
      if (res.ok) {
        const deal = await res.json()
        setDeals([...deals, { ...deal, activities: [] }])
        setNewDeal({ title: '', value: '', stage: '' })
        setShowNewDeal(false)
      }
    } finally {
      setSaving(false)
    }
  }

  async function closeDeal(dealId: string, status: 'won' | 'lost') {
    await fetch(`/api/admin/deals/${dealId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, outcome: status }),
    })
    setDeals(deals.filter((d) => d.id !== dealId))
    setSlideover({ deal: null, open: false })
  }

  function getDaysInStage(deal: Deal): number {
    const lastActivity = deal.activities[0]
    const referenceDate = lastActivity ? new Date(lastActivity.createdAt) : new Date(deal.updatedAt)
    return differenceInDays(new Date(), referenceDate)
  }

  function getStalenessColor(days: number): string {
    if (days > 7) return 'border-l-4 border-red-400 bg-red-50'
    if (days > 3) return 'border-l-4 border-amber-400 bg-amber-50'
    return 'border-l-4 border-transparent'
  }

  if (!selectedPipeline && !loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Sales Pipeline</h1>
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No pipelines configured yet.</p>
          <button
            onClick={async () => {
              const res = await fetch('/api/admin/pipeline', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: 'Default Pipeline',
                  stages: [
                    { id: 'lead', name: 'Lead', order: 1 },
                    { id: 'qualified', name: 'Qualified', order: 2 },
                    { id: 'proposal', name: 'Proposal', order: 3 },
                    { id: 'negotiation', name: 'Negotiation', order: 4 },
                    { id: 'closed', name: 'Closed', order: 5 },
                  ],
                }),
              })
              if (res.ok) {
                const p = await res.json()
                setPipelines([p])
                setSelectedPipeline(p)
              }
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Create Default Pipeline
          </button>
        </div>
      </div>
    )
  }

  const stages = selectedPipeline?.stages || []

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
          {pipelines.length > 1 && (
            <select
              value={selectedPipeline?.id}
              onChange={(e) => {
                const p = pipelines.find((x) => x.id === e.target.value)
                if (p) { setSelectedPipeline(p); loadDeals(p.id) }
              }}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
            >
              {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
        </div>
        <div className="flex gap-3">
          <Link href="/admin/pipeline/analytics" className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
            Analytics
          </Link>
          <button
            onClick={() => setShowNewDeal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Add Deal
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-400 inline-block"></span> Stale &gt;7 days</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-400 inline-block"></span> Warning &gt;3 days</span>
      </div>

      {showNewDeal && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 shadow-sm flex gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Deal Title</label>
            <input type="text" value={newDeal.title} onChange={(e) => setNewDeal({ ...newDeal, title: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64" placeholder="Deal name" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Value (£)</label>
            <input type="number" value={newDeal.value} onChange={(e) => setNewDeal({ ...newDeal, value: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-32" placeholder="Optional" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Stage</label>
            <select value={newDeal.stage} onChange={(e) => setNewDeal({ ...newDeal, stage: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="">Select stage</option>
              {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <button onClick={createDeal} disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 h-9">
            {saving ? '...' : 'Add'}
          </button>
          <button onClick={() => setShowNewDeal(false)} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm h-9">Cancel</button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading pipeline...</div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '60vh' }}>
            {stages.map((stage) => {
              const stageDeals = deals.filter((d) => d.stage === stage.id)
              const stageValue = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0)

              return (
                <div key={stage.id} className="flex-shrink-0 w-72">
                  <div className="bg-gray-100 rounded-t-lg px-3 py-2 flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-700">{stage.name}</span>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">{stageDeals.length} deals</div>
                      {stageValue > 0 && <div className="text-xs font-medium text-gray-700">£{stageValue.toLocaleString()}</div>}
                    </div>
                  </div>
                  <Droppable droppableId={stage.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`min-h-48 p-2 rounded-b-lg space-y-2 ${snapshot.isDraggingOver ? 'bg-blue-50 border-2 border-dashed border-blue-300' : 'bg-gray-50'}`}
                      >
                        {stageDeals.map((deal, index) => {
                          const daysInStage = getDaysInStage(deal)
                          return (
                            <Draggable key={deal.id} draggableId={deal.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  onClick={() => setSlideover({ deal, open: true })}
                                  className={`bg-white rounded-lg p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${getStalenessColor(daysInStage)} ${snapshot.isDragging ? 'shadow-lg rotate-2' : ''}`}
                                >
                                  <div className="font-medium text-sm text-gray-900 mb-1">{deal.title}</div>
                                  <div className="flex justify-between items-center text-xs text-gray-500">
                                    {deal.value && <span className="font-medium text-gray-700">£{deal.value.toLocaleString()}</span>}
                                    <span className={daysInStage > 7 ? 'text-red-500 font-medium' : daysInStage > 3 ? 'text-amber-500 font-medium' : ''}>
                                      {daysInStage}d
                                    </span>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          )
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              )
            })}
          </div>
        </DragDropContext>
      )}

      {/* Slideover */}
      {slideover.open && slideover.deal && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30" onClick={() => setSlideover({ deal: null, open: false })} />
          <div className="w-96 bg-white h-full shadow-xl overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-semibold text-gray-900">{slideover.deal.title}</h2>
                <button onClick={() => setSlideover({ deal: null, open: false })} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>

              <dl className="space-y-3 mb-6">
                {slideover.deal.value && (
                  <div>
                    <dt className="text-xs text-gray-500 uppercase">Value</dt>
                    <dd className="text-lg font-bold text-gray-900">£{slideover.deal.value.toLocaleString()}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs text-gray-500 uppercase">Stage</dt>
                  <dd className="text-sm font-medium text-gray-800">{stages.find((s) => s.id === slideover.deal!.stage)?.name || slideover.deal.stage}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 uppercase">Last Updated</dt>
                  <dd className="text-sm text-gray-600">{format(new Date(slideover.deal.updatedAt), 'dd MMM yyyy HH:mm')}</dd>
                </div>
              </dl>

              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 uppercase mb-2">Move to Stage</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={slideover.deal.stage}
                  onChange={async (e) => {
                    const newStage = e.target.value
                    await fetch(`/api/admin/deals/${slideover.deal!.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ stage: newStage }),
                    })
                    setDeals(deals.map((d) => d.id === slideover.deal!.id ? { ...d, stage: newStage } : d))
                    setSlideover({ deal: { ...slideover.deal!, stage: newStage }, open: true })
                  }}
                >
                  {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="flex gap-2 mb-4">
                <button onClick={() => closeDeal(slideover.deal!.id, 'won')} className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700">Mark Won</button>
                <button onClick={() => closeDeal(slideover.deal!.id, 'lost')} className="flex-1 bg-red-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-600">Mark Lost</button>
              </div>

              {slideover.deal.activities.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-600 uppercase mb-2">Activity</h3>
                  <div className="space-y-2">
                    {slideover.deal.activities.slice(0, 10).map((a) => (
                      <div key={a.id} className="text-xs bg-gray-50 rounded p-2">
                        <span className="text-gray-500">{format(new Date(a.createdAt), 'dd MMM HH:mm')}</span>
                        <span className="mx-1 text-gray-400">•</span>
                        <span className="text-gray-600">{a.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
