'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ai } from '@ai-sdk/openai';
import { z } from 'zod';
import { createAI, getAIState } from 'ai/rsc';
import { nanoid } from 'nanoid';
import { stockSchema, chartSchema, newsSchema, screenerSchema, marketOverviewSchema } from './schemas';
import { showStockPrice, showStockChart, showStockNews, showStockScreener, showMarketOverview } from './tools';

// System message to guide the AI's behavior
const systemMessage = `
You are TraderAI, a financial assistant specializing in stock market analysis.
Provide concise and accurate information based on the tools available.
`;

// Define the tools available to the AI
const tools = {
  showStockPrice,
  showStockChart,
  showStockNews,
  showStockScreener,
  showMarketOverview,
};

// Create the AI instance with the defined tools and system message
export const aiInstance = createAI({
  actions: {
    submitUserMessage,
  },
  initialAIState: {
    messages: [
      {
        id: nanoid(),
        role: 'system',
        content: systemMessage,
      },
    ],
  },
  tools,
});

// Function to handle user message submission
export async function submitUserMessage(input: string) {
  'use server';

  const aiState = getAIState();

  // Add the user's message to the AI state
  aiState.update((state) => ({
    ...state,
    messages: [
      ...state.messages,
      {
        id: nanoid(),
        role: 'user',
        content: input,
      },
    ],
  }));

  // Generate the AI's response
  const result = await ai.chat({
    messages: aiState.get().messages,
    tools,
  });

  // Add the AI's response to the AI state
  aiState.update((state) => ({
    ...state,
    messages: [
      ...state.messages,
      {
        id: nanoid(),
        role: 'assistant',
        content: result.content,
      },
    ],
  }));
}
