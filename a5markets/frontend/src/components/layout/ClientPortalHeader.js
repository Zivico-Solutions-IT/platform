import { router } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import DashboardTabs from './DashboardTabs';
import { useAppTheme } from '../../context/ThemeContext';

export default function ClientPortalHeader({
  title = 'Account Dashboard',
  subtitle,
  activeKey,
  onSectionChange,
  rightContent,
  notificationCount = 0,
  onNotificationPress,
  showNotification = true,
  userRole,
}) {
  const { width } = useWindowDimensions();
  const { colors } = useAppTheme();
  const mobile = width < 760;

  return (
    <>
      <View className={`mb-5 ${mobile ? 'gap-3' : 'flex-row flex-wrap items-start justify-between gap-3'}`}>
        <View className={mobile ? 'w-full' : 'min-w-0 flex-1'}>
          <Text className={`${mobile ? 'text-[26px]' : 'text-3xl'} font-bold`} numberOfLines={mobile ? 1 : undefined} adjustsFontSizeToFit style={{ color: colors.text }}>{title}</Text>
          {subtitle ? <Text className={`${mobile ? 'text-sm' : ''} mt-1`} numberOfLines={mobile ? 2 : undefined} style={{ color: colors.muted }}>{subtitle}</Text> : null}
        </View>
        <View className={`${mobile ? 'w-full justify-end gap-2' : 'justify-end gap-3'} relative flex-row flex-wrap items-center`}>
          {showNotification ? (
            <Pressable
              onPress={onNotificationPress || (() => router.push('/dashboard'))}
              className="relative h-10 w-10 items-center justify-center rounded-xl border"
              style={{ backgroundColor: colors.panel, borderColor: colors.border }}
            >
              <Bell size={18} color={colors.text} />
              {notificationCount ? (
                <Text className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-danger px-1 text-center text-[10px] font-medium text-white">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </Text>
              ) : null}
            </Pressable>
          ) : null}
          {rightContent}
        </View>
      </View>
      <DashboardTabs activeKey={activeKey} onSectionChange={onSectionChange} userRole={userRole} />
    </>
  );
}
