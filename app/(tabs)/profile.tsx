import { useSelector } from 'react-redux';
import { Redirect } from 'expo-router';
import { RootState } from '../../store';

// The profile tab just redirects to the dynamic profile page for the current user
export default function ProfileTab() {
  const { user } = useSelector((s: RootState) => s.auth);
  if (!user) return <Redirect href="/(auth)/login" />;
  return <Redirect href={{ pathname: '/profile/[id]', params: { id: user.id } }} />;
}
