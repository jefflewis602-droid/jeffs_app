import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Colors, Spacing, Radius } from '@/lib/theme';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface Customer { id: string; name: string; }
interface TaskType { id: string; name: string; hourly_rate: number; }

export default function LogHoursScreen() {
  const { user, profile, signOut } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskType | null>(null);
  const [hours, setHours] = useState('');
  const [workedDate, setWorkedDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showTaskPicker, setShowTaskPicker] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from('customers').select('id, name').eq('is_active', true).order('name'),
      supabase.from('task_types').select('id, name, hourly_rate').eq('is_active', true).order('name'),
    ]).then(([custRes, taskRes]) => {
      setCustomers(custRes.data ?? []);
      setTaskTypes((taskRes.data as TaskType[]) ?? []);
    });
  }, []);

  async function submit() {
    if (!selectedCustomer) { Alert.alert('Select a customer'); return; }
    if (!selectedTask) { Alert.alert('Select a task type'); return; }
    const h = parseFloat(hours);
    if (isNaN(h) || h <= 0) { Alert.alert('Enter valid hours (e.g. 2.5)'); return; }
    if (!workedDate) { Alert.alert('Enter the date worked'); return; }

    setLoading(true);
    const { error } = await supabase.from('time_entries').insert({
      employee_id: user!.id,
      customer_id: selectedCustomer.id,
      task_type_id: selectedTask.id,
      hours: h,
      worked_date: workedDate,
      notes: notes.trim() || null,
    });
    setLoading(false);

    if (error) { Alert.alert('Error', error.message); return; }
    Alert.alert('Logged!', `${h} hrs of ${selectedTask.name} for ${selectedCustomer.name} recorded.`);
    setSelectedCustomer(null); setSelectedTask(null); setHours(''); setNotes('');
  }

  const estimatedAmount = selectedTask && parseFloat(hours) > 0
    ? (parseFloat(hours) * selectedTask.hourly_rate).toFixed(2)
    : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hey, {profile?.full_name?.split(' ')[0] ?? 'there'}</Text>
          <Text style={styles.subtitle}>TLC Landscape</Text>
        </View>
        <TouchableOpacity onPress={signOut}><Text style={styles.signOut}>Sign out</Text></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>Log Your Hours</Text>

        <View>
          <Text style={styles.label}>Customer *</Text>
          <TouchableOpacity style={styles.picker} onPress={() => { setShowCustomerPicker(!showCustomerPicker); setShowTaskPicker(false); }}>
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

        <View>
          <Text style={styles.label}>Task Type *</Text>
          <TouchableOpacity style={styles.picker} onPress={() => { setShowTaskPicker(!showTaskPicker); setShowCustomerPicker(false); }}>
            <Text style={selectedTask ? styles.pickerValue : styles.pickerPlaceholder}>
              {selectedTask ? `${selectedTask.name} — $${selectedTask.hourly_rate}/hr` : 'Select task type...'}
            </Text>
          </TouchableOpacity>
          {showTaskPicker && (
            <View style={styles.dropdown}>
              {taskTypes.map((t) => (
                <TouchableOpacity key={t.id} style={styles.dropdownItem} onPress={() => { setSelectedTask(t); setShowTaskPicker(false); }}>
                  <View style={styles.taskRow}>
                    <Text style={styles.dropdownText}>{t.name}</Text>
                    <Text style={styles.taskRate}>${t.hourly_rate}/hr</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <Input label="Hours Worked *" value={hours} onChangeText={setHours} placeholder="2.5" keyboardType="decimal-pad" />

        {estimatedAmount && (
          <Card style={styles.estimateCard}>
            <Text style={styles.estimateLabel}>Estimated charge</Text>
            <Text style={styles.estimateAmount}>${estimatedAmount}</Text>
          </Card>
        )}

        <Input label="Date Worked *" value={workedDate} onChangeText={setWorkedDate} placeholder="YYYY-MM-DD" />
        <Input label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="e.g. Trimmed back fence line" multiline />

        <Button label="Submit Hours" onPress={submit} loading={loading} style={styles.btn} />
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
  greeting: { color: Colors.text, fontSize: 18, fontWeight: '700' },
  subtitle: { color: Colors.accentLight, fontSize: 12, letterSpacing: 1 },
  signOut: { color: Colors.textMuted, fontSize: 13 },
  content: { padding: Spacing.md, gap: Spacing.md },
  sectionTitle: { color: Colors.text, fontSize: 18, fontWeight: '700' },
  label: { color: Colors.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: Spacing.xs },
  picker: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: Spacing.md },
  pickerValue: { color: Colors.text, fontSize: 16 },
  pickerPlaceholder: { color: Colors.textMuted, fontSize: 16 },
  dropdown: { backgroundColor: Colors.surfaceRaised, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, marginTop: 4 },
  dropdownItem: { padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dropdownText: { color: Colors.text, fontSize: 15 },
  taskRow: { flexDirection: 'row', justifyContent: 'space-between' },
  taskRate: { color: Colors.accentLight, fontSize: 14, fontWeight: '600' },
  estimateCard: { alignItems: 'center', gap: 2, borderColor: Colors.accent },
  estimateLabel: { color: Colors.textSecondary, fontSize: 12 },
  estimateAmount: { color: Colors.accentLight, fontSize: 28, fontWeight: '700' },
  btn: { marginTop: Spacing.sm },
});
