// ─── Boon App Types ──────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  displayName: string;
  username: string;
  avatar: string | null;
  bio: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  savedDeals: string[]; // post IDs
  createdAt: string;
}

export interface Post {
  id: string;
  authorId: string;
  author: User;
  imageUrl: string;
  videoUrl?: string;
  caption: string;
  storeName: string;
  storeUrl: string;
  storeLocation?: StoreLocation;
  ogMetadata?: OGMetadata;
  likesCount: number;
  commentsCount: number;
  savesCount: number;
  isLiked: boolean;
  isSaved: boolean;
  tags: string[];
  createdAt: string;
}

export interface StoreLocation {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  country: string;
}

export interface OGMetadata {
  title: string;
  description: string;
  image: string;
  siteName: string;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  author: User;
  text: string;
  likesCount: number;
  isLiked: boolean;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'deal_alert' | 'price_drop';
  actorId: string;
  actor: User;
  postId?: string;
  post?: Post;
  message: string;
  isRead: boolean;
  createdAt: string;
}

// ─── AI Deal Finder ──────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachedPost?: Post;
  dealResults?: DealResult[];
  isLoading?: boolean;
  createdAt: string;
}

export interface DealResult {
  source: string;
  title: string;
  url: string;
  discount?: string;
  originalPrice?: string;
  salePrice?: string;
  code?: string;
  expiresAt?: string;
}

// ─── Redux State ─────────────────────────────────────────────────────────────

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface FeedState {
  posts: Post[];
  isLoading: boolean;
  isRefreshing: boolean;
  hasMore: boolean;
  page: number;
  error: string | null;
}

export interface ChatState {
  messages: ChatMessage[];
  isTyping: boolean;
  conversationId: string | null;
}

export interface AppState {
  auth: AuthState;
  feed: FeedState;
  chat: ChatState;
}
