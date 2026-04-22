import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Switch, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/lib/theme';
import { Card } from '@/components/ui/Card';

interface TaskType {
  id: string;
  name: string;
  hourly_rate: number;
  is_active: boolean;
}

export default function TaskTypesScreen() {
  const router = useRouter();
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    const { data } = await supabase.from('task_types').select('*').order('name');
    setTaskTypes(data ?? []);
  }

  async function refresh() { setRefreshing(true); await load(); setRefreshing(false); }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('task_types').update({ is_active: !current }).eq('id', id);
    setTaskTypes(prev => prev.map(t => t.id === id ? { ...t, is_active: !current } : t));
  }

  useEffect(() => { load(); }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Billing Rates</Text>
          <Text style={styles.subtitle}>Hourly rates by task type</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/(owner)/task-types/new')}>
          <Text style={styles.addText}>+ Add</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.accent} />}
      >
        {taskTypes.map((t) => (
          <Card key={t.id} style={[styles.card, !t.is_active && styles.inactive]}>
            <View style={styles.row}>
              <View>
                <Text style={styles.taskName}>{t.name}</Text>
                <Text style={styles.rate}>${t.hourly_rate.toFixed(2)}/hr</Text>
              </View>
              <Switch
                value={t.is_active}
                onValueChange={() => toggleActive(t.id, t.is_active)}
                trackColor={{ true: Colors.accent, false: Colors.border }}
                thumbColor={Colors.text}
              />
            </View>
          </Card>
        ))}
        {taskTypes.length === 0 && (
          <Card><Text style={styles.empty}>No task types yet. Add your billing rates.</Text></Card>
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
  subtitle: { color: Colors.textSecondary, fontSize: 12 },
  addBtn: { backgroundColor: Colors.accent, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  addText: { color: Colors.text, fontWeight: '600', fontSize: 14 },
  content: { padding: Spacing.md, gap: Spacing.sm },
  card: {},
  inactive: { opacity: 0.5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taskName: { color: Colors.text, fontSize: 16, fontWeight: '600' },
  rate: { color: Colors.accentLight, fontSize: 14, fontWeight: '700', marginTop: 2 },
  empty: { color: Colors.textMuted, textAlign: 'center', fontSize: 14 },
});
