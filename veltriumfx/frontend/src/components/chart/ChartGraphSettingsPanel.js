import { Pressable, Text, View } from 'react-native';
import { X } from 'lucide-react-native';

export const GRAPH_SETTINGS = [
  ['askLine', 'Display ask line'],
  ['positionLine', 'Display position line'],
  ['takeProfitLine', 'Display take profit line'],
  ['stopLossLine', 'Display stop loss line'],
  ['positionLabels', 'Display position line labels'],
  ['customBidAsk', 'Custom bid/ask lines'],
];

function ToggleSwitch({ active, onPress, ui }) {
  return (
    <Pressable
      onPress={onPress}
      className="h-5 w-10 justify-center rounded-full px-0.5"
      style={{ backgroundColor: active ? ui.controlActive : ui.muted }}
    >
      <View
        className="h-4 w-4 rounded-full bg-white"
        style={{ alignSelf: active ? 'flex-end' : 'flex-start' }}
      />
    </Pressable>
  );
}

export default function ChartGraphSettingsPanel({ left, right, top, tools, toggleTool, ui, onClose }) {
  return (
    <View
      className="absolute w-[236px] rounded-xl border p-3 shadow-2xl"
      style={{ left, right, top, backgroundColor: ui.menu, borderColor: ui.menuBorder, zIndex: 3000, elevation: 3000 }}
    >
      <View className="mb-2 flex-row items-center justify-between border-b pb-2" style={{ borderColor: ui.border }}>
        <Text className="text-xs font-medium" style={{ color: ui.text }}>GRAPH SETTINGS</Text>
        <Pressable onPress={onClose} className="h-6 w-6 items-center justify-center rounded-md" style={{ backgroundColor: ui.control }}>
          <X size={14} color={ui.text} />
        </Pressable>
      </View>
      {GRAPH_SETTINGS.map(([key, label]) => (
        <View key={key} className="mb-3 flex-row items-center justify-between" style={{ height: 24 }}>
          <Text className="text-xs font-medium" style={{ color: ui.text }}>{label}</Text>
          <ToggleSwitch active={tools[key]} onPress={() => toggleTool(key)} ui={ui} />
        </View>
      ))}
    </View>
  );
}
