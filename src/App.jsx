import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Sidebar from "./components/layout/Sidebar";
import TopBar from "./components/layout/TopBar";
import Login from "./pages/Login";
import Placeholder from "./pages/Placeholder";
import Overview from "./pages/Overview";
import Ingestion from "./pages/Ingestion";
import ColumnMapping from "./pages/ColumnMapping";
import EtlPipeline from "./pages/EtlPipeline";
import DataQuality from "./pages/DataQuality";
import Duplicates from "./pages/Duplicates";
import BranchIntelligence from "./pages/BranchIntelligence";
import Workforce from "./pages/Workforce";
import OtpIntelligence from "./pages/OtpIntelligence";
import OperatorDetail from "./pages/OperatorDetail";
import Analytics from "./pages/Analytics";
import BiDashboard from "./pages/BiDashboard";
import AiAssistant from "./pages/AiAssistant";
import PanicAlerts from "./pages/PanicAlerts";
import SmokeAlerts from "./pages/SmokeAlerts";
import Monitoring from "./pages/Monitoring";
import ErrorTracking from "./pages/ErrorTracking";
import CloudArchitecture from "./pages/CloudArchitecture";
import Settings from "./pages/Settings";
import { PAGE_META } from "./data/nav";
import { Loader2 } from "lucide-react";

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}

function Shell() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState("overview");

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg bg-grid">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  if (!user) return <Login />;

  const renderPage = () => {
    switch (page) {
      case "overview": return <Overview onNavigate={setPage} />;
      case "ingestion": return <Ingestion />;
      case "mapping": return <ColumnMapping />;
      case "etl": return <EtlPipeline />;
      case "quality": return <DataQuality />;
      case "duplicates": return <Duplicates />;
      case "branches": return <BranchIntelligence />;
      case "workforce": return <Workforce />;
      case "otp": return <OtpIntelligence />;
      case "operators": return <OperatorDetail />;
      case "analytics": return <Analytics />;
      case "bi": return <BiDashboard />;
      case "ai": return <AiAssistant />;
      case "panic": return <PanicAlerts />;
      case "smoke": return <SmokeAlerts />;
      case "monitoring": return <Monitoring />;
      case "errors": return <ErrorTracking />;
      case "cloud": return <CloudArchitecture />;
      case "settings": return <Settings />;
      default: {
        const meta = PAGE_META[page];
        return (
          <Placeholder
            key={page}
            title={meta?.title || page}
            description={meta?.subtitle || ""}
            wave="Wave 10"
          />
        );
      }
    }
  };

  return (
    <div className="min-h-screen bg-bg bg-grid text-ink">
      <Sidebar currentPage={page} onNavigate={setPage} />
      <div className="ml-60 flex min-h-screen flex-col">
        <TopBar currentPage={page} onNavigate={setPage} />
        <main className="flex-1 p-6 lg:p-8">
          <div className="mx-auto max-w-[1400px]">{renderPage()}</div>
        </main>
        <footer className="border-t border-line px-6 py-3 text-2xs text-ink-faint">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between">
            <span>
              Branch Intelligence · Local Development · MySQL{" "}
              <span className="text-ink-mute">gentech_db</span>
            </span>
            <span>FastAPI · React · Tailwind · Chart.js</span>
          </div>
        </footer>
      </div>
    </div>
  );
}