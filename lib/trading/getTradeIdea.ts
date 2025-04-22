export type TradeIdea = {
    symbol: string
    reason: string
    entry: number
    target: number
    stopLoss: number
  }
  
  /**
   * Calculate Exponential Moving Average (EMA)
   */
  function calculateEMA(prices: number[], period: number): number[] {
    const k = 2 / (period + 1)
    const emaArray: number[] = []
    let ema = prices[0]
    emaArray.push(ema)
    for (let i = 1; i < prices.length; i++) {
      ema = prices[i] * k + ema * (1 - k)
      emaArray.push(ema)
    }
    return emaArray
  }
  
  /**
   * Calculate MACD and Signal Line
   */
  function computeMACD(prices: number[]): { macd: number; signal: number } {
    const ema12 = calculateEMA(prices, 12)
    const ema26 = calculateEMA(prices, 26)
    const macdLine = ema12.map((val, i) => val - (ema26[i] || 0))
    const signalLine = calculateEMA(macdLine.slice(macdLine.length - 9), 9)
    return {
      macd: macdLine[macdLine.length - 1],
      signal: signalLine[signalLine.length - 1]
    }
  }
  
  /**
   * Calculate RSI
   */
  function computeRSI(prices: number[]): number {
    let gains = 0, losses = 0
    for (let i = 1; i < prices.length; i++) {
      const diff = prices[i] - prices[i - 1]
      if (diff > 0) gains += diff
      else losses -= diff
    }
    const avgGain = gains / (prices.length - 1)
    const avgLoss = losses / (prices.length - 1)
    const rs = avgGain / avgLoss
    return 100 - (100 / (1 + rs))
  }
  
  /**
   * Detect Bullish Engulfing Pattern
   */
  function detectBullishEngulfing(prices: number[]): boolean {
    if (prices.length < 4) return false
  
    const lastOpen = prices[prices.length - 4]
    const lastClose = prices[prices.length - 3]
    const currentOpen = prices[prices.length - 2]
    const currentClose = prices[prices.length - 1]
  
    return (
      lastClose < lastOpen &&
      currentClose > currentOpen &&
      currentOpen < lastClose &&
      currentClose > lastOpen
    )
  }
  
  /**
   * Main Function: Generate Trade Idea
   */
  export async function getTradeIdea(symbol: string, prices: number[]): Promise<TradeIdea | null> {
    const recent = prices.slice(-30)
    if (recent.length < 30) return null
  
    const rsi = computeRSI(recent)
    const { macd, signal } = computeMACD(recent)
    const isBullish = detectBullishEngulfing(recent)
  
    const lastPrice = recent[recent.length - 1]
  
    if (rsi < 30 && macd > signal && isBullish) {
      return {
        symbol,
        reason: `🟢 Trade Signal: Bullish Engulfing + RSI ${rsi.toFixed(1)} + MACD crossover`,
        entry: parseFloat(lastPrice.toFixed(2)),
        target: parseFloat((lastPrice * 1.06).toFixed(2)),      // 6% gain
        stopLoss: parseFloat((lastPrice * 0.975).toFixed(2))    // 2.5% risk
      }
    }
  
    return null
  }
  