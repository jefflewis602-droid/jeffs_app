import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/lib/theme';
import { Card } from '@/components/ui/Card';

interface VendorInvoice {
  id: string;
  vendor_name: string;
  description: string;
  amount: number;
  invoice_date: string;
  customers: { name: string } | null;
}

export default function VendorInvoicesScreen() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<VendorInvoice[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    const { data } = await supabase
      .from('vendor_invoices')
      .select('id, vendor_name, description, amount, invoice_date, customers(name)')
      .is('invoice_id', null)
      .order('invoice_date', { ascending: false });
    setInvoices((data as unknown as VendorInvoice[]) ?? []);
  }

  async function refresh() { setRefreshing(true); await load(); setRefreshing(false); }

  useEffect(() => { load(); }, []);

  const total = invoices.reduce((s, i) => s + i.amount, 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Material Costs</Text>
          <Text style={styles.subtitle}>Unbilled: ${total.toFixed(2)}</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/(owner)/vendor-invoices/new')}>
          <Text style={styles.addText}>+ Add</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.accent} />}
      >
        {invoices.map((inv) => (
          <Card key={inv.id} style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.vendor}>{inv.vendor_name}</Text>
              <Text style={styles.amount}>${inv.amount.toFixed(2)}</Text>
            </View>
            <Text style={styles.desc}>{inv.description}</Text>
            <Text style={styles.sub}>{inv.customers?.name ?? '—'} · {inv.invoice_date}</Text>
          </Card>
        ))}
        {invoices.length === 0 && (
          <Card><Text style={styles.empty}>No unbilled material costs.</Text></Card>
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
  subtitle: { color: Colors.accentLight, fontSize: 13 },
  addBtn: { backgroundColor: Colors.accent, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  addText: { color: Colors.text, fontWeight: '600', fontSize: 14 },
  content: { padding: Spacing.md, gap: Spacing.sm },
  card: { gap: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  vendor: { color: Colors.text, fontSize: 15, fontWeight: '600' },
  amount: { color: Colors.accentLight, fontSize: 15, fontWeight: '700' },
  desc: { color: Colors.textSecondary, fontSize: 13 },
  sub: { color: Colors.textMuted, fontSize: 12 },
  empty: { color: Colors.textMuted, textAlign: 'center', fontSize: 14 },
});
