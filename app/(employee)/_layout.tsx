import { Tabs } from 'expo-router';
import { Colors } from '@/lib/theme';

export default function EmployeeLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: Colors.surface, borderTopColor: Colors.border },
        tabBarActiveTintColor: Colors.accentLight,
        tabBarInactiveTintColor: Colors.textMuted,
      }}
    >
      <Tabs.Screen name="log-hours" options={{ title: 'Log Hours', tabBarLabel: 'Log Hours' }} />
      <Tabs.Screen name="my-entries" options={{ title: 'My Entries', tabBarLabel: 'My Entries' }} />
    </Tabs>
  );
}
