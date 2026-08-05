import { Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { dateTime, money, transactionTypeLabel } from '../../utils/formatters';

const isReferral = (type) => type === 'referral' || type === 'referral_reward';

function TypeBadge({ type, note }) {
  const { colors } = useAppTheme();
  const label = transactionTypeLabel(type, note);
  if (isReferral(type)) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ backgroundColor: `${colors.primary}22`, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
          <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>🎁 {label}</Text>
        </View>
      </View>
    );
  }
  return <Text style={{ color: colors.text, fontSize: 14 }}>{label}</Text>;
}

function Cell({ width, children, header, muted }) {
  const { darkMode, colors } = useAppTheme();
  return (
    <View style={{ width, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 16 }}>
      {typeof children === 'string' ? (
        <Text style={{ color: header || muted ? colors.muted : colors.text, fontSize: header ? 11 : 14, fontWeight: header ? '500' : '400', textTransform: header ? 'uppercase' : 'none' }}>
          {children}
        </Text>
      ) : children}
    </View>
  );
}

function StickyTableHeader({ children }) {
  const { darkMode, colors } = useAppTheme();
  return (
    <View
      className="flex-row border-b"
      style={{ backgroundColor: colors.surface, borderColor: colors.border, position: 'sticky', top: 0, zIndex: 30, elevation: 30 }}
    >
      {children}
    </View>
  );
}

/* ── Mobile card for one transaction ── */
function MobileTxCard({ item, colors }) {
  const typeLabel = transactionTypeLabel(item.type, item.note);
  const isPositive = Number(item.amount) >= 0;
  const referral = isReferral(item.type);
  return (
    <View
      style={{
        backgroundColor: referral ? `${colors.primary}0D` : colors.surface,
        borderColor: referral ? `${colors.primary}40` : colors.border,
        borderWidth: 1,
        borderRadius: 10,
        padding: 10,
        marginBottom: 7,
      }}
    >
      {/* Row 1: Type + Amount */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        {referral ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ backgroundColor: `${colors.primary}22`, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
              <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>🎁 {typeLabel}</Text>
            </View>
          </View>
        ) : (
          <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600', flexShrink: 1, marginRight: 8 }} numberOfLines={1}>
            {typeLabel}
          </Text>
        )}
        <Text style={{ color: isPositive ? colors.success : colors.danger, fontSize: 13, fontWeight: '700' }}>
          ${money(item.amount)}
        </Text>
      </View>

      {/* Row 2: Before → After */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
        <Text style={{ color: colors.muted, fontSize: 10 }}>Before: </Text>
        <Text style={{ color: colors.text, fontSize: 10 }}>${money(item.balanceBefore)}</Text>
        <Text style={{ color: colors.muted, fontSize: 10, marginHorizontal: 6 }}>→</Text>
        <Text style={{ color: colors.muted, fontSize: 10 }}>After: </Text>
        <Text style={{ color: colors.text, fontSize: 10 }}>${money(item.balanceAfter)}</Text>
      </View>

      {/* Row 3: Note (if any) */}
      {(item.note || item.description) ? (
        <Text style={{ color: colors.muted, fontSize: 10, marginBottom: 4 }} numberOfLines={2}>
          {item.note || item.description}
        </Text>
      ) : null}

      {/* Row 4: ID + Date */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: colors.muted, fontSize: 9 }}>#{item.id}</Text>
        <Text style={{ color: colors.muted, fontSize: 9 }}>{dateTime(item.createdAt)}</Text>
      </View>
    </View>
  );
}

export default function UserTransactionsModal({ user, account, transactions, loading, onClose }) {
  const { darkMode, colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const mobile = width < 760;

  if (!user) return null;
  return (
    <View
      className={`absolute inset-0 z-50 items-center bg-medium/70 px-4 ${mobile ? 'justify-start pt-16' : 'justify-center'}`}
    >
      <View
        className={`w-full max-w-6xl border ${mobile ? 'rounded-xl p-3' : 'rounded-2xl p-6 max-h-[90%]'}`}
        style={{ backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: darkMode ? 0.3 : 0.08, shadowRadius: 16 }}
      >
        {/* Header */}
        <View className={`flex-row justify-between ${mobile ? 'mb-2' : 'mb-5'}`}>
          <View>
            <Text className={`${mobile ? 'text-base' : 'text-xl'} font-medium`} style={{ color: colors.text }}>Transaction History</Text>
            <Text className="mt-0.5 text-xs" style={{ color: colors.primary }}>{user.name}</Text>
            {account ? (
              <Text className="mt-0.5 text-xs" style={{ color: colors.muted }}>
                {account.name || `${account.type || 'Trading'} account`}
              </Text>
            ) : null}
          </View>
          <Pressable onPress={onClose} className="p-1">
            <Text className="text-xl" style={{ color: colors.muted }}>×</Text>
          </Pressable>
        </View>

        {loading ? (
          <Text className="py-10 text-center" style={{ color: colors.muted }}>Loading transactions...</Text>
        ) : mobile ? (
          /* ── Mobile: vertical card list ── */
          <View>
            {transactions.length === 0 ? (
              <Text style={{ color: colors.muted, textAlign: 'center', paddingVertical: 24, fontSize: 13 }}>No transaction history.</Text>
            ) : (
              transactions.map((item) => (
                <MobileTxCard key={item.id} item={item} colors={colors} />
              ))
            )}
          </View>
        ) : (
          /* ── Desktop: horizontal table ── */
          <ScrollView horizontal>
            <View style={{ minWidth: 1030 }}>
              <StickyTableHeader>
                <Cell width={80} header>ID</Cell>
                <Cell width={200} header>Type</Cell>
                <Cell width={120} header>Amount</Cell>
                <Cell width={135} header>Before</Cell>
                <Cell width={135} header>After</Cell>
                <Cell width={200} header>Note</Cell>
                <Cell width={160} header>Created Date</Cell>
              </StickyTableHeader>
              {transactions.map((item) => {
                const referral = isReferral(item.type);
                return (
                  <View
                    key={item.id}
                    className="flex-row border-b"
                    style={{
                      borderColor: colors.border,
                      backgroundColor: referral ? `${colors.primary}08` : 'transparent',
                    }}
                  >
                    <Cell width={80}>#{item.id}</Cell>
                    <Cell width={200}><TypeBadge type={item.type} note={item.note} /></Cell>
                    <Cell width={120}>
                      <Text style={{ color: Number(item.amount) >= 0 ? colors.success : colors.danger, fontSize: 14, fontWeight: '600' }}>
                        ${money(item.amount)}
                      </Text>
                    </Cell>
                    <Cell width={135}>${money(item.balanceBefore)}</Cell>
                    <Cell width={135}>${money(item.balanceAfter)}</Cell>
                    <Cell width={200} muted>{item.note || item.description || '-'}</Cell>
                    <Cell width={160}>{dateTime(item.createdAt)}</Cell>
                  </View>
                );
              })}
              {!transactions.length ? <Text className="p-8 text-center" style={{ color: colors.muted }}>No transaction history.</Text> : null}
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
}
