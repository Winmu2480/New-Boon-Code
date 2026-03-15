import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { Feather } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { AppDispatch, RootState } from '../../store';
import { loadFeed, refreshFeed } from '../../store/feedSlice';
import { addUserMessage, addLoadingMessage } from '../../store/chatSlice';
import PostCard from '../../components/feed/PostCard';
import CommentsSheet from '../../components/feed/CommentsSheet';
import { Post } from '../../types';

export default function FeedScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const insets = useSafeAreaInsets();
  const { posts, isLoading, isRefreshing } = useSelector((s: RootState) => s.feed);
  const { user } = useSelector((s: RootState) => s.auth);

  const [commentPost, setCommentPost] = useState<Post | null>(null);

  // Load feed on mount
  React.useEffect(() => {
    dispatch(loadFeed());
  }, []);

  const onRefresh = useCallback(() => {
    dispatch(refreshFeed());
  }, []);

  const handleShareToAI = useCallback((post: Post) => {
    dispatch(addUserMessage({
      content: `Can you find me deals for this store? 🛍️`,
      attachedPost: post,
    }));
    dispatch(addLoadingMessage());
    router.push('/(tabs)/deals');
  }, []);

  const renderPost = useCallback(
    ({ item }: { item: Post }) => (
      <PostCard
        post={item}
        onCommentPress={setCommentPost}
        onShareToAI={handleShareToAI}
      />
    ),
    []
  );

  const Separator = () => <View style={styles.separator} />;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.logo}>boon</Text>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/search')}
          style={styles.headerBtn}
        >
          <Feather name="search" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* ── Feed ── */}
      {isLoading && posts.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : posts.length === 0 ? (
        <EmptyFeed />
      ) : (
        <FlashList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          estimatedItemSize={600}
          ItemSeparatorComponent={Separator}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── Comments Bottom Sheet ── */}
      {commentPost && (
        <CommentsSheet
          post={commentPost}
          onClose={() => setCommentPost(null)}
        />
      )}
    </View>
  );
}

function EmptyFeed() {
  return (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyEmoji}>🛍️</Text>
      <Text style={styles.emptyTitle}>Your feed is empty</Text>
      <Text style={styles.emptySubtitle}>
        Follow friends or explore to discover amazing store finds
      </Text>
      <TouchableOpacity
        style={styles.exploreBtn}
        onPress={() => router.push('/(tabs)/search')}
      >
        <Text style={styles.exploreBtnText}>Explore Posts</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  logo: {
    fontFamily: 'Playfair-Bold',
    fontSize: 26,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['2xl'],
  },
  emptyEmoji: { fontSize: 64, marginBottom: Spacing.base },
  emptyTitle: {
    fontFamily: 'Playfair-Bold',
    fontSize: Typography.xl,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: 'DMSans-Regular',
    fontSize: Typography.base,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  exploreBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
  },
  exploreBtnText: {
    fontFamily: 'DMSans-Bold',
    fontSize: Typography.base,
    color: Colors.textPrimary,
  },
});
