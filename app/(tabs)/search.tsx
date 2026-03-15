import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, Image, ActivityIndicator, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import {
  collection, query, where, orderBy,
  startAt, endAt, getDocs, limit,
} from 'firebase/firestore';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { db } from '../../services/firebase';
import { User, Post } from '../../types';

const { width: SCREEN_W } = Dimensions.get('window');
const GRID_SIZE = (SCREEN_W - Spacing.base * 2 - 8) / 3;

type SearchTab = 'people' | 'posts';

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [query_text, setQueryText] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('people');
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = useCallback(async (text: string) => {
    setQueryText(text);
    if (text.length < 2) {
      setUsers([]);
      setPosts([]);
      return;
    }
    setLoading(true);
    try {
      if (activeTab === 'people') {
        const q = query(
          collection(db, 'users'),
          orderBy('username'),
          startAt(text.toLowerCase()),
          endAt(text.toLowerCase() + '\uf8ff'),
          limit(20)
        );
        const snap = await getDocs(q);
        setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() } as User)));
      } else {
        const q = query(
          collection(db, 'posts'),
          orderBy('storeName'),
          startAt(text),
          endAt(text + '\uf8ff'),
          limit(20)
        );
        const snap = await getDocs(q);
        setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Post)));
      }
    } catch {}
    setLoading(false);
  }, [activeTab]);

  const renderUser = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.userRow}
      onPress={() => router.push({ pathname: '/profile/[id]', params: { id: item.id } })}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: item.avatar || `https://i.pravatar.cc/80?u=${item.id}` }}
        style={styles.userAvatar}
      />
      <View style={styles.userInfo}>
        <Text style={styles.userDisplayName}>{item.displayName}</Text>
        <Text style={styles.userUsername}>@{item.username}</Text>
      </View>
      <View style={styles.followerCount}>
        <Text style={styles.followerNum}>
          {item.followersCount >= 1000
            ? (item.followersCount / 1000).toFixed(1) + 'k'
            : item.followersCount}
        </Text>
        <Text style={styles.followerLabel}>followers</Text>
      </View>
    </TouchableOpacity>
  );

  const renderPost = ({ item }: { item: Post }) => (
    <TouchableOpacity
      style={styles.gridItem}
      onPress={() => router.push({ pathname: '/post/[id]', params: { id: item.id } })}
      activeOpacity={0.85}
    >
      <Image source={{ uri: item.imageUrl }} style={styles.gridImage} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Search Bar */}
      <View style={styles.searchBarWrap}>
        <View style={styles.searchBar}>
          <Feather name="search" size={18} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder={activeTab === 'people' ? 'Search people...' : 'Search stores & posts...'}
            placeholderTextColor={Colors.textMuted}
            value={query_text}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query_text.length > 0 && (
            <TouchableOpacity onPress={() => { setQueryText(''); setUsers([]); setPosts([]); }}>
              <Feather name="x" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['people', 'posts'] as SearchTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => { setActiveTab(tab); setQueryText(''); }}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : query_text.length < 2 ? (
        <EmptySearch tab={activeTab} />
      ) : (
        <>
          {activeTab === 'people' ? (
            <FlatList
              data={users}
              renderItem={renderUser}
              keyExtractor={(u) => u.id}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <Text style={styles.noResults}>No users found for "{query_text}"</Text>
              }
            />
          ) : (
            <FlatList
              data={posts}
              renderItem={renderPost}
              keyExtractor={(p) => p.id}
              numColumns={3}
              contentContainerStyle={styles.grid}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <Text style={styles.noResults}>No posts found for "{query_text}"</Text>
              }
            />
          )}
        </>
      )}
    </View>
  );
}

function EmptySearch({ tab }: { tab: SearchTab }) {
  return (
    <View style={styles.emptyWrap}>
      <Feather name={tab === 'people' ? 'users' : 'shopping-bag'} size={48} color={Colors.textMuted} />
      <Text style={styles.emptyTitle}>
        {tab === 'people' ? 'Find Friends' : 'Discover Stores'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {tab === 'people'
          ? 'Search by username to find and follow friends'
          : 'Search by store name to find deals and posts'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  searchBarWrap: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.base,
    height: 46,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'DMSans-Regular',
    fontSize: Typography.base,
    color: Colors.textPrimary,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: Colors.primary },
  tabText: {
    fontFamily: 'DMSans-Medium',
    fontSize: Typography.sm,
    color: Colors.textMuted,
  },
  tabTextActive: { color: Colors.primary },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: Spacing.base, gap: 2 },
  grid: { padding: Spacing.sm },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  userAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.primary + '60',
  },
  userInfo: { flex: 1 },
  userDisplayName: {
    fontFamily: 'DMSans-Bold',
    fontSize: Typography.sm,
    color: Colors.textPrimary,
  },
  userUsername: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  followerCount: { alignItems: 'flex-end' },
  followerNum: {
    fontFamily: 'DMSans-Bold',
    fontSize: Typography.sm,
    color: Colors.textPrimary,
  },
  followerLabel: {
    fontFamily: 'DMSans-Regular',
    fontSize: 11,
    color: Colors.textMuted,
  },
  gridItem: {
    width: GRID_SIZE,
    height: GRID_SIZE,
    margin: 1.5,
    backgroundColor: Colors.surface,
  },
  gridImage: { width: '100%', height: '100%' },
  noResults: {
    fontFamily: 'DMSans-Regular',
    fontSize: Typography.base,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing['2xl'],
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['2xl'],
    gap: Spacing.base,
  },
  emptyTitle: {
    fontFamily: 'Playfair-Bold',
    fontSize: Typography.xl,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: 'DMSans-Regular',
    fontSize: Typography.base,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
});
