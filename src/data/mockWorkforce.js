/**
 * DEMO DATA — replace with GET /api/workforce once backend ready.
 */

export const workforceKpis = [
  { label: "Total Employees", value: "1,300", delta: "↑ 1.8% MoM", tone: "ok" },
  { label: "Active Employees", value: "1,287", delta: "99% active", tone: "ok" },
  { label: "Branches w/ Employees", value: "432", delta: "98.2% coverage", tone: "soft" },
  { label: "Avg per Branch", value: "3.0", delta: "Steady", tone: "soft" },
];

export const employeesByRegion = {
  labels: ["North", "South", "East", "West", "Central"],
  data: [355, 290, 210, 285, 160],
};

export const employeesByBranch = {
  labels: ["Delhi CP", "Mumbai AE", "Bangalore K", "Hyderabad G", "Chennai TN"],
  data: [18, 14, 12, 13, 10],
};

export const employees = [
  { name: "Rajesh Kumar", number: "EMP1001", bm: "BM1024", branch: "Mumbai – Andheri East", region: "West", createdAt: "2024-03-12" },
  { name: "Priya Sharma", number: "EMP1002", bm: "BM1024", branch: "Mumbai – Andheri East", region: "West", createdAt: "2024-03-15" },
  { name: "Suresh Patil", number: "EMP1003", bm: "BM1088", branch: "Delhi – Connaught Place", region: "North", createdAt: "2024-03-18" },
  { name: "Anita Verma", number: "EMP1004", bm: "BM1088", branch: "Delhi – Connaught Place", region: "North", createdAt: "2024-03-20" },
  { name: "Karthik Iyer", number: "EMP1005", bm: "BM2010", branch: "Bangalore – Koramangala", region: "South", createdAt: "2024-03-22" },
  { name: "Meera Nair", number: "EMP1006", bm: "BM2010", branch: "Bangalore – Koramangala", region: "South", createdAt: "2024-03-25" },
  { name: "Arjun Reddy", number: "EMP1007", bm: "BM4411", branch: "Hyderabad – Gachibowli", region: "South", createdAt: "2024-03-28" },
  { name: "Deepa Menon", number: "EMP1008", bm: "BM3115", branch: "Chennai – T. Nagar", region: "South", createdAt: "2024-04-01" },
  { name: "Vikram Singh", number: "EMP1009", bm: "BM1320", branch: "Jaipur – MG Road", region: "North", createdAt: "2024-04-03" },
  { name: "Pooja Joshi", number: "EMP1010", bm: "BM4502", branch: "Pune – Hinjewadi", region: "West", createdAt: "2024-04-06" },
  { name: "Ravi Deshmukh", number: "EMP1011", bm: "BM4502", branch: "Pune – Hinjewadi", region: "West", createdAt: "2024-04-10" },
  { name: "Sunita Rao", number: "EMP1012", bm: "BM2201", branch: "Kolkata – Park Street", region: "East", createdAt: "2024-04-14" },
  { name: "Manoj Tiwari", number: "EMP1013", bm: "BM6001", branch: "Lucknow – Hazratganj", region: "Central", createdAt: "2024-04-17" },
  { name: "Neha Kapoor", number: "EMP1014", bm: "BM5030", branch: "Ahmedabad – SG Highway", region: "West", createdAt: "2024-04-20" },
  { name: "Amit Bhatt", number: "EMP1015", bm: "BM5030", branch: "Ahmedabad – SG Highway", region: "West", createdAt: "2024-04-22" },
];