import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/lib/theme';
import { Card } from '@/components/ui/Card';

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  monthly_rate: number;
  is_active: boolean;
}

export default function CustomersScreen() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .order('name');
    setCustomers(data ?? []);
  }

  async function refresh() { setRefreshing(true); await load(); setRefreshing(false); }

  useEffect(() => { load(); }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Customers</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/(owner)/customers/new')}>
          <Text style={styles.addText}>+ Add</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.accent} />}
      >
        {customers.map((c) => (
          <TouchableOpacity key={c.id} onPress={() => router.push({ pathname: '/(owner)/customers/[id]', params: { id: c.id } })}>
            <Card style={[styles.card, !c.is_active && styles.inactive]}>
              <View style={styles.cardRow}>
                <Text style={styles.name}>{c.name}</Text>
                <Text style={styles.rate}>${c.monthly_rate.toFixed(0)}/mo</Text>
              </View>
              <Text style={styles.sub}>{c.email ?? c.phone ?? 'No contact info'}</Text>
              {!c.is_active && <Text style={styles.inactiveLabel}>Inactive</Text>}
            </Card>
          </TouchableOpacity>
        ))}
        {customers.length === 0 && (
          <Card><Text style={styles.empty}>No customers yet. Tap + Add to create one.</Text></Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { color: Colors.text, fontSize: 20, fontWeight: '700' },
  addBtn: { backgroundColor: Colors.accent, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  addText: { color: Colors.text, fontWeight: '600', fontSize: 14 },
  content: { padding: Spacing.md, gap: Spacing.sm },
  card: { gap: 4 },
  inactive: { opacity: 0.5 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: Colors.text, fontSize: 16, fontWeight: '600' },
  rate: { color: Colors.accentLight, fontSize: 15, fontWeight: '700' },
  sub: { color: Colors.textSecondary, fontSize: 13 },
  inactiveLabel: { color: Colors.textMuted, fontSize: 12 },
  empty: { color: Colors.textMuted, textAlign: 'center', fontSize: 14 },
});
