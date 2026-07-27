import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react-native';
import { useAppTheme } from './ThemeContext';

const ToastContext = createContext({ notify: () => {} });

const toneStyles = {
  success: { icon: CheckCircle2, accent: '#12cf7a' },
  error: { icon: AlertCircle, accent: '#f24d58' },
  warning: { icon: AlertCircle, accent: '#f5b84b' },
  info: { icon: Info, accent: '#4f8cff' },
};

export function ToastProvider({ children }) {
  const { darkMode, colors } = useAppTheme();
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((toast) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const nextToast = {
      id,
      type: 'info',
      title: '',
      message: '',
      duration: 4200,
      ...toast,
    };
    setToasts((current) => [nextToast, ...current].slice(0, 4));
    if (nextToast.duration > 0) {
      setTimeout(() => dismiss(id), nextToast.duration);
    }
    return id;
  }, [dismiss]);

  const value = useMemo(() => ({ notify, dismiss }), [dismiss, notify]);

  return (
    <ToastContext.Provider value={value}>
      <View style={{ flex: 1 }}>
        {children}
        <View
          pointerEvents="box-none"
          className="absolute right-3 top-3 z-50 w-[360px] max-w-[92vw]"
          style={{ elevation: 50 }}
        >
          {toasts.map((toast) => {
            const tone = toneStyles[toast.type] || toneStyles.info;
            const Icon = tone.icon;
            return (
              <View
                key={toast.id}
                className="mb-2 overflow-hidden rounded-lg border shadow-xl"
                style={{
                  backgroundColor: darkMode ? '#171b21' : colors.panel,
                  borderColor: colors.border,
                }}
              >
                <View className="flex-row p-3">
                  <View className="mr-3 mt-0.5 h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: `${tone.accent}20` }}>
                    <Icon size={16} color={tone.accent} />
                  </View>
                  <View className="min-w-0 flex-1">
                    {toast.title ? <Text className="text-sm font-medium" style={{ color: colors.text }}>{toast.title}</Text> : null}
                    {toast.message ? <Text className={`${toast.title ? 'mt-0.5' : ''} text-xs leading-5`} style={{ color: colors.muted }}>{toast.message}</Text> : null}
                  </View>
                  <Pressable onPress={() => dismiss(toast.id)} className="ml-2 h-7 w-7 items-center justify-center rounded-md" style={{ backgroundColor: darkMode ? '#20262d' : colors.surface }}>
                    <X size={14} color={colors.muted} />
                  </Pressable>
                </View>
                <View style={{ height: 3, backgroundColor: tone.accent }} />
              </View>
            );
          })}
        </View>
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
