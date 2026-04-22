import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, Switch, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing } from '@/lib/theme';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface TimeEntryRow {
  id: string;
  hours: number;
  worked_date: string;
  notes: string | null;
  task_types: { name: string; hourly_rate: number } | null;
  profiles: { full_name: string } | null;
}

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [monthlyRate, setMonthlyRate] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [unbilledEntries, setUnbilledEntries] = useState<TimeEntryRow[]>([]);

  useEffect(() => {
    async function load() {
      const [custRes, entriesRes] = await Promise.all([
        supabase.from('customers').select('*').eq('id', id).single(),
        supabase.from('time_entries')
          .select('id, hours, worked_date, notes, task_types(name, hourly_rate), profiles(full_name)')
          .eq('customer_id', id)
          .is('invoice_id', null)
          .order('worked_date', { ascending: false }),
      ]);
      if (custRes.data) {
        setName(custRes.data.name);
        setEmail(custRes.data.email ?? '');
        setPhone(custRes.data.phone ?? '');
        setAddress(custRes.data.address ?? '');
        setMonthlyRate(String(custRes.data.monthly_rate));
        setIsActive(custRes.data.is_active);
      }
      setUnbilledEntries((entriesRes.data as unknown as TimeEntryRow[]) ?? []);
    }
    load();
  }, [id]);

  async function save() {
    const rate = parseFloat(monthlyRate);
    if (isNaN(rate) || rate < 0) { Alert.alert('Enter a valid monthly rate'); return; }
    setLoading(true);
    const { error } = await supabase.from('customers').update({
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      address: address.trim() || null,
      monthly_rate: rate,
      is_active: isActive,
    }).eq('id', id);
    setLoading(false);
    if (error) { Alert.alert('Error', error.message); return; }
    Alert.alert('Saved');
  }

  const totalUnbilled = unbilledEntries.reduce((s, e) => s + e.hours * (e.task_types?.hourly_rate ?? 0), 0);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader title="Edit Customer" showBack />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Input label="Name *" value={name} onChangeText={setName} />
        <Input label="Monthly Rate ($) *" value={monthlyRate} onChangeText={setMonthlyRate} keyboardType="decimal-pad" />
        <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Input label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Input label="Address" value={address} onChangeText={setAddress} />
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Active Customer</Text>
          <Switch
            value={isActive}
            onValueChange={setIsActive}
            trackColor={{ true: Colors.accent, false: Colors.border }}
            thumbColor={Colors.text}
          />
        </View>
        <Button label="Save Changes" onPress={save} loading={loading} />

        {unbilledEntries.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Unbilled Hours — ${totalUnbilled.toFixed(2)}</Text>
            {unbilledEntries.map((e) => (
              <Card key={e.id} style={styles.entryCard}>
                <View style={styles.entryRow}>
                  <Text style={styles.entryTask}>{e.task_types?.name ?? 'Task'}</Text>
                  <Text style={styles.entryHours}>{e.hours} hrs × ${e.task_types?.hourly_rate}/hr</Text>
                </View>
                <Text style={styles.entrySub}>{e.profiles?.full_name} · {e.worked_date}</Text>
                {e.notes ? <Text style={styles.entryNotes}>{e.notes}</Text> : null}
              </Card>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, gap: Spacing.md },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switchLabel: { color: Colors.text, fontSize: 15 },
  sectionTitle: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600', letterSpacing: 1, marginTop: Spacing.sm },
  entryCard: { gap: 4 },
  entryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  entryTask: { color: Colors.text, fontSize: 14, fontWeight: '600' },
  entryHours: { color: Colors.accentLight, fontSize: 14 },
  entrySub: { color: Colors.textSecondary, fontSize: 12 },
  entryNotes: { color: Colors.textMuted, fontSize: 12, fontStyle: 'italic' },
});
