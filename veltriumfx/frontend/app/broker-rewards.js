import { useEffect, useMemo, useState } from 'react';
import { Link, router } from 'expo-router';
import { Copy, RefreshCcw, UsersRound } from 'lucide-react-native';
import { Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';
import CustomButton from '../src/components/common/CustomButton';
import LoadingSpinner, { LOADING_SPINNER_MIN_MS } from '../src/components/common/LoadingSpinner';
import DashboardTabs from '../src/components/layout/DashboardTabs';
import { dashboardService } from '../src/services/dashboardService';
import { useAuth } from '../src/hooks/useAuth';
import { useAppTheme } from '../src/context/ThemeContext';

function Metric({ label, value, hint, colors }) {
  const { width } = useWindowDimensions();
  const mobile = width < 640;
  return (
    <View
      className={`${mobile ? 'min-w-[130px] p-3' : 'min-w-[190px] p-4'} flex-1 rounded-2xl border`}
      style={{ backgroundColor: colors.surface, borderColor: colors.border }}
    >
      <Text className={`${mobile ? 'text-[10px]' : 'text-xs'} font-medium uppercase`} style={{ color: colors.muted }} numberOfLines={1}>
        {label}
      </Text>
      <Text className={`${mobile ? 'text-lg mt-1' : 'text-2xl mt-2'} font-medium`} style={{ color: colors.text }} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {hint ? <Text className="mt-1 text-[10px]" style={{ color: colors.muted }} numberOfLines={1}>{hint}</Text> : null}
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
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSplashDone(true), LOADING_SPINNER_MIN_MS);
    return () => clearTimeout(timer);
  }, []);

  const loadDashboard = async () => {
    if (!user) return;
    setLoading(true);
    try {
      setDashboard(await dashboardService.getDashboard());
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        await logout();
        router.replace('/login');
      }
    } finally {
      setLoading(false);
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
  const approvedDeposits = Number(referral.approvedDeposits || 0);
  const pendingDeposits = Number(referral.pendingDeposits || 0);
  const commission = Number(referral.commission || 0);
  const commissionRate = Number(referral.commissionRate || 0);

  const copyReferral = async () => {
    if (!referralUrl) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  if (authLoading || !user || !splashDone) {
    return <LoadingSpinner />;
  }

  return (
    <ScrollView className="flex-1" style={{ backgroundColor: colors.background }} contentContainerClassName="p-4 lg:p-8">
      <View className="mb-6 flex-row flex-wrap items-center justify-between gap-3">
        <View>
          <Text className="text-3xl font-medium" style={{ color: colors.text }}>Referral Programme</Text>
          <Text className="mt-1" style={{ color: colors.muted }}>{user?.email || 'Track your referral link, clients, and commission.'}</Text>
        </View>
        <View className="flex-row flex-wrap gap-3">
          <Pressable onPress={() => loadDashboard().catch(() => {})} className="flex-row items-center rounded-xl border px-4 py-3" style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
            <RefreshCcw size={16} color={loading ? '#D4AF37' : '#8fa0bb'} />
            <Text className="ml-2 font-medium" style={{ color: colors.text }}>Refresh</Text>
          </Pressable>
          <Link href="/dashboard" asChild>
            <Pressable className="rounded-xl border px-4 py-3" style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
              <Text className="font-medium" style={{ color: colors.primary }}>Back to Dashboard</Text>
            </Pressable>
          </Link>
        </View>
      </View>

      <DashboardTabs activeKey="rewards" />

      <View className="mb-5 overflow-hidden rounded-2xl border p-5" style={{ backgroundColor: colors.panel, borderColor: colors.primary }}>
        <Text className="text-sm font-medium uppercase tracking-[1px]" style={{ color: colors.primary }}>Your Referral Code</Text>
        <Text className="mt-3 text-4xl font-medium" style={{ color: colors.text }}>{referral.code || '-'}</Text>
        {referral.referrer ? (
          <Text className="mt-2" style={{ color: colors.muted }}>You were referred by {referral.referrer.name || referral.referrer.email}</Text>
        ) : (
          <Text className="mt-2" style={{ color: colors.muted }}>Share your link below. New users registered from it are linked to you.</Text>
        )}
        <TextInput
          editable={false}
          value={referralUrl}
          className="mt-5 rounded-xl border p-4"
          style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }}
        />
        <CustomButton title={copied ? 'Copied' : 'Copy Referral URL'} onPress={copyReferral} className="mt-4 max-w-[240px]" />
      </View>

      <View className="mb-5 flex-row flex-wrap gap-3">
        <Metric label="My Referrals" value={String(referral.referralCount || referrals.length || 0)} hint="Users registered through your link" colors={colors} />
        <Metric label="Pending Deposits" value={`${pendingDeposits.toFixed(2)} USD`} hint="Waiting for approval" colors={colors} />
        <Metric label="Approved Deposits" value={`${approvedDeposits.toFixed(2)} USD`} hint="Confirmed referral volume" colors={colors} />
        <Metric label="Commission" value={`${commission.toFixed(2)} USD`} hint={`${(commissionRate * 100).toFixed(2)}% rate`} colors={colors} />
      </View>

      <View className="mb-5 rounded-2xl border p-5" style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
        <View className="mb-4 flex-row items-center justify-between">
          <View>
            <Text className="text-xl font-medium" style={{ color: colors.text }}>My Referrals</Text>
            <Text className="mt-1" style={{ color: colors.muted }}>Every client linked to your referral code.</Text>
          </View>
          <UsersRound size={24} color="#D4AF37" />
        </View>
        <View className="gap-3">
          {referrals.map((item) => <ReferralCard key={item.id} referral={item} colors={colors} />)}
          {!referrals.length ? <Text className="rounded-xl border border-dashed p-5" style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.muted }}>No referrals yet.</Text> : null}
        </View>
      </View>

      <View className="rounded-2xl border p-5" style={{ backgroundColor: colors.panel, borderColor: colors.border }}>
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
      </View>
    </ScrollView>
  );
}
