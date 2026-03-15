import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Image, ScrollView, KeyboardAvoidingView, Platform,
  Alert, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { RootState, AppDispatch } from '../../store';
import { createPost } from '../../services/postService';
import { addNewPost } from '../../store/feedSlice';
import { validateUrl, normalizeUrl } from '../../services/aiService';

export default function CreateScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const insets = useSafeAreaInsets();
  const { user } = useSelector((s: RootState) => s.auth);

  const [image, setImage] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [storeName, setStoreName] = useState('');
  const [storeUrl, setStoreUrl] = useState('');
  const [tags, setTags] = useState('');
  const [urlValid, setUrlValid] = useState<boolean | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const pickImage = async (source: 'camera' | 'gallery') => {
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 5],
          quality: 0.85,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 5],
          quality: 0.85,
        });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleUrlChange = (url: string) => {
    setStoreUrl(url);
    if (url.length > 5) {
      setUrlValid(validateUrl(normalizeUrl(url)));
    } else {
      setUrlValid(null);
    }
  };

  const handlePost = async () => {
    if (!image) { Alert.alert('No image', 'Please select a photo first'); return; }
    if (!storeName) { Alert.alert('Missing info', 'Please enter the store name'); return; }
    if (!storeUrl) { Alert.alert('Missing info', 'Please add the store URL'); return; }
    if (urlValid === false) { Alert.alert('Invalid URL', 'Please enter a valid store URL'); return; }
    if (!user) return;

    setUploading(true);
    try {
      const post = await createPost(
        user.id,
        image,
        {
          caption,
          storeName,
          storeUrl: normalizeUrl(storeUrl),
          tags: tags.split(' ').filter((t) => t.startsWith('#')).map((t) => t.slice(1)),
        },
        setProgress
      );
      dispatch(addNewPost({ ...post, author: user, isLiked: false, isSaved: false }));
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to post. Please try again.');
    }
    setUploading(false);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Feather name="x" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Find</Text>
        <TouchableOpacity
          style={[styles.postBtn, uploading && styles.postBtnDisabled]}
          onPress={handlePost}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color={Colors.textPrimary} />
          ) : (
            <Text style={styles.postBtnText}>Share</Text>
          )}
        </TouchableOpacity>
      </View>

      {uploading && (
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Image Picker */}
        {image ? (
          <View style={styles.imageWrap}>
            <Image source={{ uri: image }} style={styles.previewImage} />
            <TouchableOpacity
              style={styles.changeImageBtn}
              onPress={() => setImage(null)}
            >
              <Feather name="refresh-cw" size={16} color={Colors.textPrimary} />
              <Text style={styles.changeImageText}>Change</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.imagePicker}>
            <TouchableOpacity style={styles.pickOption} onPress={() => pickImage('camera')}>
              <Feather name="camera" size={28} color={Colors.primary} />
              <Text style={styles.pickOptionText}>Camera</Text>
            </TouchableOpacity>
            <View style={styles.pickDivider} />
            <TouchableOpacity style={styles.pickOption} onPress={() => pickImage('gallery')}>
              <Feather name="image" size={28} color={Colors.primary} />
              <Text style={styles.pickOptionText}>Gallery</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Caption */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Caption</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Tell us about this find..."
            placeholderTextColor={Colors.textMuted}
            value={caption}
            onChangeText={setCaption}
            multiline
            numberOfLines={3}
            maxLength={500}
          />
        </View>

        {/* Store Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Store Name *</Text>
          <View style={styles.inputRow}>
            <Feather name="shopping-bag" size={18} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.inputInline}
              placeholder="e.g. Nike, ZARA, Nordstrom..."
              placeholderTextColor={Colors.textMuted}
              value={storeName}
              onChangeText={setStoreName}
            />
          </View>
        </View>

        {/* Store URL */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Store URL *</Text>
          <View style={[styles.inputRow, urlValid === false && styles.inputError, urlValid === true && styles.inputSuccess]}>
            <Feather name="link" size={18} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.inputInline}
              placeholder="https://store.com/product"
              placeholderTextColor={Colors.textMuted}
              value={storeUrl}
              onChangeText={handleUrlChange}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {urlValid === true && <Feather name="check-circle" size={18} color={Colors.success} style={{ marginRight: Spacing.sm }} />}
            {urlValid === false && <Feather name="alert-circle" size={18} color={Colors.error} style={{ marginRight: Spacing.sm }} />}
          </View>
          {urlValid === false && (
            <Text style={styles.urlError}>Please enter a valid URL (include https://)</Text>
          )}
        </View>

        {/* Tags */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Tags</Text>
          <View style={styles.inputRow}>
            <Feather name="hash" size={18} color={Colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.inputInline}
              placeholder="#fashion #deals #streetwear"
              placeholderTextColor={Colors.textMuted}
              value={tags}
              onChangeText={setTags}
              autoCapitalize="none"
            />
          </View>
        </View>

        <View style={{ height: Spacing['2xl'] }} />
      </ScrollView>
    </KeyboardAvoidingView>
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
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    fontFamily: 'Playfair-Bold',
    fontSize: Typography.lg,
    color: Colors.textPrimary,
  },
  postBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    minWidth: 70,
    alignItems: 'center',
  },
  postBtnDisabled: { opacity: 0.5 },
  postBtnText: {
    fontFamily: 'DMSans-Bold',
    fontSize: Typography.sm,
    color: Colors.textPrimary,
  },
  progressBar: {
    height: 3,
    backgroundColor: Colors.border,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  scroll: { padding: Spacing.base, gap: Spacing.base },
  imagePicker: {
    height: 200,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  pickOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  pickDivider: { width: 1, backgroundColor: Colors.border, marginVertical: Spacing.xl },
  pickOptionText: {
    fontFamily: 'DMSans-Medium',
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
  imageWrap: { position: 'relative' },
  previewImage: {
    width: '100%',
    height: 300,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
  },
  changeImageBtn: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  changeImageText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: Colors.textPrimary,
  },
  fieldGroup: { gap: 6 },
  label: {
    fontFamily: 'DMSans-Medium',
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    fontFamily: 'DMSans-Regular',
    fontSize: Typography.base,
    color: Colors.textPrimary,
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
    paddingTop: Spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 52,
  },
  inputError: { borderColor: Colors.error },
  inputSuccess: { borderColor: Colors.success },
  inputIcon: { marginLeft: Spacing.base },
  inputInline: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
    fontFamily: 'DMSans-Regular',
    fontSize: Typography.base,
    color: Colors.textPrimary,
  },
  urlError: {
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    color: Colors.error,
    marginTop: 2,
  },
});
