export async function fetchCryptoPrices(symbol: string): Promise<number[]> {
    const idMap: Record<string, string> = {
      BTCUSD: 'bitcoin',
      ETHUSD: 'ethereum',
      DOGEUSD: 'dogecoin'
    }
  
    const id = idMap[symbol]
    if (!id) throw new Error("Unsupported crypto symbol")
  
    const response = await fetch(`https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=30&interval=daily`)
    const data = await response.json()
  
    return data.prices.map((p: [number, number]) => parseFloat(p[1].toFixed(2)))
  }
  