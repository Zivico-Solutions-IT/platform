import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Copy, UsersRound } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';
import ClientPortalHeader from '../src/components/layout/ClientPortalHeader';
import LoadingSpinner from '../src/components/common/LoadingSpinner';
import { dashboardService } from '../src/services/dashboardService';
import { useAuth } from '../src/hooks/useAuth';
import { useAppTheme } from '../src/context/ThemeContext';

function PageCard({ children, colors, className = '' }) {
  return (
    <View
      className={`rounded-xl border p-5 ${className}`}
      style={{
        backgroundColor: colors.panel,
        borderColor: colors.border,
        shadowColor: '#5a7d91',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.08,
        shadowRadius: 22,
        elevation: 3,
      }}
    >
      {children}
    </View>
  );
}

function ReferralCard({ referral, colors }) {
  return (
    <View className="rounded-xl border p-4" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
      <View className="flex-row items-center justify-between">
        <View className="min-w-0 flex-1">
          <Text className="font-medium" style={{ color: colors.text }} numberOfLines={1}>{referral.name || 'Client'}</Text>
          <Text className="mt-1 text-sm" style={{ color: colors.muted }} numberOfLines={1}>{referral.email || '-'}</Text>
        </View>
        <View className="rounded-full px-3 py-1" style={{ backgroundColor: colors.panel }}>
          <Text className="text-xs font-medium" style={{ color: colors.primary }}>{referral.accountType || 'Demo'}</Text>
        </View>
      </View>
      <Text className="mt-2 text-xs" style={{ color: colors.muted }}>
        Joined {referral.createdAt ? new Date(referral.createdAt).toLocaleDateString() : '-'}
      </Text>
    </View>
  );
}

function RewardCard({ reward, colors }) {
  const statusColors = {
    pending: { bg: `${colors.primary}18`, text: colors.primary },
    approved: { bg: `${colors.success}18`, text: colors.success },
    rejected: { bg: `${colors.danger}18`, text: colors.danger },
  };
  const badge = statusColors[reward.status] || { bg: colors.panel, text: colors.text };

  return (
    <View className="rounded-xl border p-4" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
      <View className="flex-row items-center justify-between">
        <View className="min-w-0 flex-1">
          <Text className="font-semibold text-sm" style={{ color: colors.text }}>
            Commission: ${Number(reward.amount).toFixed(2)} USD
          </Text>
          <Text className="mt-1 text-xs" style={{ color: colors.muted }}>
            From deposit of ${Number(reward.deposit?.amount || 0).toFixed(2)} USD by {reward.referee?.name || reward.referee?.email || 'Referred User'}
          </Text>
        </View>
        <View className="rounded-full px-3 py-1" style={{ backgroundColor: badge.bg }}>
          <Text className="text-xs font-semibold capitalize" style={{ color: badge.text }}>
            {reward.status}
          </Text>
        </View>
      </View>
      <Text className="mt-2 text-[10px]" style={{ color: colors.muted }}>
        Created {reward.createdAt ? new Date(reward.createdAt).toLocaleDateString() + ' ' + new Date(reward.createdAt).toLocaleTimeString() : '-'}
      </Text>
    </View>
  );
}

