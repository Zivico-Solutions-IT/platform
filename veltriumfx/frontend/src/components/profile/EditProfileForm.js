import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import CustomButton from '../common/CustomButton';
import CustomInput from '../common/CustomInput';

export default function EditProfileForm({ user, onSubmit }) {
  const [form, setForm] = useState({ name: '', phone: '' });
  const [message, setMessage] = useState('');
  useEffect(() => setForm({ name: user?.name || '', phone: user?.phone || '' }), [user]);
  const save = async () => {
    try {
      await onSubmit(form);
      setMessage('Profile updated.');
    } catch (error) {
      setMessage(error.message);
    }
  };
  return (
    <View className="flex-1 rounded-2xl border border-border bg-panel p-5">
      <Text className="mb-5 text-xl font-medium text-white">Edit Profile</Text>
      <CustomInput label="Name" value={form.name} onChangeText={(name) => setForm((value) => ({ ...value, name }))} />
      <CustomInput label="Phone" value={form.phone} keyboardType="phone-pad" onChangeText={(phone) => setForm((value) => ({ ...value, phone }))} />
      <CustomButton title="Save Changes" onPress={save} disabled={!user} />
      {!user ? <Text className="mt-3 text-sm text-muted">Log in to edit a server-backed profile.</Text> : null}
      {message ? <Text className="mt-3 text-sm text-muted">{message}</Text> : null}
    </View>
  );
}
