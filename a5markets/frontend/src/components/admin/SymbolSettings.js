import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, useWindowDimensions, TextInput } from 'react-native';
import { CheckSquare, Square, Save, RefreshCw, ChevronDown } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import api from '../../services/api';

export default function SymbolSettings({ endpoint = '/admin/symbols', embedded = false }) {
  const { width } = useWindowDimensions();
  const { darkMode, colors } = useAppTheme();
  const mobile = width < 768;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [symbols, setSymbols] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('CRYPTO CFD');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchSymbols = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const { data } = await api.get(endpoint);
      setSymbols(data.symbols || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load symbol settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSymbols();
  }, []);

  const handleToggle = (symbol) => {
    setSymbols((current) =>
      current.map((item) =>
        item.symbol === symbol ? { ...item, visible: !item.visible } : item
      )
    );
  };

  const handleToggleAll = (group, value) => {
    setSymbols((current) =>
      current.map((item) =>
        item.group === group ? { ...item, visible: value } : item
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const visibilities = symbols.map((item) => ({
        symbol: item.symbol,
        visible: item.visible,
      }));
      await api.put(endpoint, { visibilities });
      setSuccess('Symbol visibility settings updated successfully!');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save symbol settings.');
    } finally {
      setSaving(false);
    }
  };

  // Group names in database vs UI names
  const groups = [
    { label: 'Crypto', value: 'CRYPTO CFD' },
    { label: 'Forex', value: 'FOREX' },
    { label: 'Indices', value: 'INDICES' },
    { label: 'Metals', value: 'METALS' },
    { label: 'Energies', value: 'ENERGIES' },
  ];

  const filteredSymbols = symbols.filter(
    (item) =>
      item.group === selectedGroup &&
      (item.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())))
  );
  const allSelected = filteredSymbols.length > 0 && filteredSymbols.every((item) => item.visible);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center p-8">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="mt-3 text-sm" style={{ color: colors.muted }}>Loading trading symbols...</Text>
      </View>
    );
  }

  return (
    <View className={embedded ? '' : 'flex-1'}>
      {/* Messages */}
      {error ? (
        <View className="mb-4 rounded-xl border border-danger/25 bg-danger/10 p-4">
          <Text className="text-sm font-medium text-danger">{error}</Text>
        </View>
      ) : null}
      
      {success ? (
        <View className="mb-4 rounded-xl border border-success/25 bg-success/10 p-4">
          <Text className="text-sm font-medium text-success">{success}</Text>
        </View>
      ) : null}

      {/* Header card with category filters & Save button */}
      <View className="mb-5 rounded-2xl border p-4" style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16, zIndex: 100, elevation: 100 }}>
        {mobile ? (
          <View 
            style={{ 
              zIndex: 120, 
              width: '100%', 
              display: 'flex',
              flexDirection: 'row', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              gap: 6
            }}
          >
            {/* Search Bar */}
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search..."
              placeholderTextColor={colors.muted}
              className="rounded-xl border px-2.5 text-[11px]"
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text,
                height: 40,
                flex: 1,
                maxWidth: 150, // Make it compact as requested ("podi karla")
              }}
            />

            {/* Custom Dropdown for Categories */}
            <View 
              className="relative" 
              style={{ zIndex: 130, width: 110, height: 40 }}
              onMouseLeave={() => setDropdownOpen(false)}
            >
              <Pressable
                onPress={() => setDropdownOpen(!dropdownOpen)}
                className="rounded-xl border px-2.5"
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  height: 40,
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text className="text-[10px] font-bold uppercase tracking-wide" numberOfLines={1} style={{ color: colors.text }}>
                  {groups.find((g) => g.value === selectedGroup)?.label || 'Category'}
                </Text>
                <ChevronDown size={12} color={colors.text} />
              </Pressable>

              {dropdownOpen && (
                <View
                  className="absolute top-11 left-0 right-0 rounded-xl border p-1 shadow-lg"
                  style={{
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    zIndex: 9999,
                    elevation: 9999,
                  }}
                >
                  {groups.map((group) => {
                    const active = selectedGroup === group.value;
                    return (
                      <Pressable
                        key={group.value}
                        onPress={() => {
                          setSelectedGroup(group.value);
                          setDropdownOpen(false);
                        }}
                        className="rounded-2xl px-2.5 py-2"
                        style={{
                          backgroundColor: active ? colors.primary : 'transparent',
                        }}
                      >
                        <Text
                          className="text-[10px] font-semibold uppercase tracking-wider"
                          numberOfLines={1}
                          style={{ color: active ? '#0B0B0B' : colors.text }}
                        >
                          {group.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Small Save Changes Button (Icon only) */}
            <Pressable
              onPress={handleSave}
              disabled={saving}
              className="rounded-xl"
              style={{ 
                backgroundColor: colors.primary, 
                width: 40, 
                height: 40, 
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#0B0B0B" />
              ) : (
                <Save size={16} style={{ width: 16, height: 16 }} color="#0B0B0B" />
              )}
            </Pressable>
          </View>
        ) : (
          <View className="flex-row flex-wrap items-center justify-between gap-3" style={{ zIndex: 110 }}>
            {/* Desktop/Tablet category tabs */}
            <View className="flex-row flex-wrap gap-2">
              {groups.map((group) => {
                const active = selectedGroup === group.value;
                return (
                  <Pressable
                    key={group.value}
                    onPress={() => setSelectedGroup(group.value)}
                    className="rounded-xl px-4 py-2.5 border"
                    style={{
                      backgroundColor: active ? colors.primary : colors.surface,
                      borderColor: active ? colors.primary : colors.border,
                    }}
                  >
                    <Text className="text-xs font-semibold uppercase tracking-wider" style={{ color: active ? '#0B0B0B' : colors.text }}>
                      {group.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Desktop Action buttons + Search */}
            <View className="flex-row items-center gap-3">
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search symbols..."
                placeholderTextColor={colors.muted}
                className="h-10 w-48 rounded-xl border px-3 text-xs"
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                }}
              />

              <Pressable
                onPress={fetchSymbols}
                className="h-10 w-10 items-center justify-center rounded-xl border"
                style={{ backgroundColor: colors.surface, borderColor: colors.border }}
              >
                <RefreshCw size={16} color={colors.text} />
              </Pressable>
              
              <Pressable
                onPress={handleSave}
                disabled={saving}
                className="items-center justify-center rounded-xl"
                style={{ backgroundColor: colors.primary, width: 40, height: 40, flexShrink: 0 }}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#0B0B0B" />
                ) : (
                  <Save size={16} style={{ width: 16, height: 16 }} color="#0B0B0B" />
                )}
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* Symbols List */}
      <View className="rounded-2xl border overflow-hidden" style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}>
        {/* Toggle all row */}
        <View className="flex-row items-center border-b p-4" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
          <Pressable
            onPress={() => handleToggleAll(selectedGroup, !allSelected)}
            className="flex-row items-center gap-2.5"
          >
            {allSelected ? (
              <CheckSquare size={20} color={colors.primary} />
            ) : (
              <Square size={20} color={colors.muted} />
            )}
            <Text className="text-sm font-semibold uppercase tracking-wide" style={{ color: colors.text }}>
              Select All / Deselect All
            </Text>
          </Pressable>
        </View>

        {/* Scrollable list of items */}
        <ScrollView nestedScrollEnabled style={{ maxHeight: 420 }}>
          {filteredSymbols.map((item) => (
            <Pressable
              key={item.symbol}
              onPress={() => handleToggle(item.symbol)}
              className="flex-row items-center justify-between border-b p-4"
              style={{ borderColor: colors.border }}
            >
              <View className="flex-1 pr-3">
                <Text className="text-sm font-semibold" style={{ color: colors.text }}>{item.symbol}</Text>
                <Text className="mt-0.5 text-xs" style={{ color: colors.muted }}>{item.description || 'No description'}</Text>
              </View>
              
              <View className="h-9 w-9 items-center justify-center">
                {item.visible ? (
                  <CheckSquare size={20} color={colors.primary} />
                ) : (
                  <Square size={20} color={colors.muted} />
                )}
              </View>
            </Pressable>
          ))}
          
          {filteredSymbols.length === 0 ? (
            <View className="p-8 items-center justify-center">
              <Text style={{ color: colors.muted }}>No symbols in this category.</Text>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </View>
  );
}
