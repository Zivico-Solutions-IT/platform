import React, { useState } from "react";
import { PortalProvider, usePortal } from "./context/PortalContext";
import { Sidebar } from "./components/layout/Sidebar";
import { Header } from "./components/layout/Header";
import { DashboardPage } from "./pages/DashboardPage";
import { MarketSymbolsPage } from "./pages/MarketSymbolsPage";
import { ClientsPage } from "./pages/ClientsPage";
import { PaymentsPage } from "./pages/PaymentsPage";
import { VerificationPage } from "./pages/VerificationPage";
import { TradingOpenPage } from "./pages/TradingOpenPage";
import { TradingHistoryPage } from "./pages/TradingHistoryPage";
import { TradingPage } from "./pages/TradingPage";
import { SettingsPage } from "./pages/SettingsPage";
import { LoginPage } from "./pages/LoginPage";
import { BalanceModal } from "./components/modals/BalanceModal";
import { ClientDetailsDrawer } from "./components/modals/ClientDetailsDrawer";
import { KycInspectionModal } from "./components/modals/KycInspectionModal";
import { Client, KycVerification } from "./types";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";

const PortalContent: React.FC = () => {
  const {
    isAuthenticated,
    activeTab,
    selectedClient,
    setSelectedClient,
    clients,
    toasts,
    removeToast,
  } = usePortal();

  // Modals state
  const [balanceModalOpen, setBalanceModalOpen] = useState(false);
  const [clientDrawerOpen, setClientDrawerOpen] = useState(false);
  const [clientDrawerInitialTab, setClientDrawerInitialTab] = useState<"info" | "open" | "closed" | "deposit-withdraw">("info");
  const [selectedKycForInspection, setSelectedKycForInspection] = useState<KycVerification | null>(null);

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setClientDrawerInitialTab("info");
    setClientDrawerOpen(true);
  };

  const handleOpenManualPayment = () => {
    // Keep the account selected elsewhere in the portal; otherwise mirror the
    // previous manual-payment default (the first available account).
    if (!selectedClient && clients[0]) {
      setSelectedClient(clients[0]);
    }
    setClientDrawerInitialTab("deposit-withdraw");
    setClientDrawerOpen(true);
  };

  const handleOpenBalanceForClient = (login: number) => {
    setBalanceModalOpen(true);
  };

  const handleInspectKyc = (kyc: KycVerification) => {
    setSelectedKycForInspection(kyc);
  };

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f8fafc] text-slate-800 font-sans antialiased">
      {/* Sidebar matching user navigation structure */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden bg-[#f8fafc]">
        {/* Top Header */}
        <Header />

        {/* Dynamic Route View */}
        <main className="flex-1 overflow-y-auto bg-[#f8fafc]">
          {activeTab === "dashboard" && (
            <DashboardPage
              onOpenBalanceModal={() => setBalanceModalOpen(true)}
            />
          )}

          {activeTab === "market-symbols" && <MarketSymbolsPage />}

          {activeTab === "clients-all" && (
            <ClientsPage
              filterMode="all"
              onSelectClient={handleSelectClient}
              onOpenBalanceModal={handleOpenBalanceForClient}
            />
          )}

          {activeTab === "clients-active" && (
            <ClientsPage
              filterMode="active"
              onSelectClient={handleSelectClient}
              onOpenBalanceModal={handleOpenBalanceForClient}
            />
          )}

          {activeTab === "clients-verified" && (
            <ClientsPage
              filterMode="verified"
              onSelectClient={handleSelectClient}
              onOpenBalanceModal={handleOpenBalanceForClient}
            />
          )}

          {(activeTab === "payments" ||
            activeTab === "payments-deposits" ||
            activeTab === "payments-withdrawals") && (
            <PaymentsPage
              onOpenManualPayment={handleOpenManualPayment}
            />
          )}

          {activeTab === "verification" && (
            <VerificationPage onInspectKyc={handleInspectKyc} />
          )}

          {(activeTab === "trading" ||
            activeTab === "trading-open" ||
            activeTab === "trading-history") && <TradingPage />}

          {(activeTab === "settings" || activeTab.startsWith("settings-")) && (
            <SettingsPage />
          )}
        </main>
      </div>

      {/* Global Interactive Modals */}
      <BalanceModal
        isOpen={balanceModalOpen}
        onClose={() => setBalanceModalOpen(false)}
      />

      <ClientDetailsDrawer
        isOpen={clientDrawerOpen}
        onClose={() => {
          setClientDrawerOpen(false);
          setClientDrawerInitialTab("info");
        }}
        initialTab={clientDrawerInitialTab}
        onOpenBalanceModal={() => setBalanceModalOpen(true)}
      />

      <KycInspectionModal
        kyc={selectedKycForInspection}
        isOpen={!!selectedKycForInspection}
        onClose={() => setSelectedKycForInspection(null)}
      />

      {/* Floating Toast Alerts Stack */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none select-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-2xl border shadow-xl flex items-start gap-3 animate-slideIn bg-white ${
              toast.type === "success"
                ? "border-emerald-200 text-emerald-900"
                : toast.type === "error"
                ? "border-rose-200 text-rose-900"
                : "border-sky-200 text-sky-900"
            }`}
          >
            {toast.type === "success" && (
              <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
            )}
            {toast.type === "error" && (
              <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
            )}
            {toast.type === "info" && (
              <Info className="w-5 h-5 text-sky-600 mt-0.5 shrink-0" />
            )}

            <div className="flex-1 text-xs">
              <div className="font-bold tracking-tight text-sm">{toast.title}</div>
              <div className="text-slate-600 mt-0.5">{toast.message}</div>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-700 p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <PortalProvider>
      <PortalContent />
    </PortalProvider>
  );
}