export default function BrokerRewardsScreen() {
  const { user, logout, loading: authLoading } = useAuth();
  const { colors } = useAppTheme();
  const [dashboard, setDashboard] = useState(null);
  const [copied, setCopied] = useState(false);

  const loadDashboard = async () => {
    if (!user) return;
    try {
      setDashboard(await dashboardService.getDashboard());
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        await logout();
        router.replace('/login');
      }
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    // Only regular users can access referral programme
    if (user.role && user.role !== 'user') {
      router.replace('/dashboard');
      return;
    }
    loadDashboard().catch(() => {});
  }, [authLoading, user]);

  const referral = dashboard?.referral || {};
  const referrals = referral.referrals || [];
  const referralUrl = useMemo(() => referral.url || '', [referral.url]);

  const copyReferral = async () => {
    if (!referralUrl) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  if (authLoading || !user) {
    return <LoadingSpinner />;
  }

  const signOut = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <ScrollView
      className="flex-1"
      style={{ backgroundColor: colors.background }}
      contentContainerClassName="mx-auto w-full max-w-[1180px] p-4 lg:p-7"
    >
      <ClientPortalHeader
        title="Referral Programme"
        subtitle={user?.email || 'Track your referral link, clients, and commission.'}
        activeKey="referral"
        userRole={user?.role}
        rightContent={(
          <>
          <Pressable onPress={() => router.push('/trading')} className="h-10 items-center justify-center px-2">
            <Text className="font-medium" style={{ color: colors.primary }}>Back to Trading</Text>
          </Pressable>
          <Pressable onPress={signOut} className="h-10 items-center justify-center px-2">
            <Text className="font-medium" style={{ color: colors.danger }}>Sign Out</Text>
          </Pressable>
          </>
        )}
      />

      <PageCard colors={colors} className="mb-5">
        <View className="flex-row flex-wrap items-start justify-between gap-4">
          <View className="min-w-0 flex-1">
            <Text className="text-sm font-semibold uppercase tracking-[1px]" style={{ color: colors.primary }}>Your Referral Code</Text>
            <Text className="mt-3 text-4xl font-bold" style={{ color: colors.text }}>{referral.code || '-'}</Text>
            {referral.referrer ? (
              <Text className="mt-2" style={{ color: colors.muted }}>You were referred by {referral.referrer.name || referral.referrer.email}</Text>
            ) : (
              <Text className="mt-2" style={{ color: colors.muted }}>Share your link below. New users registered from it are linked to you.</Text>
            )}
          </View>
          <View className="h-14 w-14 items-center justify-center rounded-xl" style={{ backgroundColor: colors.primarySoft }}>
            <UsersRound size={25} color={colors.primary} />
          </View>
        </View>
        <View className="mt-5 rounded-xl border px-4 py-4" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
          <Text numberOfLines={1} selectable style={{ color: colors.text }}>
            {referralUrl || 'Referral link is not available yet.'}
          </Text>
        </View>
        <Pressable
          onPress={copyReferral}
          disabled={!referralUrl}
          className="mt-5 h-12 w-full max-w-[300px] flex-row items-center justify-center rounded-xl"
          style={{ backgroundColor: colors.primary, opacity: referralUrl ? 1 : 0.55 }}
        >
          <Copy size={17} color="#ffffff" />
          <Text className="ml-2 font-bold text-white">{copied ? 'Copied' : 'Copy Referral URL'}</Text>
        </Pressable>
      </PageCard>

      <PageCard colors={colors} className="mb-5">
        <View className="mb-4 flex-row items-center justify-between">
          <View>
            <Text className="text-xl font-medium" style={{ color: colors.text }}>My Referrals</Text>
            <Text className="mt-1" style={{ color: colors.muted }}>Every client linked to your referral code.</Text>
          </View>
          <UsersRound size={24} color={colors.accent} />
        </View>
        <View className="gap-3">
          {referrals.map((item) => <ReferralCard key={item.id} referral={item} colors={colors} />)}
          {!referrals.length ? <Text className="rounded-xl border border-dashed p-5" style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.muted }}>No referrals yet.</Text> : null}
        </View>
      </PageCard>

      <PageCard colors={colors}>
        <View className="mb-4 flex-row items-center justify-between">
          <View>
            <Text className="text-xl font-medium" style={{ color: colors.text }}>My Referral Rewards</Text>
            <Text className="mt-1" style={{ color: colors.muted }}>Status of your 10% commission rewards awaiting admin approval.</Text>
          </View>
        </View>
        <View className="gap-3">
          {(referral.rewards || []).map((item) => <RewardCard key={item.id} reward={item} colors={colors} />)}
          {!(referral.rewards || []).length ? <Text className="rounded-xl border border-dashed p-5" style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.muted }}>No rewards earned yet.</Text> : null}
        </View>
      </PageCard>
    </ScrollView>
  );
}
