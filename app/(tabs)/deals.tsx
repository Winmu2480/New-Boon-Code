import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  Image, Linking, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { Feather } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { RootState, AppDispatch } from '../../store';
import {
  addUserMessage, addLoadingMessage, updateStreamingMessage,
  finalizeAIMessage, setAIError, clearChat,
} from '../../store/chatSlice';
import { sendDealFinderMessage } from '../../services/aiService';
import { ChatMessage, DealResult } from '../../types';

export default function DealsScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList>(null);
  const { messages, isTyping } = useSelector((s: RootState) => s.chat);
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isTyping) return;
    setInputText('');

    dispatch(addUserMessage({ content: text }));
    dispatch(addLoadingMessage());

    await sendDealFinderMessage(
      messages,
      null,
      (chunk) => dispatch(updateStreamingMessage(chunk)),
      (full, deals) => dispatch(finalizeAIMessage({ content: full, deals })),
      (err) => dispatch(setAIError(err))
    );
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
        {!isUser && (
          <View style={styles.aiAvatar}>
            <Feather name="zap" size={16} color={Colors.textPrimary} />
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
          {item.isLoading ? (
            <TypingDots />
          ) : (
            <>
              <Text style={[styles.bubbleText, isUser && styles.userBubbleText]}>
                {item.content}
              </Text>
              {/* Attached Post Preview */}
              {item.attachedPost && (
                <View style={styles.attachedPost}>
                  <Image source={{ uri: item.attachedPost.imageUrl }} style={styles.attachedImage} />
                  <View style={styles.attachedInfo}>
                    <Text style={styles.attachedStore}>{item.attachedPost.storeName}</Text>
                    <Text style={styles.attachedCaption} numberOfLines={2}>
                      {item.attachedPost.caption}
                    </Text>
                  </View>
                </View>
              )}
              {/* Deal Results */}
              {item.dealResults && item.dealResults.length > 0 && (
                <View style={styles.dealsContainer}>
                  {item.dealResults.map((deal, idx) => (
                    <DealCard key={idx} deal={deal} />
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Feather name="zap" size={18} color={Colors.gold} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Deal Finder</Text>
            <Text style={styles.headerSubtitle}>AI-powered shopping assistant</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => dispatch(clearChat())} style={styles.clearBtn}>
          <Feather name="refresh-cw" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
      />

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={10}
      >
        <View style={[styles.inputBar, { paddingBottom: insets.bottom + Spacing.sm }]}>
          <TextInput
            style={styles.input}
            placeholder="Ask about deals, coupons, or share a post..."
            placeholderTextColor={Colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || isTyping) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || isTyping}
          >
            {isTyping ? (
              <ActivityIndicator size="small" color={Colors.textPrimary} />
            ) : (
              <Feather name="send" size={18} color={Colors.textPrimary} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function DealCard({ deal }: { deal: DealResult }) {
  return (
    <TouchableOpacity
      style={styles.dealCard}
      onPress={() => deal.url && Linking.openURL(deal.url)}
      activeOpacity={0.8}
    >
      <View style={styles.dealHeader}>
        <Text style={styles.dealSource}>{deal.source}</Text>
        {deal.discount && (
          <View style={styles.dealBadge}>
            <Text style={styles.dealBadgeText}>{deal.discount} OFF</Text>
          </View>
        )}
      </View>
      <Text style={styles.dealTitle}>{deal.title}</Text>
      {deal.code && (
        <View style={styles.codeWrap}>
          <Text style={styles.codeLabel}>CODE</Text>
          <Text style={styles.code}>{deal.code}</Text>
          <Feather name="copy" size={14} color={Colors.textMuted} />
        </View>
      )}
      {deal.expiresAt && (
        <Text style={styles.expires}>Expires {deal.expiresAt}</Text>
      )}
    </TouchableOpacity>
  );
}

function TypingDots() {
  return (
    <View style={styles.dots}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.dot, { opacity: 0.4 + i * 0.2 }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.aiSurface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.aiPrimary + '40',
  },
  headerTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: Typography.md,
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontFamily: 'DMSans-Regular',
    fontSize: 11,
    color: Colors.textMuted,
  },
  clearBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: Colors.surface,
  },
  messagesList: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    gap: Spacing.md,
  },
  messageRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-end' },
  messageRowUser: { flexDirection: 'row-reverse' },
  aiAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.aiPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  aiBubble: {
    backgroundColor: Colors.aiBubble,
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleText: {
    fontFamily: 'DMSans-Regular',
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  userBubbleText: { color: Colors.textPrimary },
  attachedPost: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    padding: Spacing.sm,
  },
  attachedImage: {
    width: 48,
    height: 48,
    borderRadius: Radius.sm,
    backgroundColor: Colors.border,
  },
  attachedInfo: { flex: 1 },
  attachedStore: {
    fontFamily: 'DMSans-Bold',
    fontSize: 12,
    color: Colors.primary,
  },
  attachedCaption: {
    fontFamily: 'DMSans-Regular',
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  dealsContainer: { marginTop: Spacing.sm, gap: Spacing.sm },
  dealCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.gold + '30',
    gap: 6,
  },
  dealHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dealSource: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dealBadge: {
    backgroundColor: Colors.success + '20',
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  dealBadgeText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 10,
    color: Colors.success,
  },
  dealTitle: {
    fontFamily: 'DMSans-Bold',
    fontSize: Typography.sm,
    color: Colors.textPrimary,
  },
  codeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  codeLabel: {
    fontFamily: 'DMSans-Bold',
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  code: {
    flex: 1,
    fontFamily: 'SpaceMono-Regular',
    fontSize: Typography.sm,
    color: Colors.gold,
    letterSpacing: 1,
  },
  expires: {
    fontFamily: 'DMSans-Regular',
    fontSize: 11,
    color: Colors.textMuted,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 22,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    fontFamily: 'DMSans-Regular',
    fontSize: Typography.sm,
    color: Colors.textPrimary,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  sendBtnDisabled: { opacity: 0.4, shadowOpacity: 0 },
  dots: { flexDirection: 'row', gap: 5, padding: 4 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.textMuted,
  },
});
