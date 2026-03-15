import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { FeedState, Post } from '../types';
import { fetchDiscoverPosts, toggleLike, toggleSave } from '../services/postService';

const initialState: FeedState = {
  posts: [],
  isLoading: false,
  isRefreshing: false,
  hasMore: true,
  page: 0,
  error: null,
};

// ─── Async Thunks ─────────────────────────────────────────────────────────────

export const loadFeed = createAsyncThunk(
  'feed/loadFeed',
  async (_, { rejectWithValue }) => {
    try {
      const { posts } = await fetchDiscoverPosts();
      return posts;
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  }
);

export const refreshFeed = createAsyncThunk(
  'feed/refreshFeed',
  async (_, { rejectWithValue }) => {
    try {
      const { posts } = await fetchDiscoverPosts();
      return posts;
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const feedSlice = createSlice({
  name: 'feed',
  initialState,
  reducers: {
    optimisticLike: (
      state,
      action: PayloadAction<{ postId: string; userId: string }>
    ) => {
      const post = state.posts.find((p) => p.id === action.payload.postId);
      if (post) {
        post.isLiked = !post.isLiked;
        post.likesCount += post.isLiked ? 1 : -1;
      }
    },
    optimisticSave: (
      state,
      action: PayloadAction<{ postId: string; userId: string }>
    ) => {
      const post = state.posts.find((p) => p.id === action.payload.postId);
      if (post) {
        post.isSaved = !post.isSaved;
        post.savesCount += post.isSaved ? 1 : -1;
      }
    },
    addNewPost: (state, action: PayloadAction<Post>) => {
      state.posts.unshift(action.payload);
    },
    removePost: (state, action: PayloadAction<string>) => {
      state.posts = state.posts.filter((p) => p.id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadFeed.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadFeed.fulfilled, (state, action) => {
        state.isLoading = false;
        state.posts = action.payload;
        state.hasMore = action.payload.length === 10;
      })
      .addCase(loadFeed.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(refreshFeed.pending, (state) => {
        state.isRefreshing = true;
      })
      .addCase(refreshFeed.fulfilled, (state, action) => {
        state.isRefreshing = false;
        state.posts = action.payload;
        state.page = 0;
        state.hasMore = true;
      })
      .addCase(refreshFeed.rejected, (state) => {
        state.isRefreshing = false;
      });
  },
});

export const { optimisticLike, optimisticSave, addNewPost, removePost } = feedSlice.actions;
export default feedSlice.reducer;
