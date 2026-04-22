import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/lib/theme';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const INVOICE_VIEWER_URL = process.env.EXPO_PUBLIC_INVOICE_VIEWER_URL ?? 'https://tlc-invoices.vercel.app';

interface Invoice {
  id: string;
  billing_period_start: string;
  billing_period_end: string;
  monthly_rate_charged: number;
  subtotal_hourly: number;
  subtotal_materials: number;
  total: number;
  status: 'draft' | 'sent' | 'paid';
  share_token: string;
  pdf_url: string | null;
  sent_at: string | null;
  customers: { name: string; email: string | null } | null;
}

interface LineItem {
  id: string;
  line_type: string;
  description: string;
  amount: number;
}

const STATUS_COLOR: Record<string, string> = {
  draft: Colors.textMuted,
  sent: Colors.warning,
  paid: Colors.success,
};

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [sendingPdf, setSendingPdf] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);

  async function load() {
    const [invRes, liRes] = await Promise.all([
      supabase.from('invoices').select('*, customers(name, email)').eq('id', id).single(),
      supabase.from('invoice_line_items').select('id, line_type, description, amount').eq('invoice_id', id).order('line_type'),
    ]);
    setInvoice(invRes.data as unknown as Invoice ?? null);
    setLineItems(liRes.data ?? []);
  }

  useEffect(() => { load(); }, [id]);

  async function generateAndSendEmail() {
    if (!invoice) return;
    if (!invoice.customers?.email) { Alert.alert('No email', 'This customer has no email address on file.'); return; }

    setSendingPdf(true);
    const { error: pdfError } = await supabase.functions.invoke('generate-invoice-pdf', { body: { invoice_id: id } });
    setSendingPdf(false);

    if (pdfError) { Alert.alert('PDF Error', pdfError.message); return; }

    setSendingEmail(true);
    const { error: emailError } = await supabase.functions.invoke('send-invoice-email', { body: { invoice_id: id } });
    setSendingEmail(false);

    if (emailError) { Alert.alert('Email Error', emailError.message); return; }

    Alert.alert('Sent!', `Invoice emailed to ${invoice.customers.email}`);
    load();
  }

  async function copyShareLink() {
    if (!invoice) return;
    const url = `${INVOICE_VIEWER_URL}/invoice/${invoice.share_token}`;
    await Clipboard.setStringAsync(url);
    Alert.alert('Link copied', url);
  }

  async function markPaid() {
    setMarkingPaid(true);
    await supabase.from('invoices').update({ status: 'paid' }).eq('id', id);
    setMarkingPaid(false);
    load();
  }

  if (!invoice) return null;

  const shareUrl = `${INVOICE_VIEWER_URL}/invoice/${invoice.share_token}`;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader title="Invoice" showBack />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.customerName}>{invoice.customers?.name ?? '—'}</Text>
            <Text style={[styles.statusBadge, { color: STATUS_COLOR[invoice.status] }]}>
              {invoice.status.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.period}>{invoice.billing_period_start} → {invoice.billing_period_end}</Text>
          {invoice.sent_at && <Text style={styles.sentAt}>Sent {new Date(invoice.sent_at).toLocaleDateString()}</Text>}
        </Card>

        <Text style={styles.sectionTitle}>Line Items</Text>
        {lineItems.map((item) => (
          <Card key={item.id} style={styles.lineItem}>
            <View style={styles.lineRow}>
              <Text style={styles.lineDesc}>{item.description}</Text>
              <Text style={styles.lineAmount}>${item.amount.toFixed(2)}</Text>
            </View>
            <Text style={styles.lineType}>{item.line_type}</Text>
          </Card>
        ))}

        <Card style={styles.totalCard}>
          <View style={styles.lineRow}>
            <Text style={styles.totalLabel}>TOTAL DUE</Text>
            <Text style={styles.totalAmount}>${invoice.total.toFixed(2)}</Text>
          </View>
        </Card>

        {invoice.status === 'draft' && (
          <Button
            label={sendingPdf ? 'Generating PDF...' : sendingEmail ? 'Sending Email...' : 'Generate PDF & Email Customer'}
            onPress={generateAndSendEmail}
            loading={sendingPdf || sendingEmail}
          />
        )}

        {invoice.status === 'sent' && (
          <Button label="Mark as Paid" onPress={markPaid} loading={markingPaid} variant="secondary" />
        )}

        <TouchableOpacity style={styles.linkBtn} onPress={copyShareLink}>
          <Text style={styles.linkLabel}>Copy Shareable Link</Text>
          <Text style={styles.linkUrl} numberOfLines={1}>{shareUrl}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, gap: Spacing.md },
  summaryCard: { gap: Spacing.xs },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  customerName: { color: Colors.text, fontSize: 18, fontWeight: '700' },
  statusBadge: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  period: { color: Colors.textSecondary, fontSize: 13 },
  sentAt: { color: Colors.textMuted, fontSize: 12 },
  sectionTitle: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600', letterSpacing: 1 },
  lineItem: { gap: 2 },
  lineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  lineDesc: { color: Colors.text, fontSize: 14, flex: 1, paddingRight: Spacing.sm },
  lineAmount: { color: Colors.accentLight, fontSize: 14, fontWeight: '700' },
  lineType: { color: Colors.textMuted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  totalCard: { borderColor: Colors.accent },
  totalLabel: { color: Colors.text, fontSize: 16, fontWeight: '700', letterSpacing: 1 },
  totalAmount: { color: Colors.accentLight, fontSize: 24, fontWeight: '700' },
  linkBtn: {
    backgroundColor: Colors.surfaceRaised, borderRadius: Radius.md,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, gap: 4,
  },
  linkLabel: { color: Colors.accentLight, fontSize: 14, fontWeight: '600' },
  linkUrl: { color: Colors.textMuted, fontSize: 12 },
});
