'use client'

import React, { useEffect, useRef, memo } from 'react'

type ComparisonSymbolObject = {
  symbol: string;
  position: "SameScale";
};

import { TradeIdeaButton } from '@/components/stocks/TradeIdeaButton'

type StockChartProps = {
  symbol: string
  comparisonSymbols?: { symbol: string; position: "SameScale" }[]
  prices?: number[]
}

export function StockChart({ symbol, comparisonSymbols = [], prices = [] }: StockChartProps) {
  return (
    <div>
      <div id="tv-chart" className="h-[400px]"></div>
      {prices.length > 0 && (
        <TradeIdeaButton symbol={symbol} prices={prices} />
      )}
    </div>
  )
}


export function StockChart({ symbol, comparisonSymbols }: { symbol: string, comparisonSymbols: ComparisonSymbolObject[] }) {
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!container.current) return
    const script = document.createElement('script')
    script.src =
      'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: symbol,
      interval: 'D',
      timezone: 'Etc/UTC',
      theme: 'light',
      style: comparisonSymbols.length === 0 ? '1' : '2',
      hide_volume: comparisonSymbols.length === 0 ? false : true,
      locale: 'en',
      backgroundColor: 'rgba(255, 255, 255, 1)',
      gridColor: 'rgba(247, 247, 247, 1)',
      withdateranges: true,
      hide_side_toolbar: comparisonSymbols.length > 0 ? true : false,
      allow_symbol_change: true,
      compareSymbols: comparisonSymbols,
      calendar: false,
      hide_top_toolbar: true,
      support_host: 'https://www.tradingview.com'
    })

    container.current.appendChild(script)

    return () => {
      if (container.current) {
        container.current.removeChild(script)
      }
    }
  }, [symbol, comparisonSymbols])

  return (
    <div style={{ height: '500px' }}>
      <div
        className="tradingview-widget-container"
        ref={container}
        style={{ height: '100%', width: '100%' }}
      >
        <div
          className="tradingview-widget-container__widget"
          style={{ height: 'calc(100% - 32px)', width: '100%' }}
        ></div>
        <div className="tradingview-widget-copyright">
          <a
            href="https://www.tradingview.com/pricing/?share_your_love=BlockSmithAI"
            rel="noopener nofollow"
            target="_blank"
          >
            <span className="">Track all markets on TradingView</span>
          </a>
        </div>
      </div>
    </div>
  )
}

export default memo(StockChart)
