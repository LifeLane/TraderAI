// actions.tsx
'use server'

import 'server-only'

import { generateText } from 'ai'
import {
  createAI,
  getMutableAIState,
  streamUI,
  createStreamableValue
} from 'ai/rsc'
import { createOpenAI } from '@ai-sdk/openai'

import { z } from 'zod'
import { nanoid } from '@/lib/utils'

import { BotCard, BotMessage, SpinnerMessage } from '@/components/stocks/message'
import { StockChart } from '@/components/tradingview/stock-chart'
import { StockPrice } from '@/components/tradingview/stock-price'
import { StockNews } from '@/components/tradingview/stock-news'
import { StockFinancials } from '@/components/tradingview/stock-financials'
import { StockScreener } from '@/components/tradingview/stock-screener'
import { MarketOverview } from '@/components/tradingview/market-overview'
import { MarketHeatmap } from '@/components/tradingview/market-heatmap'
import { MarketTrending } from '@/components/tradingview/market-trending'
import { ETFHeatmap } from '@/components/tradingview/etf-heatmap'
import { toast } from 'sonner'
import { TradeIdeaButton } from '@/components/stocks/trade-idea-button'

import { fetchHistoricalPrices } from '@/lib/data/fetchPrices'
import { fetchCryptoPrices } from '@/lib/data/fetchCryptoPrices'
import { getTradeIdea } from '@/lib/trading/getTradeIdea'
import { Message } from '@/lib/types'

export type AIState = {
  chatId: string
  messages: Message[]
}

export type UIState = {
  id: string
  display: React.ReactNode
}[]

const MODEL = 'llama3-70b-8192'
const TOOL_MODEL = 'llama3-70b-8192'
const GROQ_API_KEY_ENV = process.env.GROQ_API_KEY

type ComparisonSymbolObject = {
  symbol: string
  position: 'SameScale'
}

async function generateCaption(
  symbol: string,
  comparisonSymbols: ComparisonSymbolObject[],
  toolName: string,
  aiState: ReturnType<typeof getMutableAIState>
): Promise<string> {
  const groq = createOpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey: GROQ_API_KEY_ENV
  })

  const stockString = comparisonSymbols.length === 0
    ? symbol
    : [symbol, ...comparisonSymbols.map(obj => obj.symbol)].join(', ')

  const captionSystemMessage = `
You are a stock market conversation bot. You can provide the user information about stocks including prices and charts in the UI. You do not have access to any information and should only provide information by calling functions.

These are the tools you have available:
1. showStockFinancials - Shows financials for a stock
2. showStockChart - Shows chart for a stock or compared stocks
3. showStockPrice - Shows price for a stock or currency
4. showStockNews - Shows news for a stock or crypto
5. showStockScreener - Displays a screener
6. showMarketOverview - General market view
7. showMarketHeatmap - Sector performance map
8. showTrendingStocks - Top gainers/losers/actives
9. showETFHeatmap - ETF sector performance

You just called a tool (${toolName}) for ${stockString}. Now generate a brief caption of 2-3 sentences to display with the UI.
Examples:
User: What is the price of AAPL?
Assistant: This is the price of AAPL stock. Want a chart or more financial data?
User: Compare AAPL and MSFT
Assistant: Here’s how AAPL and MSFT have moved recently. Want financials or news on either?
`.

  try {
    const response = await generateText({
      model: groq(MODEL),
      messages: [
        { role: 'system', content: captionSystemMessage },
        ...aiState.get().messages.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
          name: msg.name
        }))
      ]
    })
    return response.text || ''
  } catch {
    return ''
  }
}

