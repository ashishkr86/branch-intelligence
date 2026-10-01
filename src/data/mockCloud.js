/**
 * DEMO DATA — Cloud architecture roadmap.
 * The "future" flag distinguishes what's live (local) vs planned (AWS).
 */

export const layers = [
  {
    id: "user",
    label: "User / Browser",
    description: "React SPA served to the browser",
    status: "live",
    icon: "Users",
  },
  {
    id: "cdn",
    label: "CloudFront CDN",
    description: "Static asset distribution + edge caching",
    status: "future",
    icon: "Globe",
  },
  {
    id: "lb",
    label: "Load Balancer",
    description: "AWS ALB · HTTPS termination",
    status: "future",
    icon: "Network",
  },
  {
    id: "api",
    label: "FastAPI Application",
    description: "Containerized Python API",
    status: "live",
    icon: "Server",
  },
  {
    id: "s3",
    label: "S3 Data Lake",
    description: "Landing zone for raw CSVs",
    status: "future",
    icon: "Database",
  },
  {
    id: "etl",
    label: "Airflow ETL",
    description: "Scheduled DAG orchestration",
    status: "future",
    icon: "Workflow",
  },
  {
    id: "rds",
    label: "RDS MySQL",
    description: "Managed relational database",
    status: "future",
    icon: "HardDrive",
  },
  {
    id: "analytics",
    label: "Analytics Engine",
    description: "SQL + aggregations",
    status: "live",
    icon: "BarChart3",
  },
  {
    id: "bi",
    label: "Power BI",
    description: "Executive dashboards",
    status: "future",
    icon: "PieChart",
  },
];

export const techStack = [
  { category: "Frontend", items: [
    { name: "React 18", status: "live" },
    { name: "Tailwind CSS", status: "live" },
    { name: "Chart.js", status: "live" },
    { name: "Vite", status: "live" },
  ]},
  { category: "Backend", items: [
    { name: "Python 3.11+", status: "live" },
    { name: "FastAPI", status: "live" },
    { name: "SQLAlchemy", status: "live" },
    { name: "Uvicorn", status: "live" },
  ]},
  { category: "Data", items: [
    { name: "MySQL 8.0", status: "live" },
    { name: "Pandas ETL", status: "live" },
    { name: "PyMySQL", status: "live" },
    { name: "SQL", status: "live" },
  ]},
  { category: "Future / Cloud", items: [
    { name: "Docker", status: "future" },
    { name: "AWS S3", status: "future" },
    { name: "AWS RDS", status: "future" },
    { name: "Airflow", status: "future" },
    { name: "Terraform", status: "future" },
    { name: "Kubernetes", status: "future" },
    { name: "CloudWatch", status: "future" },
    { name: "CI/CD · GitHub Actions", status: "future" },
  ]},
];

export const roadmap = [
  { phase: 1, title: "MySQL Schema", status: "done", wave: "Wave A" },
  { phase: 2, title: "Python ETL", status: "done", wave: "Wave A" },
  { phase: 3, title: "Data Quality", status: "done", wave: "Wave 3" },
  { phase: 4, title: "Power BI Dashboards", status: "future", wave: "Phase 4" },
  { phase: 5, title: "FastAPI Backend", status: "done", wave: "Wave 5" },
  { phase: 6, title: "Production Frontend", status: "done", wave: "Wave 6" },
  { phase: 7, title: "Docker Containers", status: "future", wave: "Phase 7" },
  { phase: 8, title: "AWS Deployment", status: "future", wave: "Phase 8" },
  { phase: 9, title: "Airflow Orchestration", status: "future", wave: "Phase 9" },
  { phase: 10, title: "Spark Processing", status: "future", wave: "Phase 10" },
  { phase: 11, title: "Terraform IaC", status: "future", wave: "Phase 11" },
  { phase: 12, title: "Kubernetes", status: "future", wave: "Phase 12" },
];

export const cloudStatus = {
  localStorage: "connected",
  awsAccount: "not configured",
  containers: "not deployed",
  ciPipeline: "manual",
  monitoring: "local logs only",
};