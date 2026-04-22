import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, TextInput, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/lib/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface Employee { id: string; full_name: string; }

export default function EmployeesScreen() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviting, setInviting] = useState(false);

  async function load() {
    const { data } = await supabase.from('profiles').select('id, full_name').eq('role', 'employee').order('full_name');
    setEmployees(data ?? []);
  }

  async function refresh() { setRefreshing(true); await load(); setRefreshing(false); }

  useEffect(() => { load(); }, []);

  async function inviteEmployee() {
    if (!inviteName.trim() || !inviteEmail.trim() || !invitePassword.trim()) {
      Alert.alert('All fields required'); return;
    }
    setInviting(true);
    const { data, error } = await supabase.functions.invoke('create-employee', {
      body: { full_name: inviteName.trim(), email: inviteEmail.trim(), password: invitePassword.trim() },
    });
    setInviting(false);
    if (error) { Alert.alert('Error', error.message); return; }
    Alert.alert('Employee added', `${inviteName} can now log in with their email and password.`);
    setInviteName(''); setInviteEmail(''); setInvitePassword('');
    setShowInvite(false);
    load();
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Team</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowInvite(!showInvite)}>
          <Text style={styles.addText}>{showInvite ? 'Cancel' : '+ Add Employee'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.accent} />}
      >
        {showInvite && (
          <Card style={styles.inviteCard}>
            <Text style={styles.inviteTitle}>Add New Employee</Text>
            <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor={Colors.textMuted} value={inviteName} onChangeText={setInviteName} />
            <TextInput style={styles.input} placeholder="Email" placeholderTextColor={Colors.textMuted} value={inviteEmail} onChangeText={setInviteEmail} autoCapitalize="none" keyboardType="email-address" />
            <TextInput style={styles.input} placeholder="Temporary Password" placeholderTextColor={Colors.textMuted} value={invitePassword} onChangeText={setInvitePassword} secureTextEntry />
            <Button label="Add Employee" onPress={inviteEmployee} loading={inviting} />
          </Card>
        )}

        <Text style={styles.sectionTitle}>{employees.length} Employee{employees.length !== 1 ? 's' : ''}</Text>
        {employees.map((e) => (
          <Card key={e.id} style={styles.employeeCard}>
            <Text style={styles.employeeName}>{e.full_name}</Text>
          </Card>
        ))}
        {employees.length === 0 && !showInvite && (
          <Card><Text style={styles.empty}>No employees yet. Tap + Add Employee to get started.</Text></Card>
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
  addBtn: { backgroundColor: Colors.accent, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  addText: { color: Colors.text, fontWeight: '600', fontSize: 13 },
  content: { padding: Spacing.md, gap: Spacing.sm },
  inviteCard: { gap: Spacing.sm, marginBottom: Spacing.sm },
  inviteTitle: { color: Colors.text, fontSize: 16, fontWeight: '600', marginBottom: Spacing.xs },
  input: {
    backgroundColor: Colors.surfaceRaised, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    color: Colors.text, fontSize: 15,
  },
  sectionTitle: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600', letterSpacing: 1 },
  employeeCard: {},
  employeeName: { color: Colors.text, fontSize: 15, fontWeight: '500' },
  empty: { color: Colors.textMuted, textAlign: 'center', fontSize: 14 },
});
