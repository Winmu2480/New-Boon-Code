import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ChatState, ChatMessage, DealResult, Post } from '../types';
import { v4 as uuidv4 } from 'crypto';

const generateId = () => Math.random().toString(36).substring(2, 11);

const initialState: ChatState = {
  messages: [
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hey! 👋 I'm your Boon Deal Finder. Share a post with me or ask about any store, and I'll hunt down the best coupons and prices for you! 🛍️",
      createdAt: new Date().toISOString(),
    },
  ],
  isTyping: false,
  conversationId: generateId(),
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addUserMessage: (
      state,
      action: PayloadAction<{ content: string; attachedPost?: Post }>
    ) => {
      state.messages.push({
        id: generateId(),
        role: 'user',
        content: action.payload.content,
        attachedPost: action.payload.attachedPost,
        createdAt: new Date().toISOString(),
      });
    },
    addLoadingMessage: (state) => {
      state.isTyping = true;
      state.messages.push({
        id: 'loading',
        role: 'assistant',
        content: '',
        isLoading: true,
        createdAt: new Date().toISOString(),
      });
    },
    updateStreamingMessage: (state, action: PayloadAction<string>) => {
      const loadingMsg = state.messages.find((m) => m.id === 'loading');
      if (loadingMsg) {
        loadingMsg.content += action.payload;
        loadingMsg.isLoading = false;
      }
    },
    finalizeAIMessage: (
      state,
      action: PayloadAction<{ content: string; deals: DealResult[] }>
    ) => {
      state.isTyping = false;
      const idx = state.messages.findIndex((m) => m.id === 'loading');
      if (idx !== -1) {
        state.messages[idx] = {
          id: generateId(),
          role: 'assistant',
          content: action.payload.content,
          dealResults: action.payload.deals.length > 0 ? action.payload.deals : undefined,
          isLoading: false,
          createdAt: new Date().toISOString(),
        };
      }
    },
    setAIError: (state, action: PayloadAction<string>) => {
      state.isTyping = false;
      const idx = state.messages.findIndex((m) => m.id === 'loading');
      if (idx !== -1) {
        state.messages[idx] = {
          id: generateId(),
          role: 'assistant',
          content: `Sorry, I hit a snag: ${action.payload}. Please try again! 🙏`,
          isLoading: false,
          createdAt: new Date().toISOString(),
        };
      }
    },
    clearChat: (state) => {
      state.messages = [initialState.messages[0]];
      state.conversationId = generateId();
    },
  },
});

export const {
  addUserMessage,
  addLoadingMessage,
  updateStreamingMessage,
  finalizeAIMessage,
  setAIError,
  clearChat,
} = chatSlice.actions;
export default chatSlice.reducer;
