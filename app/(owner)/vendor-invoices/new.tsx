import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/lib/theme';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface Customer { id: string; name: string; }

export default function NewVendorInvoiceScreen() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [vendorName, setVendorName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);

  useEffect(() => {
    supabase.from('customers').select('id, name').eq('is_active', true).order('name')
      .then(({ data }) => setCustomers(data ?? []));
  }, []);

  async function pickReceipt() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!result.canceled) setReceiptUri(result.assets[0].uri);
  }

  async function save() {
    if (!selectedCustomer) { Alert.alert('Select a customer'); return; }
    if (!vendorName.trim()) { Alert.alert('Vendor name required'); return; }
    if (!description.trim()) { Alert.alert('Description required'); return; }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { Alert.alert('Enter a valid amount'); return; }

    setLoading(true);
    let receiptUrl: string | null = null;

    if (receiptUri) {
      const filename = `receipt_${Date.now()}.jpg`;
      const response = await fetch(receiptUri);
      const blob = await response.blob();
      const { data: uploadData } = await supabase.storage.from('receipts').upload(filename, blob, { contentType: 'image/jpeg' });
      if (uploadData) {
        const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(uploadData.path);
        receiptUrl = urlData.publicUrl;
      }
    }

    const { error } = await supabase.from('vendor_invoices').insert({
      customer_id: selectedCustomer.id,
      vendor_name: vendorName.trim(),
      description: description.trim(),
      amount: amt,
      invoice_date: invoiceDate,
      receipt_url: receiptUrl,
    });
    setLoading(false);
    if (error) { Alert.alert('Error', error.message); return; }
    router.back();
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader title="Add Material Cost" showBack />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View>
          <Text style={styles.label}>Customer *</Text>
          <TouchableOpacity style={styles.picker} onPress={() => setShowCustomerPicker(true)}>
            <Text style={selectedCustomer ? styles.pickerValue : styles.pickerPlaceholder}>
              {selectedCustomer?.name ?? 'Select customer...'}
            </Text>
          </TouchableOpacity>
          {showCustomerPicker && (
            <View style={styles.dropdown}>
              {customers.map((c) => (
                <TouchableOpacity key={c.id} style={styles.dropdownItem} onPress={() => { setSelectedCustomer(c); setShowCustomerPicker(false); }}>
                  <Text style={styles.dropdownText}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <Input label="Vendor / Supplier *" value={vendorName} onChangeText={setVendorName} placeholder="e.g. Valley Mulch Co." />
        <Input label="Description *" value={description} onChangeText={setDescription} placeholder="e.g. 5 yards of brown mulch for front beds" multiline />
        <Input label="Amount ($) *" value={amount} onChangeText={setAmount} placeholder="85.00" keyboardType="decimal-pad" />
        <Input label="Date *" value={invoiceDate} onChangeText={setInvoiceDate} placeholder="YYYY-MM-DD" />

        <View>
          <Text style={styles.label}>Receipt Photo (optional)</Text>
          <TouchableOpacity style={styles.receiptBtn} onPress={pickReceipt}>
            {receiptUri ? (
              <Image source={{ uri: receiptUri }} style={styles.receiptPreview} />
            ) : (
              <Text style={styles.receiptPlaceholder}>📷  Tap to attach receipt</Text>
            )}
          </TouchableOpacity>
        </View>

        <Button label="Save Material Cost" onPress={save} loading={loading} style={styles.btn} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, gap: Spacing.md },
  label: { color: Colors.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: Spacing.xs },
  picker: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, padding: Spacing.md,
  },
  pickerValue: { color: Colors.text, fontSize: 16 },
  pickerPlaceholder: { color: Colors.textMuted, fontSize: 16 },
  dropdown: { backgroundColor: Colors.surfaceRaised, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, marginTop: 4 },
  dropdownItem: { padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dropdownText: { color: Colors.text, fontSize: 15 },
  receiptBtn: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, height: 120, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  receiptPlaceholder: { color: Colors.textMuted, fontSize: 14 },
  receiptPreview: { width: '100%', height: '100%' },
  btn: { marginTop: Spacing.sm },
});
