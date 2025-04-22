'use client'

import { useEffect, useState } from 'react'
import { submitTradeAnalysis } from '@/app/actions'
import { StockChart } from '@/components/tradingview/stock-chart'
import { StockNews } from '@/components/tradingview/stock-news'


import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

// ...
const handleExportPDF = async () => {
  const element = document.getElementById('trade-result')
  if (!element) return

  const canvas = await html2canvas(element)
  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF()

  const imgProps = pdf.getImageProperties(imgData)
  const pdfWidth = pdf.internal.pageSize.getWidth()
  const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width

  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
  pdf.save(`${activeSymbol}_trade_idea.pdf`)
}

{result && (
    <div id="trade-result" className="mt-4 space-y-4">
      {result}
      <button
        onClick={handleExportPDF}
        className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition"
      >
        📄 Export Trade Idea as PDF
      </button>
    </div>
  )}

  
const STOCKS = ['AAPL', 'MSFT', 'TSLA', 'AMZN']
const CRYPTOS = ['BTCUSD', 'ETHUSD', 'DOGEUSD']
const STORAGE_KEY = 'last_selected_symbol'

export function SymbolDropdownAnalyzer() {
  const [selectedSymbol, setSelectedSymbol] = useState('')
  const [customSymbol, setCustomSymbol] = useState('')
  const [result, setResult] = useState<React.ReactNode | null>(null)
  const [loading, setLoading] = useState(false)

  const activeSymbol = customSymbol || selectedSymbol

  const fetchAnalysis = async (symbol: string) => {
    if (!symbol) return
    setLoading(true)
    const response = await submitTradeAnalysis(symbol.toUpperCase())
    setResult(response)
    setLoading(false)
    localStorage.setItem(STORAGE_KEY, symbol.toUpperCase())
  }

  const handleAnalyze = () => {
    fetchAnalysis(activeSymbol)
  }

  useEffect(() => {
    if (!activeSymbol) return
    const interval = setInterval(() => fetchAnalysis(activeSymbol), 15 * 60 * 1000)
    return () => clearInterval(interval)
  }, [activeSymbol])

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      if (STOCKS.includes(stored)) {
        setSelectedSymbol(stored)
      } else {
        setCustomSymbol(stored)
      }
      fetchAnalysis(stored)
    }
  }, [])

  return (
    <div className="p-4 border rounded-lg shadow space-y-5">
      <label className="block text-sm font-semibold">📊 Select a symbol or enter your own:</label>

      <select
        value={selectedSymbol}
        onChange={(e) => {
          setSelectedSymbol(e.target.value)
          setCustomSymbol('')
        }}
        className="w-full px-3 py-2 border rounded"
      >
        <option value="">-- Select from list --</option>
        <optgroup label="Stocks">
          {STOCKS.map(s => <option key={s} value={s}>{s}</option>)}
        </optgroup>
        <optgroup label="Cryptos">
          {CRYPTOS.map(c => <option key={c} value={c}>{c}</option>)}
        </optgroup>
      </select>

      <input
        type="text"
        placeholder="Or type custom symbol (e.g., NVDA, LTCUSD)"
        value={customSymbol}
        onChange={(e) => {
          setCustomSymbol(e.target.value.toUpperCase())
          setSelectedSymbol('')
        }}
        className="w-full px-3 py-2 border rounded"
      />

      <button
        onClick={handleAnalyze}
        disabled={loading || !activeSymbol}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
      >
        {loading ? 'Analyzing...' : `Analyze ${activeSymbol}`}
      </button>

      {/* 🔍 Show Chart and News */}
      {activeSymbol && (
        <>
          <div className="pt-4">
            <StockChart symbol={activeSymbol} comparisonSymbols={[]} />
          </div>
          <div className="pt-2">
            <StockNews props={activeSymbol} />
          </div>
        </>
      )}

      {/* 🎯 Trade Result */}
      {result && <div className="mt-4">{result}</div>}
    </div>
  )
}
  