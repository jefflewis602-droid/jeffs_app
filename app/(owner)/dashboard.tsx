import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Colors, Spacing, Radius } from '@/lib/theme';
import { Card } from '@/components/ui/Card';

interface CustomerSummary {
  customer_id: string;
  customer_name: string;
  unbilled_hours: number;
  unbilled_amount: number;
}

interface InvoiceSummary {
  pending_count: number;
  pending_total: number;
}

export default function DashboardScreen() {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const [unbilledByCustomer, setUnbilledByCustomer] = useState<CustomerSummary[]>([]);
  const [invoiceSummary, setInvoiceSummary] = useState<InvoiceSummary>({ pending_count: 0, pending_total: 0 });
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    const [entriesRes, invoicesRes] = await Promise.all([
      supabase
        .from('time_entries')
        .select('hours, task_types(hourly_rate), customers(id, name)')
        .is('invoice_id', null),
      supabase
        .from('invoices')
        .select('total')
        .eq('status', 'sent'),
    ]);

    if (entriesRes.data) {
      const map = new Map<string, CustomerSummary>();
      for (const entry of entriesRes.data as any[]) {
        const cid = entry.customers?.id;
        const cname = entry.customers?.name ?? 'Unknown';
        const rate = entry.task_types?.hourly_rate ?? 0;
        const hours = entry.hours ?? 0;
        if (!map.has(cid)) map.set(cid, { customer_id: cid, customer_name: cname, unbilled_hours: 0, unbilled_amount: 0 });
        const s = map.get(cid)!;
        s.unbilled_hours += hours;
        s.unbilled_amount += hours * rate;
      }
      setUnbilledByCustomer(Array.from(map.values()));
    }

    if (invoicesRes.data) {
      const total = invoicesRes.data.reduce((sum, inv) => sum + (inv.total ?? 0), 0);
      setInvoiceSummary({ pending_count: invoicesRes.data.length, pending_total: total });
    }
  }

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  const totalUnbilledAmount = unbilledByCustomer.reduce((s, c) => s + c.unbilled_amount, 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hey, {profile?.full_name?.split(' ')[0] ?? 'Jeff'}</Text>
          <Text style={styles.subtitle}>TLC Landscape</Text>
        </View>
        <TouchableOpacity onPress={signOut} style={styles.signOutBtn}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.accent} />}
      >
        <View style={styles.statRow}>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Unbilled Work</Text>
            <Text style={styles.statValue}>${totalUnbilledAmount.toFixed(2)}</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Awaiting Payment</Text>
            <Text style={styles.statValue}>${invoiceSummary.pending_total.toFixed(2)}</Text>
            <Text style={styles.statSub}>{invoiceSummary.pending_count} invoice{invoiceSummary.pending_count !== 1 ? 's' : ''} sent</Text>
          </Card>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(owner)/invoices/generate')}>
            <Text style={styles.actionIcon}>📄</Text>
            <Text style={styles.actionLabel}>Generate Invoice</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(owner)/vendor-invoices/new')}>
            <Text style={styles.actionIcon}>🧾</Text>
            <Text style={styles.actionLabel}>Add Material Cost</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(owner)/customers/new')}>
            <Text style={styles.actionIcon}>👤</Text>
            <Text style={styles.actionLabel}>Add Customer</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Unbilled Hours by Customer</Text>
        {unbilledByCustomer.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>No unbilled hours — you're all caught up!</Text>
          </Card>
        ) : (
          unbilledByCustomer.map((c) => (
            <Card key={c.customer_id} style={styles.customerRow}>
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>{c.customer_name}</Text>
                <Text style={styles.customerHours}>{c.unbilled_hours.toFixed(1)} hrs</Text>
              </View>
              <Text style={styles.customerAmount}>${c.unbilled_amount.toFixed(2)}</Text>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  greeting: { color: Colors.text, fontSize: 20, fontWeight: '700' },
  subtitle: { color: Colors.accentLight, fontSize: 13, letterSpacing: 1 },
  signOutBtn: { padding: Spacing.xs },
  signOutText: { color: Colors.textMuted, fontSize: 13 },
  content: { padding: Spacing.md, gap: Spacing.md },
  statRow: { flexDirection: 'row', gap: Spacing.md },
  statCard: { flex: 1, gap: Spacing.xs },
  statLabel: { color: Colors.textSecondary, fontSize: 12, letterSpacing: 0.5 },
  statValue: { color: Colors.accentLight, fontSize: 24, fontWeight: '700' },
  statSub: { color: Colors.textMuted, fontSize: 12 },
  quickActions: { flexDirection: 'row', gap: Spacing.sm },
  actionBtn: {
    flex: 1,
    backgroundColor: Colors.surfaceRaised,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionIcon: { fontSize: 22 },
  actionLabel: { color: Colors.text, fontSize: 11, textAlign: 'center', fontWeight: '500' },
  sectionTitle: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600', letterSpacing: 1 },
  emptyText: { color: Colors.textMuted, textAlign: 'center', fontSize: 14 },
  customerRow: { gap: Spacing.xs },
  customerInfo: { flexDirection: 'row', justifyContent: 'space-between' },
  customerName: { color: Colors.text, fontSize: 15, fontWeight: '600' },
  customerHours: { color: Colors.textSecondary, fontSize: 14 },
  customerAmount: { color: Colors.accentLight, fontSize: 18, fontWeight: '700' },
});
