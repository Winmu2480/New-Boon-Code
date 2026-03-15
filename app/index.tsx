import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSelector } from 'react-redux';
import { subscribeToAuth } from '../services/authService';
import { getUserDocument } from '../services/authService';
import { useDispatch } from 'react-redux';
import { setUser, clearAuth } from '../store/authSlice';
import { AppDispatch, RootState } from '../store';
import { Colors } from '../constants/theme';

export default function Index() {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((s: RootState) => s.auth);

  useEffect(() => {
    const unsubscribe = subscribeToAuth(async (fbUser) => {
      if (fbUser) {
        const userDoc = await getUserDocument(fbUser.uid);
        const token = await fbUser.getIdToken();
        if (userDoc) {
          dispatch(setUser({ user: userDoc, token }));
          router.replace('/(tabs)');
        } else {
          router.replace('/(auth)/login');
        }
      } else {
        dispatch(clearAuth());
        router.replace('/(auth)/login');
      }
    });
    return unsubscribe;
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
      <ActivityIndicator color={Colors.primary} size="large" />
    </View>
  );
}
