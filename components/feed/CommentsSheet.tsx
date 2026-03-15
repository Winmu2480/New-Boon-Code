import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Image, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform, Modal, Pressable,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { Post, Comment } from '../../types';
import { fetchComments, addComment } from '../../services/postService';
import { RootState } from '../../store';

interface CommentsSheetProps {
  post: Post;
  onClose: () => void;
}

export default function CommentsSheet({ post, onClose }: CommentsSheetProps) {
  const { user } = useSelector((s: RootState) => s.auth);
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const translateY = useSharedValue(600);

  useEffect(() => {
    translateY.value = withTiming(0, { duration: 320 });
    loadComments();
  }, []);

  const loadComments = async () => {
    try {
      const data = await fetchComments(post.id);
      setComments(data);
    } catch {}
    setLoading(false);
  };

  const handleClose = () => {
    translateY.value = withTiming(600, { duration: 280 }, () => {
      runOnJS(onClose)();
    });
  };

  const handlePost = async () => {
    if (!text.trim() || !user) return;
    setPosting(true);
    try {
      const comment = await addComment(post.id, user.id, text.trim());
      setComments((prev) => [...prev, { ...comment, author: user }]);
      setText('');
    } catch {}
    setPosting(false);
  };

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const renderComment = ({ item }: { item: Comment }) => (
    <View style={styles.comment}>
      <Image
        source={{ uri: item.author?.avatar || `https://i.pravatar.cc/60?u=${item.authorId}` }}
        style={styles.commentAvatar}
      />
      <View style={styles.commentBody}>
        <View style={styles.commentBubble}>
          <Text style={styles.commentUser}>{item.author?.displayName || 'User'}</Text>
          <Text style={styles.commentText}>{item.text}</Text>
        </View>
        <View style={styles.commentMeta}>
          <Text style={styles.commentTime}>{timeAgo(item.createdAt)}</Text>
          <TouchableOpacity><Text style={styles.commentReply}>Reply</Text></TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <Modal transparent animationType="none" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <Animated.View style={[styles.sheet, sheetStyle]}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Title */}
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>
            {post.commentsCount || comments.length} Comments
          </Text>
          <TouchableOpacity onPress={handleClose}>
            <Feather name="x" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Comments List */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : (
          <FlatList
            data={comments}
            renderItem={renderComment}
            keyExtractor={(c) => c.id}
            style={styles.list}
            contentContainerStyle={{ paddingTop: Spacing.sm, paddingBottom: 80 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No comments yet. Be the first! 💬</Text>
            }
          />
        )}

        {/* Input */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={10}
        >
          <View style={styles.inputRow}>
            <Image
              source={{ uri: user?.avatar || `https://i.pravatar.cc/60?u=${user?.id}` }}
              style={styles.inputAvatar}
            />
            <TextInput
              style={styles.input}
              placeholder="Add a comment..."
              placeholderTextColor={Colors.textMuted}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              onPress={handlePost}
              disabled={!text.trim() || posting}
              style={[styles.postBtn, (!text.trim()) && styles.postBtnDisabled]}
            >
              {posting ? (
                <ActivityIndicator size="small" color={Colors.textPrimary} />
              ) : (
                <Feather name="send" size={18} color={Colors.textPrimary} />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '75%',
    backgroundColor: Colors.surfaceElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: Spacing.sm,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sheetTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: Typography.md,
    color: Colors.textPrimary,
  },
  list: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  comment: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  commentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.surface,
  },
  commentBody: { flex: 1 },
  commentBubble: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderTopLeftRadius: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  commentUser: {
    fontFamily: 'DMSans-Bold',
    fontSize: 13,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  commentText: {
    fontFamily: 'DMSans-Regular',
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  commentMeta: {
    flexDirection: 'row',
    gap: Spacing.base,
    marginTop: 4,
    paddingLeft: Spacing.sm,
  },
  commentTime: {
    fontFamily: 'DMSans-Regular',
    fontSize: 11,
    color: Colors.textMuted,
  },
  commentReply: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    color: Colors.textSecondary,
  },
  emptyText: {
    fontFamily: 'DMSans-Regular',
    fontSize: Typography.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing['2xl'],
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surfaceElevated,
    gap: Spacing.sm,
  },
  inputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontFamily: 'DMSans-Regular',
    fontSize: Typography.sm,
    color: Colors.textPrimary,
    maxHeight: 80,
  },
  postBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postBtnDisabled: { opacity: 0.4 },
});
