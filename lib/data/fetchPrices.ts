export async function fetchHistoricalPrices(symbol: string): Promise<number[]> {
  const response = await fetch(`https://apidojo-yahoo-finance-v1.p.rapidapi.com/stock/v3/get-chart?interval=1d&range=1mo&symbol=${symbol}`, {
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': process.env.RAPIDAPI_KEY!, // Or hardcode for testing
      'X-RapidAPI-Host': 'apidojo-yahoo-finance-v1.p.rapidapi.com'
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch prices for ${symbol}`)
  }

  const data = await response.json()
  return data.chart.result[0].indicators.quote[0].close.filter((p: number) => p !== null)
}