export async function submitTradeAnalysis(symbol: string) {
  let prices: number[] = []
  try {
    prices = symbol.endsWith('USD')
      ? await fetchCryptoPrices(symbol)
      : await fetchHistoricalPrices(symbol)

    const idea = await getTradeIdea(symbol, prices)

    if (!idea) {
      return <BotMessage content={`No strong trade setup found for ${symbol} right now.`} />
    }

    return (
      <BotMessage content={<>
        <p><strong>📈 Trade Idea for {idea.symbol}</strong></p>
        <p>📍 Entry: ${idea.entry}</p>
        <p>🎯 Target: ${idea.target}</p>
        <p>🛑 Stop Loss: ${idea.stopLoss}</p>
        <p>🧠 Reason: {idea.reason}</p>
      </>} />
    )
  } catch (err) {
    return <BotMessage content={`❌ Error analyzing ${symbol}: ${err}`} />
  }
}

export const AI = createAI<AIState, UIState>({
  actions: {
    submitUserMessage: async function submitUserMessage(content: string) {
      'use server'
      const aiState = getMutableAIState<typeof AI>()
      aiState.update({
        ...aiState.get(),
        messages: [...aiState.get().messages, { id: nanoid(), role: 'user', content }]
      })

      const match = content.match(/^analyze\s+([A-Z]+(?:USD)?)$/i)
      if (match) {
        const symbol = match[1].toUpperCase()
        return { id: nanoid(), display: await submitTradeAnalysis(symbol) }
      }

      const result = await streamUI({
        model: createOpenAI({ baseURL: 'https://api.groq.com/openai/v1', apiKey: GROQ_API_KEY_ENV })(TOOL_MODEL),
        initial: <SpinnerMessage />, maxRetries: 1,
        system: `You are a stock market assistant...`,
        messages: aiState.get().messages.map((msg: any) => ({
          role: msg.role, content: msg.content, name: msg.name
        })),
        text: ({ content, done, delta }) => {
          let textStream = createStreamableValue('')
          let textNode = <BotMessage content={textStream.value} />

          if (done) {
            textStream.done()
            aiState.done({
              ...aiState.get(),
              messages: [...aiState.get().messages, { id: nanoid(), role: 'assistant', content }]
            })
          } else {
            textStream.update(delta)
          }

          return textNode
        },
      tools: {
  showStockPrice: {
    description: 'Show the price of a given stock.',
    parameters: z.object({
      symbol: z.string().describe('The symbol of the stock or currency.')
    }),
    generate: async function* ({ symbol }) {
      yield <BotCard><></></BotCard>;

      const toolCallId = nanoid();
      aiState.done({
        ...aiState.get(),
        messages: [
          ...aiState.get().messages,
          {
            id: nanoid(),
            role: 'assistant',
            content: [
              { type: 'tool-call', toolName: 'showStockPrice', toolCallId, args: { symbol } }
            ]
          },
          {
            id: nanoid(),
            role: 'tool',
            content: [
              { type: 'tool-result', toolName: 'showStockPrice', toolCallId, result: { symbol } }
            ]
          }
        ]
      });

      const caption = await generateCaption(symbol, [], 'showStockPrice', aiState);
      return <BotCard><StockPrice props={symbol} />{caption}</BotCard>;
    }
  },

  showStockChart: {
    description: 'Show a chart for a stock or compare multiple.',
    parameters: z.object({
      symbol: z.string(),
      comparisonSymbols: z.array(z.object({ symbol: z.string(), position: z.literal("SameScale") })).default([])
    }),
    generate: async function* ({ symbol, comparisonSymbols }) {
      yield <BotCard><></></BotCard>;

      const toolCallId = nanoid();
      aiState.done({
        ...aiState.get(),
        messages: [
          ...aiState.get().messages,
          {
            id: nanoid(),
            role: 'assistant',
            content: [
              { type: 'tool-call', toolName: 'showStockChart', toolCallId, args: { symbol, comparisonSymbols } }
            ]
          },
          {
            id: nanoid(),
            role: 'tool',
            content: [
              { type: 'tool-result', toolName: 'showStockChart', toolCallId, result: { symbol, comparisonSymbols } }
            ]
          }
        ]
      });

      const caption = await generateCaption(symbol, comparisonSymbols, 'showStockChart', aiState);
      return <BotCard><StockChart symbol={symbol} comparisonSymbols={comparisonSymbols} />{caption}</BotCard>;
    }
  },

  showStockNews: {
    description: 'Show recent news for a given stock.',
    parameters: z.object({
      symbol: z.string().describe('The symbol of the stock or currency.')
    }),
    generate: async function* ({ symbol }) {
      yield <BotCard><></></BotCard>;

      const toolCallId = nanoid();
      aiState.done({
        ...aiState.get(),
        messages: [
          ...aiState.get().messages,
          {
            id: nanoid(),
            role: 'assistant',
            content: [
              { type: 'tool-call', toolName: 'showStockNews', toolCallId, args: { symbol } }
            ]
          },
          {
            id: nanoid(),
            role: 'tool',
            content: [
              { type: 'tool-result', toolName: 'showStockNews', toolCallId, result: { symbol } }
            ]
          }
        ]
      });

      const caption = await generateCaption(symbol, [], 'showStockNews', aiState);
      return <BotCard><StockNews props={symbol} />{caption}</BotCard>;
    }
  },

  showStockFinancials: {
    description: 'Display financials for a stock.',
    parameters: z.object({
      symbol: z.string()
    }),
    generate: async function* ({ symbol }) {
      yield <BotCard><></></BotCard>;

      const toolCallId = nanoid();
      aiState.done({
        ...aiState.get(),
        messages: [
          ...aiState.get().messages,
          {
            id: nanoid(),
            role: 'assistant',
            content: [
              { type: 'tool-call', toolName: 'showStockFinancials', toolCallId, args: { symbol } }
            ]
          },
          {
            id: nanoid(),
            role: 'tool',
            content: [
              { type: 'tool-result', toolName: 'showStockFinancials', toolCallId, result: { symbol } }
            ]
          }
        ]
      });

      const caption = await generateCaption(symbol, [], 'showStockFinancials', aiState);
      return <BotCard><StockFinancials props={symbol} />{caption}</BotCard>;
    }
  }
} // Additional tools like showStockScreener, showMarketOverview, etc. can follow similar structure.

showStockScreener: {
  description:
    'This tool shows a generic stock screener which can be used to find new stocks based on financial or technical parameters.',
  parameters: z.object({}),
  generate: async function* () {
    yield (
      <BotCard>
        <></>
      </BotCard>
    )

    const toolCallId = nanoid()

    aiState.done({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        {
          id: nanoid(),
          role: 'assistant',
          content: [
            {
              type: 'tool-call',
              toolName: 'showStockScreener',
              toolCallId,
              args: {}
            }
          ]
        },
        {
          id: nanoid(),
          role: 'tool',
          content: [
            {
              type: 'tool-result',
              toolName: 'showStockScreener',
              toolCallId,
              result: {}
            }
          ]
        }
      ]
    })

    const caption = await generateCaption('Generic', [], 'showStockScreener', aiState)

    return (
      <BotCard>
        <StockScreener />
        {caption}
      </BotCard>
    )
  }
},

showMarketOverview: {
  description:
    "This tool shows an overview of today's stock, futures, bond, and forex market performance including change values, Open, High, Low, and Close values.",
  parameters: z.object({}),
  generate: async function* () {
    yield (
      <BotCard>
        <></>
      </BotCard>
    )

    const toolCallId = nanoid()

    aiState.done({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        {
          id: nanoid(),
          role: 'assistant',
          content: [
            {
              type: 'tool-call',
              toolName: 'showMarketOverview',
              toolCallId,
              args: {}
            }
          ]
        },
        {
          id: nanoid(),
          role: 'tool',
          content: [
            {
              type: 'tool-result',
              toolName: 'showMarketOverview',
              toolCallId,
              result: {}
            }
          ]
        }
      ]
    })

    const caption = await generateCaption('Generic', [], 'showMarketOverview', aiState)

    return (
      <BotCard>
        <MarketOverview />
        {caption}
      </BotCard>
    )
  }
}
      })
      return { id: nanoid(), display: result.value }
    }
  },
  initialUIState: [],
  initialAIState: { chatId: nanoid(), messages: [] }
})
