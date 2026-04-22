import { Tabs } from 'expo-router';
import { Colors } from '@/lib/theme';

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Dashboard: '⊞',
    Customers: '👤',
    Hours: '⏱',
    Invoices: '📄',
    More: '☰',
  };
  return null; // icons rendered via tabBarLabel only (emoji + text approach)
}

export default function OwnerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
        },
        tabBarActiveTintColor: Colors.accentLight,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: 'Dashboard', tabBarLabel: 'Dashboard' }}
      />
      <Tabs.Screen
        name="customers/index"
        options={{ title: 'Customers', tabBarLabel: 'Customers' }}
      />
      <Tabs.Screen
        name="invoices/index"
        options={{ title: 'Invoices', tabBarLabel: 'Invoices' }}
      />
      <Tabs.Screen
        name="task-types/index"
        options={{ title: 'Rates', tabBarLabel: 'Rates' }}
      />
      <Tabs.Screen
        name="employees/index"
        options={{ title: 'Team', tabBarLabel: 'Team' }}
      />
      {/* Hide these from tab bar */}
      <Tabs.Screen name="customers/new" options={{ href: null }} />
      <Tabs.Screen name="customers/[id]" options={{ href: null }} />
      <Tabs.Screen name="task-types/new" options={{ href: null }} />
      <Tabs.Screen name="vendor-invoices/index" options={{ href: null }} />
      <Tabs.Screen name="vendor-invoices/new" options={{ href: null }} />
      <Tabs.Screen name="invoices/generate" options={{ href: null }} />
      <Tabs.Screen name="invoices/[id]" options={{ href: null }} />
    </Tabs>
  );
}
