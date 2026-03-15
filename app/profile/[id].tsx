import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  ScrollView, FlatList, Dimensions, ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  collection, doc, getDoc, getDocs, query,
  where, orderBy, updateDoc, arrayUnion, arrayRemove
} from 'firebase/firestore';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { User, Post } from '../../types';
import { RootState, AppDispatch } from '../../store';
import { updateUser } from '../../store/authSlice';
import { db } from '../../services/firebase';

const { width: SCREEN_W } = Dimensions.get('window');
const GRID_SIZE = (SCREEN_W - 3) / 3;

type TabType = 'posts' | 'saved';

export default function ProfileScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const insets = useSafeAreaInsets();
  const { user: currentUser } = useSelector((s: RootState) => s.auth);

  const profileId = params.id || currentUser?.id;
  const isOwnProfile = profileId === currentUser?.id;

  const [profile, setProfile] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!profileId) return;
    try {
      const snap = await getDoc(doc(db, 'users', profileId));
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as User;
        setProfile(data);
        if (currentUser) {
          // Check follow status by looking at currentUser's following list
          const currentSnap = await getDoc(doc(db, 'users', currentUser.id));
          const currentData = currentSnap.data();
          setIsFollowing(currentData?.following?.includes(profileId) || false);
        }
      }

      // Load user's posts
      const postsSnap = await getDocs(
        query(
          collection(db, 'posts'),
          where('authorId', '==', profileId),
          orderBy('createdAt', 'desc')
        )
      );
      setPosts(postsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Post)));
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
    setRefreshing(false);
  }, [profileId, currentUser]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handleFollow = async () => {
    if (!currentUser || !profileId) return;
    const newState = !isFollowing;
    setIsFollowing(newState);

    // Update follower/following counts
    await Promise.all([
      updateDoc(doc(db, 'users', profileId), {
        followersCount: profile!.followersCount + (newState ? 1 : -1),
        followers: newState ? arrayUnion(currentUser.id) : arrayRemove(currentUser.id),
      }),
      updateDoc(doc(db, 'users', currentUser.id), {
        followingCount: currentUser.followingCount + (newState ? 1 : -1),
        following: newState ? arrayUnion(profileId) : arrayRemove(profileId),
      }),
    ]);

    if (profile) {
      setProfile((p) => p ? {
        ...p,
        followersCount: p.followersCount + (newState ? 1 : -1)
      } : p);
    }
  };

  const renderGridPost = ({ item }: { item: Post }) => (
    <TouchableOpacity
      style={styles.gridItem}
      onPress={() => router.push({ pathname: '/post/[id]', params: { id: item.id } })}
      activeOpacity={0.85}
    >
      <Image source={{ uri: item.imageUrl }} style={styles.gridImage} />
      {item.likesCount > 0 && (
        <View style={styles.gridOverlay}>
          <Feather name="heart" size={14} color="#fff" />
          <Text style={styles.gridOverlayText}>{item.likesCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>User not found</Text>
      </View>
    );
  }

  const displayPosts = activeTab === 'posts' ? posts : savedPosts;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Nav Bar ── */}
      <View style={styles.navBar}>
        {!isOwnProfile && (
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        )}
        <Text style={styles.navUsername}>@{profile.username}</Text>
        <TouchableOpacity style={styles.moreBtn}>
          <Feather name="more-horizontal" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadProfile(); }}
            tintColor={Colors.primary}
          />
        }
      >
        {/* ── Profile Header ── */}
        <View style={styles.profileHeader}>
          {/* Avatar + Stats Row */}
          <View style={styles.avatarStatsRow}>
            <View style={styles.avatarWrap}>
              <Image
                source={{ uri: profile.avatar || `https://i.pravatar.cc/200?u=${profile.id}` }}
                style={styles.avatar}
              />
              {isOwnProfile && (
                <TouchableOpacity
                  style={styles.editAvatarBtn}
                  onPress={() => router.push('/edit-profile')}
                >
                  <Feather name="plus" size={14} color={Colors.textPrimary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              {[
                { label: 'Posts', value: profile.postsCount },
                { label: 'Followers', value: profile.followersCount },
                { label: 'Following', value: profile.followingCount },
              ].map((stat) => (
                <View key={stat.label} style={styles.stat}>
                  <Text style={styles.statValue}>{formatCount(stat.value)}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Name + Bio */}
          <View style={styles.bioSection}>
            <Text style={styles.displayName}>{profile.displayName}</Text>
            {profile.bio ? (
              <Text style={styles.bio}>{profile.bio}</Text>
            ) : isOwnProfile ? (
              <TouchableOpacity onPress={() => router.push('/edit-profile')}>
                <Text style={styles.addBio}>+ Add bio</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionBtns}>
            {isOwnProfile ? (
              <>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => router.push('/edit-profile')}
                >
                  <Text style={styles.editBtnText}>Edit Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.shareBtn}>
                  <Feather name="share-2" size={16} color={Colors.textPrimary} />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.followBtn, isFollowing && styles.followingBtn]}
                  onPress={handleFollow}
                >
                  <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
                    {isFollowing ? 'Following' : 'Follow'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.messageBtn}>
                  <Text style={styles.messageBtnText}>Message</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.shareBtn}>
                  <Feather name="user-plus" size={16} color={Colors.textPrimary} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* ── Story Highlights ── */}
        <View style={styles.highlightsSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.highlights}>
            {isOwnProfile && (
              <TouchableOpacity style={styles.highlight} onPress={() => router.push('/add-highlight')}>
                <View style={styles.highlightAddCircle}>
                  <Feather name="plus" size={22} color={Colors.primary} />
                </View>
                <Text style={styles.highlightLabel}>New</Text>
              </TouchableOpacity>
            )}
            {/* Placeholder highlights — replace with real data */}
            {['Summer', 'Deals', 'Nike', 'ZARA'].map((name, i) => (
              <TouchableOpacity key={name} style={styles.highlight}>
                <View style={styles.highlightCircle}>
                  <Image
                    source={{ uri: `https://picsum.photos/80/80?random=${i + 10}` }}
                    style={styles.highlightImage}
                  />
                </View>
                <Text style={styles.highlightLabel}>{name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── Tabs ── */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'posts' && styles.tabActive]}
            onPress={() => setActiveTab('posts')}
          >
            <Feather
              name="grid"
              size={20}
              color={activeTab === 'posts' ? Colors.primary : Colors.textMuted}
            />
          </TouchableOpacity>
          {isOwnProfile && (
            <TouchableOpacity
              style={[styles.tab, activeTab === 'saved' && styles.tabActive]}
              onPress={() => setActiveTab('saved')}
            >
              <Feather
                name="bookmark"
                size={20}
                color={activeTab === 'saved' ? Colors.primary : Colors.textMuted}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Posts Grid ── */}
        {displayPosts.length === 0 ? (
          <View style={styles.emptyGrid}>
            <Feather name="camera" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>
              {activeTab === 'posts' ? 'No posts yet' : 'No saved deals yet'}
            </Text>
            {isOwnProfile && activeTab === 'posts' && (
              <TouchableOpacity
                style={styles.firstPostBtn}
                onPress={() => router.push('/(tabs)/create')}
              >
                <Text style={styles.firstPostBtnText}>Share your first find</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            data={displayPosts}
            renderItem={renderGridPost}
            keyExtractor={(p) => p.id}
            numColumns={3}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 1.5 }} />}
          />
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const formatCount = (n: number = 0) =>
  n >= 1000 ? (n / 1000).toFixed(1) + 'k' : n.toString();

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  navUsername: {
    fontFamily: 'DMSans-Bold',
    fontSize: Typography.md,
    color: Colors.textPrimary,
  },
  moreBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  profileHeader: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.base,
  },
  avatarStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xl,
    marginBottom: Spacing.md,
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 3,
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  statsRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center', gap: 2 },
  statValue: {
    fontFamily: 'DMSans-Bold',
    fontSize: Typography.lg,
    color: Colors.textPrimary,
  },
  statLabel: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: Colors.textMuted,
  },
  bioSection: { marginBottom: Spacing.md, gap: 3 },
  displayName: {
    fontFamily: 'Playfair-Bold',
    fontSize: Typography.md,
    color: Colors.textPrimary,
  },
  bio: {
    fontFamily: 'DMSans-Regular',
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  addBio: {
    fontFamily: 'DMSans-Medium',
    fontSize: Typography.sm,
    color: Colors.textMuted,
  },
  actionBtns: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  editBtn: {
    flex: 1,
    height: 34,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnText: {
    fontFamily: 'DMSans-Bold',
    fontSize: Typography.sm,
    color: Colors.textPrimary,
  },
  followBtn: {
    flex: 1,
    height: 34,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followingBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  followBtnText: {
    fontFamily: 'DMSans-Bold',
    fontSize: Typography.sm,
    color: Colors.textPrimary,
  },
  followingBtnText: { color: Colors.textSecondary },
  messageBtn: {
    flex: 1,
    height: 34,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBtnText: {
    fontFamily: 'DMSans-Bold',
    fontSize: Typography.sm,
    color: Colors.textPrimary,
  },
  shareBtn: {
    width: 34,
    height: 34,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightsSection: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
  },
  highlights: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.base,
  },
  highlight: { alignItems: 'center', gap: 6 },
  highlightCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2,
    borderColor: Colors.primary,
    padding: 2,
    overflow: 'hidden',
  },
  highlightAddCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightImage: { width: '100%', height: '100%', borderRadius: 28 },
  highlightLabel: {
    fontFamily: 'DMSans-Regular',
    fontSize: 11,
    color: Colors.textSecondary,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: Colors.primary },
  emptyGrid: {
    paddingVertical: Spacing['4xl'],
    alignItems: 'center',
    gap: Spacing.md,
  },
  emptyText: {
    fontFamily: 'DMSans-Regular',
    fontSize: Typography.base,
    color: Colors.textMuted,
  },
  firstPostBtn: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
  },
  firstPostBtnText: {
    fontFamily: 'DMSans-Bold',
    fontSize: Typography.sm,
    color: Colors.textPrimary,
  },
  gridItem: {
    width: GRID_SIZE,
    height: GRID_SIZE,
    backgroundColor: Colors.surface,
    margin: 0.75,
  },
  gridImage: { width: '100%', height: '100%' },
  gridOverlay: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  gridOverlayText: {
    fontFamily: 'DMSans-Bold',
    fontSize: 12,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 4,
  },
  errorText: {
    fontFamily: 'DMSans-Regular',
    color: Colors.textMuted,
    fontSize: Typography.base,
  },
});
