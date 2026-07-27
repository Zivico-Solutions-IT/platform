import TradingLayout from '../src/components/layout/TradingLayout';
import RequireAuth from '../src/components/auth/RequireAuth';

export default function TradingScreen() {
  return (
    <RequireAuth>
      <TradingLayout />
    </RequireAuth>
  );
}
