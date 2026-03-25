'use client'

import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, FunnelChart, Funnel, LabelList } from 'recharts'
import Link from 'next/link'
import { differenceInDays } from 'date-fns'

interface Deal {
  id: string
  title: string
  value: number | null
  stage: string
  status: string
  createdAt: string
  updatedAt: string
}

interface Stage {
  id: string
  name: string
  order: number
}

interface Pipeline {
  id: string
  name: string
  stages: Stage[]
}

export default function PipelineAnalyticsPage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null)
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)

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
    const res = await fetch(`/api/admin/deals?pipelineId=${pipelineId}`)
    const data = await res.json()
    setDeals(data)
    setLoading(false)
  }

  if (!selectedPipeline) return (
    <div>
      <Link href="/admin/pipeline" className="text-gray-500 hover:text-gray-700 text-sm">← Pipeline</Link>
      <div className="text-center py-12 text-gray-500">No pipelines configured</div>
    </div>
  )

  const stages = selectedPipeline.stages.sort((a, b) => a.order - b.order)
  const openDeals = deals.filter((d) => d.status === 'open')
  const wonDeals = deals.filter((d) => d.status === 'won')
  const lostDeals = deals.filter((d) => d.status === 'lost')

  const totalRevenue = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0)
  const forecastRevenue = openDeals.reduce((sum, d) => sum + (d.value || 0), 0)
  const winRate = deals.length > 0 ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length || 1)) * 100) : 0

  const funnelData = stages.map((s) => ({
    name: s.name,
    value: openDeals.filter((d) => d.stage === s.id).length,
    fill: '#3b82f6',
  }))

  const stageBarData = stages.map((s) => {
    const stageDeals = openDeals.filter((d) => d.stage === s.id)
    const avgDays = stageDeals.length > 0
      ? Math.round(stageDeals.reduce((sum, d) => sum + differenceInDays(new Date(), new Date(d.updatedAt)), 0) / stageDeals.length)
      : 0
    return {
      name: s.name,
      deals: stageDeals.length,
      value: stageDeals.reduce((sum, d) => sum + (d.value || 0), 0),
      avgDays,
    }
  })

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/pipeline" className="text-gray-500 hover:text-gray-700 text-sm">← Pipeline</Link>
        <h1 className="text-2xl font-bold text-gray-900">Pipeline Analytics</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">Open Deals</div>
          <div className="text-2xl font-bold text-gray-900">{openDeals.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">Win Rate</div>
          <div className="text-2xl font-bold text-green-600">{winRate}%</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">Won Revenue</div>
          <div className="text-2xl font-bold text-gray-900">£{totalRevenue.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">Pipeline Value</div>
          <div className="text-2xl font-bold text-blue-600">£{forecastRevenue.toLocaleString()}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Deal count by stage */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Deals by Stage</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stageBarData} margin={{ top: 0, right: 0, left: -10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="deals" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Deals" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Value by stage */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Value by Stage (£)</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stageBarData} margin={{ top: 0, right: 0, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `£${v.toLocaleString()}`} />
              <Tooltip formatter={(v: number) => `£${v.toLocaleString()}`} />
              <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} name="Value" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Avg days in stage */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Average Days in Stage</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stageBarData} margin={{ top: 0, right: 0, left: -10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="avgDays" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Avg Days" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Win/Loss summary */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Won vs Lost</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-sm text-gray-600">Won</span>
              <div className="text-right">
                <span className="text-lg font-bold text-green-600">{wonDeals.length}</span>
                <span className="text-xs text-gray-500 ml-2">deals</span>
              </div>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-sm text-gray-600">Lost</span>
              <div className="text-right">
                <span className="text-lg font-bold text-red-500">{lostDeals.length}</span>
                <span className="text-xs text-gray-500 ml-2">deals</span>
              </div>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-sm text-gray-600">Win Rate</span>
              <span className="text-lg font-bold text-gray-900">{winRate}%</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-sm text-gray-600">Total Won Revenue</span>
              <span className="text-lg font-bold text-gray-900">£{totalRevenue.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
