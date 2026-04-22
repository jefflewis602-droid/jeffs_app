import { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing } from '@/lib/theme';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function NewCustomerScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [monthlyRate, setMonthlyRate] = useState('');
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!name.trim()) { Alert.alert('Name required'); return; }
    const rate = parseFloat(monthlyRate);
    if (isNaN(rate) || rate < 0) { Alert.alert('Enter a valid monthly rate'); return; }

    setLoading(true);
    const { error } = await supabase.from('customers').insert({
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      address: address.trim() || null,
      monthly_rate: rate,
    });
    setLoading(false);

    if (error) { Alert.alert('Error', error.message); return; }
    router.back();
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader title="New Customer" showBack />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Input label="Customer Name *" value={name} onChangeText={setName} placeholder="e.g. John Smith" />
        <Input label="Monthly Rate ($) *" value={monthlyRate} onChangeText={setMonthlyRate} placeholder="150" keyboardType="decimal-pad" />
        <Input label="Email" value={email} onChangeText={setEmail} placeholder="john@example.com" keyboardType="email-address" autoCapitalize="none" />
        <Input label="Phone" value={phone} onChangeText={setPhone} placeholder="(555) 555-5555" keyboardType="phone-pad" />
        <Input label="Address" value={address} onChangeText={setAddress} placeholder="456 Oak Ave, City, UT" />
        <Button label="Save Customer" onPress={save} loading={loading} style={styles.btn} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, gap: Spacing.md },
  btn: { marginTop: Spacing.md },
});
