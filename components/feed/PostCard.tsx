import React, { useCallback, useState } from 'react';
import {
  View, Text, Image, StyleSheet, Pressable,
  Dimensions, TouchableOpacity, Linking,
} from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withSequence
} from 'react-native-reanimated';
import { useDispatch, useSelector } from 'react-redux';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { Post } from '../../types';
import { optimisticLike, optimisticSave } from '../../store/feedSlice';
import { toggleLike, toggleSave } from '../../services/postService';
import { AppDispatch, RootState } from '../../store';

const { width: SCREEN_W } = Dimensions.get('window');
const IMAGE_HEIGHT = SCREEN_W * 1.1;

interface PostCardProps {
  post: Post;
  onCommentPress?: (post: Post) => void;
  onShareToAI?: (post: Post) => void;
}

export default function PostCard({ post, onCommentPress, onShareToAI }: PostCardProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((s: RootState) => s.auth);
  const [isExpanded, setIsExpanded] = useState(false);

  // Animated heart
  const heartScale = useSharedValue(1);
  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const handleLike = useCallback(async () => {
    if (!user) return;
    heartScale.value = withSequence(
      withSpring(1.4, { damping: 4 }),
      withSpring(1, { damping: 6 })
    );
    dispatch(optimisticLike({ postId: post.id, userId: user.id }));
    await toggleLike(post.id, user.id, post.isLiked);
  }, [post, user]);

  const handleSave = useCallback(async () => {
    if (!user) return;
    dispatch(optimisticSave({ postId: post.id, userId: user.id }));
    await toggleSave(post.id, user.id, post.isSaved);
  }, [post, user]);

  const handleOpenStore = () => {
    router.push({ pathname: '/browser', params: { url: post.storeUrl, title: post.storeName } });
  };

  const captionText = post.caption || '';
  const isLong = captionText.length > 100;
  const displayCaption = isExpanded || !isLong
    ? captionText
    : captionText.slice(0, 100) + '...';

  return (
    <View style={styles.card}>
      {/* ── Header ── */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => router.push({ pathname: '/profile/[id]', params: { id: post.authorId } })}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: post.author?.avatar || `https://i.pravatar.cc/150?u=${post.authorId}` }}
          style={styles.avatar}
        />
        <View style={styles.headerText}>
          <Text style={styles.displayName}>{post.author?.displayName || 'Boon User'}</Text>
          {post.storeLocation && (
            <View style={styles.locationRow}>
              <Feather name="map-pin" size={11} color={Colors.textMuted} />
              <Text style={styles.location}>{post.storeLocation.city}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.moreBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="more-horizontal" size={20} color={Colors.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>

      {/* ── Image ── */}
      <TouchableOpacity
        activeOpacity={0.97}
        onPress={() => router.push({ pathname: '/post/[id]', params: { id: post.id } })}
      >
        <Image
          source={{ uri: post.imageUrl }}
          style={styles.image}
          resizeMode="cover"
        />
      </TouchableOpacity>

      {/* ── Store URL Pill ── */}
      <TouchableOpacity style={styles.storePill} onPress={handleOpenStore} activeOpacity={0.8}>
        <Feather name="shopping-bag" size={13} color={Colors.primary} />
        <Text style={styles.storeName} numberOfLines={1}>{post.storeName}</Text>
        <Feather name="external-link" size={12} color={Colors.textMuted} />
      </TouchableOpacity>

      {/* ── Actions ── */}
      <View style={styles.actions}>
        <View style={styles.actionsLeft}>
          {/* Like */}
          <TouchableOpacity onPress={handleLike} style={styles.actionBtn} activeOpacity={0.7}>
            <Animated.View style={heartStyle}>
              <Feather
                name={post.isLiked ? 'heart' : 'heart'}
                size={24}
                color={post.isLiked ? Colors.primary : Colors.textPrimary}
              />
            </Animated.View>
            {post.likesCount > 0 && (
              <Text style={styles.actionCount}>{formatCount(post.likesCount)}</Text>
            )}
          </TouchableOpacity>

          {/* Comment */}
          <TouchableOpacity
            onPress={() => onCommentPress?.(post)}
            style={styles.actionBtn}
            activeOpacity={0.7}
          >
            <Feather name="message-circle" size={24} color={Colors.textPrimary} />
            {post.commentsCount > 0 && (
              <Text style={styles.actionCount}>{formatCount(post.commentsCount)}</Text>
            )}
          </TouchableOpacity>

          {/* Share to AI Deal Finder */}
          <TouchableOpacity
            onPress={() => onShareToAI?.(post)}
            style={styles.actionBtn}
            activeOpacity={0.7}
          >
            <Feather name="zap" size={24} color={Colors.gold} />
          </TouchableOpacity>
        </View>

        {/* Save */}
        <TouchableOpacity onPress={handleSave} activeOpacity={0.7}>
          <Feather
            name="bookmark"
            size={24}
            color={post.isSaved ? Colors.gold : Colors.textPrimary}
          />
        </TouchableOpacity>
      </View>

      {/* ── Caption ── */}
      <View style={styles.captionWrap}>
        <Text style={styles.caption}>
          <Text style={styles.username}>{post.author?.username || 'user'} </Text>
          {displayCaption}
          {isLong && !isExpanded && (
            <Text
              style={styles.moreText}
              onPress={() => setIsExpanded(true)}
            > more</Text>
          )}
        </Text>

        {/* Tags */}
        {post.tags?.length > 0 && (
          <View style={styles.tagsRow}>
            {post.tags.slice(0, 4).map((tag) => (
              <Text key={tag} style={styles.tag}>#{tag}</Text>
            ))}
          </View>
        )}

        <Text style={styles.timeAgo}>{timeAgo(post.createdAt)}</Text>
      </View>
    </View>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const formatCount = (n: number) =>
  n >= 1000 ? (n / 1000).toFixed(1) + 'k' : n.toString();

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
};

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  headerText: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  displayName: {
    fontFamily: 'DMSans-Bold',
    fontSize: Typography.sm,
    color: Colors.textPrimary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 1,
  },
  location: {
    fontFamily: 'DMSans-Regular',
    fontSize: 11,
    color: Colors.textMuted,
  },
  moreBtn: { padding: 4 },
  image: {
    width: SCREEN_W,
    height: IMAGE_HEIGHT,
    backgroundColor: Colors.surface,
  },
  storePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  storeName: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: Colors.textSecondary,
    maxWidth: 200,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  actionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionCount: {
    fontFamily: 'DMSans-Medium',
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
  captionWrap: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.base,
  },
  caption: {
    fontFamily: 'DMSans-Regular',
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  username: {
    fontFamily: 'DMSans-Bold',
    color: Colors.textPrimary,
  },
  moreText: {
    fontFamily: 'DMSans-Medium',
    color: Colors.textMuted,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: Spacing.xs,
  },
  tag: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: Colors.primary,
  },
  timeAgo: {
    fontFamily: 'DMSans-Regular',
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
});
