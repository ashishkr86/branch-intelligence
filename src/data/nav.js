import {
  LayoutDashboard, UploadCloud, Workflow, ShieldCheck, Building2,
  Users, KeyRound, BarChart3, Activity, Cloud, Settings, Sparkles,
  Layers, ShieldAlert, Flame, Shield,
} from "lucide-react";

export const NAV_GROUPS = [
  {
    label: "Operations",
    items: [
      { id: "overview", label: "Overview", icon: LayoutDashboard, description: "Command center" },
      { id: "ingestion", label: "Data Ingestion", icon: UploadCloud, description: "Upload & validate files" },
      { id: "mapping", label: "Column Mapping", icon: Layers, description: "Map CSV columns to DB" },
      { id: "etl", label: "ETL Pipeline", icon: Workflow, description: "Extract · Transform · Load" },
      { id: "quality", label: "Data Quality", icon: ShieldCheck, description: "Rules & validation" },
      { id: "duplicates", label: "Duplicates", icon: Layers, description: "Detect & clean duplicates" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { id: "branches", label: "Branch Intelligence", icon: Building2, description: "Branch analytics" },
      { id: "workforce", label: "Workforce", icon: Users, description: "Employee data" },
      { id: "otp", label: "OTP Intelligence", icon: KeyRound, description: "OTP activity" },
      { id: "operators", label: "Operators", icon: Users, description: "Operator-level OTP details" },
      { id: "analytics", label: "Analytics", icon: BarChart3, description: "Business SQL" },
      { id: "bi", label: "BI Dashboard", icon: LayoutDashboard, description: "Power BI-style report" },
      { id: "ai", label: "AI Assistant", icon: Sparkles, description: "Ask your data" },
    ],
  },
  {
    label: "Security & Safety",
    items: [
      { id: "panic", label: "Panic Alerts", icon: Shield, description: "Panic + Emergency release" },
      { id: "smoke", label: "Smoke Alerts", icon: Flame, description: "Smoke + Ceiling sensors" },
    ],
  },
  {
    label: "Engineering",
    items: [
      { id: "monitoring", label: "Monitoring", icon: Activity, description: "Pipeline health" },
      { id: "errors", label: "Error Tracking", icon: ShieldAlert, description: "Error dashboard" },
      { id: "cloud", label: "Cloud Architecture", icon: Cloud, description: "Future AWS stack" },
      { id: "settings", label: "Settings", icon: Settings, description: "Configuration" },
    ],
  },
];

export const PAGE_META = {
  overview: { title: "Overview", subtitle: "Command center for branch operations" },
  ingestion: { title: "Data Ingestion", subtitle: "Upload operational files and validate them" },
  mapping: { title: "Column Mapping", subtitle: "Auto-map CSV columns to database fields" },
  etl: { title: "ETL Pipeline", subtitle: "Extract · Validate · Transform · Load" },
  quality: { title: "Data Quality", subtitle: "Rules, validations and quality score" },
  duplicates: { title: "Duplicates", subtitle: "Detect and clean duplicate rows" },
  branches: { title: "Branch Intelligence", subtitle: "Branch-level operational analytics" },
  workforce: { title: "Workforce", subtitle: "Employee and workforce insights" },
  otp: { title: "OTP Intelligence", subtitle: "OTP trends, operators and purposes" },
  operators: { title: "Operators", subtitle: "Operator-level OTP analytics" },
  analytics: { title: "Analytics", subtitle: "SQL-driven business analysis" },
  bi: { title: "BI Dashboard", subtitle: "Slicer-driven, cross-filtered report" },
  ai: { title: "AI Assistant", subtitle: "Ask your data in natural language" },
  panic: { title: "Panic Alerts", subtitle: "Panic + Emergency release events" },
  smoke: { title: "Smoke Alerts", subtitle: "Smoke + Ceiling sensor alerts" },
  monitoring: { title: "Monitoring", subtitle: "Pipeline and system health" },
  errors: { title: "Error Tracking", subtitle: "Live error log and monitoring" },
  cloud: { title: "Cloud Architecture", subtitle: "Local → AWS evolution roadmap" },
  settings: { title: "Settings", subtitle: "Environment and preferences" },
};