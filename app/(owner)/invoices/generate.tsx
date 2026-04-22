import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/lib/theme';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface Customer { id: string; name: string; monthly_rate: number; }

interface LineItemPreview {
  line_type: 'flat_rate' | 'hourly' | 'material';
  description: string;
  amount: number;
  quantity?: number;
  unit_rate?: number;
  source_ids: string[];
}

export default function GenerateInvoiceScreen() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [lineItems, setLineItems] = useState<LineItemPreview[]>([]);
  const [previewed, setPreviewed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('customers').select('id, name, monthly_rate').eq('is_active', true).order('name')
      .then(({ data }) => setCustomers((data as Customer[]) ?? []));

    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    setPeriodStart(firstDay);
    setPeriodEnd(lastDay);
  }, []);

  async function buildPreview() {
    if (!selectedCustomer) { Alert.alert('Select a customer'); return; }
    if (!periodStart || !periodEnd) { Alert.alert('Set billing period'); return; }

    setLoading(true);
    const [entriesRes, vendorRes] = await Promise.all([
      supabase.from('time_entries')
        .select('id, hours, task_type_id, task_types(name, hourly_rate)')
        .eq('customer_id', selectedCustomer.id)
        .is('invoice_id', null)
        .gte('worked_date', periodStart)
        .lte('worked_date', periodEnd),
      supabase.from('vendor_invoices')
        .select('id, vendor_name, description, amount')
        .eq('customer_id', selectedCustomer.id)
        .is('invoice_id', null),
    ]);

    const items: LineItemPreview[] = [];

    items.push({
      line_type: 'flat_rate',
      description: 'Monthly Service (Mow / Edge / Blow)',
      amount: selectedCustomer.monthly_rate,
      source_ids: [],
    });

    const byTaskType = new Map<string, { name: string; rate: number; hours: number; ids: string[] }>();
    for (const e of (entriesRes.data as any[]) ?? []) {
      const tid = e.task_type_id;
      if (!byTaskType.has(tid)) {
        byTaskType.set(tid, { name: e.task_types?.name ?? tid, rate: e.task_types?.hourly_rate ?? 0, hours: 0, ids: [] });
      }
      const group = byTaskType.get(tid)!;
      group.hours += e.hours;
      group.ids.push(e.id);
    }
    for (const [, g] of byTaskType) {
      items.push({
        line_type: 'hourly',
        description: `${g.name} — ${g.hours.toFixed(1)} hrs @ $${g.rate}/hr`,
        quantity: g.hours,
        unit_rate: g.rate,
        amount: g.hours * g.rate,
        source_ids: g.ids,
      });
    }

    for (const v of (vendorRes.data as any[]) ?? []) {
      items.push({
        line_type: 'material',
        description: `${v.vendor_name}: ${v.description}`,
        amount: v.amount,
        source_ids: [v.id],
      });
    }

    setLineItems(items);
    setPreviewed(true);
    setLoading(false);
  }

  async function confirmInvoice() {
    if (!selectedCustomer || lineItems.length === 0) return;

    const hourlyItems = lineItems.filter(l => l.line_type === 'hourly');
    const materialItems = lineItems.filter(l => l.line_type === 'material');
    const total = lineItems.reduce((s, l) => s + l.amount, 0);

    setSaving(true);
    const { data: invoiceData, error: invError } = await supabase.from('invoices').insert({
      customer_id: selectedCustomer.id,
      billing_period_start: periodStart,
      billing_period_end: periodEnd,
      monthly_rate_charged: selectedCustomer.monthly_rate,
      subtotal_hourly: hourlyItems.reduce((s, l) => s + l.amount, 0),
      subtotal_materials: materialItems.reduce((s, l) => s + l.amount, 0),
      total,
      status: 'draft',
    }).select('id').single();

    if (invError || !invoiceData) { Alert.alert('Error creating invoice', invError?.message); setSaving(false); return; }

    const invoiceId = invoiceData.id;
    const lineItemRows = lineItems.map(l => ({
      invoice_id: invoiceId,
      line_type: l.line_type,
      description: l.description,
      quantity: l.quantity ?? null,
      unit_rate: l.unit_rate ?? null,
      amount: l.amount,
      source_id: l.source_ids[0] ?? null,
    }));

    await supabase.from('invoice_line_items').insert(lineItemRows);

    const timeEntryIds = lineItems.filter(l => l.line_type === 'hourly').flatMap(l => l.source_ids);
    const vendorInvoiceIds = lineItems.filter(l => l.line_type === 'material').flatMap(l => l.source_ids);

    await Promise.all([
      timeEntryIds.length > 0
        ? supabase.from('time_entries').update({ invoice_id: invoiceId }).in('id', timeEntryIds)
        : Promise.resolve(),
      vendorInvoiceIds.length > 0
        ? supabase.from('vendor_invoices').update({ invoice_id: invoiceId }).in('id', vendorInvoiceIds)
        : Promise.resolve(),
    ]);

    setSaving(false);
    router.replace({ pathname: '/(owner)/invoices/[id]', params: { id: invoiceId } });
  }

  const grandTotal = lineItems.reduce((s, l) => s + l.amount, 0);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader title="Generate Invoice" showBack />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View>
          <Text style={styles.label}>Customer *</Text>
          <TouchableOpacity style={styles.picker} onPress={() => { setShowPicker(!showPicker); setPreviewed(false); setLineItems([]); }}>
            <Text style={selectedCustomer ? styles.pickerValue : styles.pickerPlaceholder}>
              {selectedCustomer?.name ?? 'Select customer...'}
            </Text>
          </TouchableOpacity>
          {showPicker && (
            <View style={styles.dropdown}>
              {customers.map((c) => (
                <TouchableOpacity key={c.id} style={styles.dropdownItem} onPress={() => { setSelectedCustomer(c); setShowPicker(false); setPreviewed(false); setLineItems([]); }}>
                  <Text style={styles.dropdownText}>{c.name} — ${c.monthly_rate}/mo</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <Input label="Period Start (YYYY-MM-DD)" value={periodStart} onChangeText={v => { setPeriodStart(v); setPreviewed(false); setLineItems([]); }} />
        <Input label="Period End (YYYY-MM-DD)" value={periodEnd} onChangeText={v => { setPeriodEnd(v); setPreviewed(false); setLineItems([]); }} />

        {!previewed ? (
          <Button label={loading ? 'Building Preview...' : 'Preview Invoice'} onPress={buildPreview} loading={loading} />
        ) : (
          <>
            <Text style={styles.sectionTitle}>Invoice Preview</Text>
            {lineItems.map((item, i) => (
              <Card key={i} style={styles.lineItem}>
                <View style={styles.lineRow}>
                  <Text style={styles.lineDesc}>{item.description}</Text>
                  <Text style={styles.lineAmount}>${item.amount.toFixed(2)}</Text>
                </View>
                <Text style={styles.lineType}>{item.line_type}</Text>
              </Card>
            ))}
            <Card style={styles.totalCard}>
              <View style={styles.lineRow}>
                <Text style={styles.totalLabel}>TOTAL</Text>
                <Text style={styles.totalAmount}>${grandTotal.toFixed(2)}</Text>
              </View>
            </Card>
            <Button label="Confirm & Create Invoice" onPress={confirmInvoice} loading={saving} />
            <Button label="Edit Details" onPress={() => { setPreviewed(false); setLineItems([]); }} variant="secondary" />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, gap: Spacing.md },
  label: { color: Colors.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: Spacing.xs },
  picker: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: Spacing.md },
  pickerValue: { color: Colors.text, fontSize: 16 },
  pickerPlaceholder: { color: Colors.textMuted, fontSize: 16 },
  dropdown: { backgroundColor: Colors.surfaceRaised, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, marginTop: 4 },
  dropdownItem: { padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dropdownText: { color: Colors.text, fontSize: 15 },
  sectionTitle: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600', letterSpacing: 1 },
  lineItem: { gap: 2 },
  lineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  lineDesc: { color: Colors.text, fontSize: 14, flex: 1, paddingRight: Spacing.sm },
  lineAmount: { color: Colors.accentLight, fontSize: 14, fontWeight: '700' },
  lineType: { color: Colors.textMuted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  totalCard: { borderColor: Colors.accent },
  totalLabel: { color: Colors.text, fontSize: 16, fontWeight: '700', letterSpacing: 1 },
  totalAmount: { color: Colors.accentLight, fontSize: 22, fontWeight: '700' },
});
