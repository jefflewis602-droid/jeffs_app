import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/lib/theme';
import { Card } from '@/components/ui/Card';

type InvoiceStatus = 'draft' | 'sent' | 'paid';

interface Invoice {
  id: string;
  billing_period_start: string;
  billing_period_end: string;
  total: number;
  status: InvoiceStatus;
  created_at: string;
  customers: { name: string } | null;
}

const STATUS_COLOR: Record<InvoiceStatus, string> = {
  draft: Colors.textMuted,
  sent: Colors.warning,
  paid: Colors.success,
};

export default function InvoicesScreen() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filter, setFilter] = useState<InvoiceStatus | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    let query = supabase.from('invoices').select('id, billing_period_start, billing_period_end, total, status, created_at, customers(name)').order('created_at', { ascending: false });
    if (filter !== 'all') query = query.eq('status', filter);
    const { data } = await query;
    setInvoices((data as unknown as Invoice[]) ?? []);
  }

  async function refresh() { setRefreshing(true); await load(); setRefreshing(false); }

  useEffect(() => { load(); }, [filter]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Invoices</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/(owner)/invoices/generate')}>
          <Text style={styles.addText}>+ Generate</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filters}>
        {(['all', 'draft', 'sent', 'paid'] as const).map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.filterBtn, filter === s && styles.filterActive]}
            onPress={() => setFilter(s)}
          >
            <Text style={[styles.filterText, filter === s && styles.filterTextActive]}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.accent} />}
      >
        {invoices.map((inv) => (
          <TouchableOpacity key={inv.id} onPress={() => router.push({ pathname: '/(owner)/invoices/[id]', params: { id: inv.id } })}>
            <Card style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.customer}>{inv.customers?.name ?? '—'}</Text>
                <Text style={styles.total}>${inv.total.toFixed(2)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.period}>{inv.billing_period_start} → {inv.billing_period_end}</Text>
                <Text style={[styles.status, { color: STATUS_COLOR[inv.status] }]}>{inv.status.toUpperCase()}</Text>
              </View>
            </Card>
          </TouchableOpacity>
        ))}
        {invoices.length === 0 && (
          <Card><Text style={styles.empty}>No invoices yet.</Text></Card>
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
  filters: { flexDirection: 'row', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm },
  filterBtn: { paddingHorizontal: Spacing.sm, paddingVertical: 5, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border },
  filterActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  filterText: { color: Colors.textSecondary, fontSize: 13 },
  filterTextActive: { color: Colors.text, fontWeight: '600' },
  content: { padding: Spacing.md, gap: Spacing.sm },
  card: { gap: Spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  customer: { color: Colors.text, fontSize: 16, fontWeight: '600' },
  total: { color: Colors.accentLight, fontSize: 16, fontWeight: '700' },
  period: { color: Colors.textSecondary, fontSize: 12 },
  status: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  empty: { color: Colors.textMuted, textAlign: 'center', fontSize: 14 },
});
