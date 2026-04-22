import { useState } from 'react';
import { ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing } from '@/lib/theme';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function NewTaskTypeScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!name.trim()) { Alert.alert('Name required'); return; }
    const rate = parseFloat(hourlyRate);
    if (isNaN(rate) || rate <= 0) { Alert.alert('Enter a valid hourly rate'); return; }

    setLoading(true);
    const { error } = await supabase.from('task_types').insert({ name: name.trim(), hourly_rate: rate });
    setLoading(false);
    if (error) { Alert.alert('Error', error.message); return; }
    router.back();
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader title="New Task Type" showBack />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Input label="Task Name *" value={name} onChangeText={setName} placeholder="e.g. Trimming, Hauling, Planting" />
        <Input label="Hourly Rate ($) *" value={hourlyRate} onChangeText={setHourlyRate} placeholder="45.00" keyboardType="decimal-pad" />
        <Button label="Save Task Type" onPress={save} loading={loading} style={styles.btn} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, gap: Spacing.md },
  btn: { marginTop: Spacing.md },
});
