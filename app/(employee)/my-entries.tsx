import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Colors, Spacing } from '@/lib/theme';
import { Card } from '@/components/ui/Card';

interface Entry {
  id: string;
  hours: number;
  worked_date: string;
  notes: string | null;
  invoice_id: string | null;
  customers: { name: string } | null;
  task_types: { name: string; hourly_rate: number } | null;
}

export default function MyEntriesScreen() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    if (!user) return;
    const { data } = await supabase
      .from('time_entries')
      .select('id, hours, worked_date, notes, invoice_id, customers(name), task_types(name, hourly_rate)')
      .eq('employee_id', user.id)
      .order('worked_date', { ascending: false })
      .limit(50);
    setEntries((data as unknown as Entry[]) ?? []);
  }

  async function refresh() { setRefreshing(true); await load(); setRefreshing(false); }

  useEffect(() => { load(); }, [user]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>My Hours</Text>
        <Text style={styles.subtitle}>Last 50 entries</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.accent} />}
      >
        {entries.map((e) => (
          <Card key={e.id} style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.task}>{e.task_types?.name ?? 'Task'}</Text>
              <Text style={styles.hours}>{e.hours} hrs</Text>
            </View>
            <Text style={styles.customer}>{e.customers?.name ?? '—'}</Text>
            <View style={styles.row}>
              <Text style={styles.date}>{e.worked_date}</Text>
              <Text style={[styles.status, e.invoice_id ? styles.billed : styles.unbilled]}>
                {e.invoice_id ? 'Billed' : 'Unbilled'}
              </Text>
            </View>
            {e.notes ? <Text style={styles.notes}>{e.notes}</Text> : null}
          </Card>
        ))}
        {entries.length === 0 && (
          <Card><Text style={styles.empty}>No entries yet. Log your first hours!</Text></Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { color: Colors.text, fontSize: 20, fontWeight: '700' },
  subtitle: { color: Colors.textSecondary, fontSize: 12 },
  content: { padding: Spacing.md, gap: Spacing.sm },
  card: { gap: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  task: { color: Colors.text, fontSize: 15, fontWeight: '600' },
  hours: { color: Colors.accentLight, fontSize: 15, fontWeight: '700' },
  customer: { color: Colors.textSecondary, fontSize: 13 },
  date: { color: Colors.textMuted, fontSize: 12 },
  status: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  billed: { color: Colors.textMuted },
  unbilled: { color: Colors.success },
  notes: { color: Colors.textMuted, fontSize: 12, fontStyle: 'italic' },
  empty: { color: Colors.textMuted, textAlign: 'center', fontSize: 14 },
});
