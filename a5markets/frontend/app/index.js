import TradingLayout from '../src/components/layout/TradingLayout';
import RequireAuth from '../src/components/auth/RequireAuth';

export default function HomeScreen() {
  return (
    <RequireAuth redirectAdmin>
      <TradingLayout />
    </RequireAuth>
  );
}
