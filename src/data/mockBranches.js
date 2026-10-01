/**
 * DEMO DATA — replace with GET /api/branches once backend ready.
 */

export const branchKpis = [
  { label: "Total Branches", value: "440", delta: "↑ 3.2% MoM", tone: "ok" },
  { label: "Active Branches", value: "412", delta: "93.6% active", tone: "soft" },
  { label: "Regions Covered", value: "5", delta: "All operational", tone: "soft" },
  { label: "Branches w/ OTP", value: "398", delta: "90.5% coverage", tone: "ok" },
];

export const branchByRegion = {
  labels: ["North", "South", "East", "West", "Central"],
  data: [120, 95, 78, 92, 55],
};

export const topBranches = [
  { bm: "BM1024", name: "Mumbai – Andheri East", region: "West", otp: "1,842", employees: 14, status: "active" },
  { bm: "BM1088", name: "Delhi – Connaught Place", region: "North", otp: "1,725", employees: 18, status: "active" },
  { bm: "BM2010", name: "Bangalore – Koramangala", region: "South", otp: "1,650", employees: 12, status: "active" },
  { bm: "BM3115", name: "Chennai – T. Nagar", region: "South", otp: "1,540", employees: 10, status: "active" },
  { bm: "BM2201", name: "Kolkata – Park Street", region: "East", otp: "1,420", employees: 11, status: "active" },
  { bm: "BM4502", name: "Pune – Hinjewadi", region: "West", otp: "1,388", employees: 9, status: "active" },
  { bm: "BM4411", name: "Hyderabad – Gachibowli", region: "South", otp: "1,270", employees: 13, status: "active" },
  { bm: "BM1320", name: "Jaipur – MG Road", region: "North", otp: "1,142", employees: 7, status: "warn" },
];

export const allBranches = [
  { bm: "BM1024", name: "Mumbai – Andheri East", region: "West", otp: "1,842", employees: 14, lastOtp: "12:42 PM", status: "active" },
  { bm: "BM1088", name: "Delhi – Connaught Place", region: "North", otp: "1,725", employees: 18, lastOtp: "12:38 PM", status: "active" },
  { bm: "BM2010", name: "Bangalore – Koramangala", region: "South", otp: "1,650", employees: 12, lastOtp: "12:35 PM", status: "active" },
  { bm: "BM3115", name: "Chennai – T. Nagar", region: "South", otp: "1,540", employees: 10, lastOtp: "12:30 PM", status: "active" },
  { bm: "BM2201", name: "Kolkata – Park Street", region: "East", otp: "1,420", employees: 11, lastOtp: "12:28 PM", status: "active" },
  { bm: "BM4502", name: "Pune – Hinjewadi", region: "West", otp: "1,388", employees: 9, lastOtp: "12:25 PM", status: "active" },
  { bm: "BM4411", name: "Hyderabad – Gachibowli", region: "South", otp: "1,270", employees: 13, lastOtp: "12:20 PM", status: "active" },
  { bm: "BM1320", name: "Jaipur – MG Road", region: "North", otp: "1,142", employees: 7, lastOtp: "Yesterday", status: "warn" },
  { bm: "BM5030", name: "Ahmedabad – SG Highway", region: "West", otp: "1,105", employees: 8, lastOtp: "12:15 PM", status: "active" },
  { bm: "BM6001", name: "Lucknow – Hazratganj", region: "Central", otp: "985", employees: 6, lastOtp: "11:58 AM", status: "active" },
  { bm: "BM1310", name: "Chandigarh – Sector 17", region: "North", otp: "820", employees: 5, lastOtp: "Yesterday", status: "warn" },
  { bm: "BM3301", name: "Coimbatore – RS Puram", region: "South", otp: "712", employees: 4, lastOtp: "11:42 AM", status: "active" },
  { bm: "BM5104", name: "Surat – Ring Road", region: "West", otp: "640", employees: 5, lastOtp: "11:30 AM", status: "active" },
  { bm: "BM7002", name: "Bhopal – MP Nagar", region: "Central", otp: "512", employees: 3, lastOtp: "10:58 AM", status: "active" },
  { bm: "BM8001", name: "Guwahati – GS Road", region: "East", otp: "0", employees: 4, lastOtp: "—", status: "idle" },
];