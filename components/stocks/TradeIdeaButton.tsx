'use client'

import { useState } from 'react'
import { getTradeIdea } from '@/lib/trading/getTradeIdea'

type TradeIdeaButtonProps = {
  symbol: string
  prices: number[]
}

export function TradeIdeaButton({ symbol, prices }: TradeIdeaButtonProps) {
  const [idea, setIdea] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const analyze = async () => {
    setLoading(true)
    const result = await getTradeIdea(symbol, prices)
    setIdea(result)
    setLoading(false)
  }

  return (
    <div className="mt-4 p-4 border rounded-lg shadow">
      <button
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        onClick={analyze}
        disabled={loading}
      >
        {loading ? 'Analyzing...' : 'Analyze Trade Idea'}
      </button>

      {idea && (
        <div className="mt-4 text-sm space-y-2">
          <p><strong>📈 Trade Idea for {idea.symbol}</strong></p>
          <p>📍 Entry: ${idea.entry}</p>
          <p>🎯 Target: ${idea.target}</p>
          <p>🛑 Stop Loss: ${idea.stopLoss}</p>
          <p>🧠 Reason: {idea.reason}</p>
        </div>
      )}
    </div>
  )
}
