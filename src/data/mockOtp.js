/**
 * DEMO DATA — replace with GET /api/otp once backend ready.
 */

export const otpKpis = [
  { label: "Total OTP", value: "26,555", delta: "↑ 5.4% today", tone: "ok" },
  { label: "Today", value: "1,725", delta: "Peak hour 12PM", tone: "soft" },
  { label: "Active Branches", value: "398", delta: "90.5% of total", tone: "ok" },
  { label: "Unique Operators", value: "215", delta: "Across 5 regions", tone: "soft" },
  { label: "Avg per Branch", value: "60.4", delta: "Median 42", tone: "soft" },
];

export const otpTrend = {
  labels: ["Sep 7", "Sep 8", "Sep 9", "Sep 10", "Sep 11", "Sep 12", "Sep 13", "Sep 14", "Sep 15", "Sep 16", "Sep 17", "Sep 18", "Sep 19", "Sep 20", "Sep 21", "Sep 22", "Sep 23", "Sep 24", "Sep 25", "Sep 26"],
  data: [840, 920, 1100, 980, 1260, 1180, 1320, 1410, 1240, 1510, 1380, 1600, 1490, 1710, 1580, 1430, 1550, 1640, 1510, 1725],
};

export const otpByPurpose = {
  labels: ["Customer Purpose", "Final Vault Closing", "Audit Purpose", "Packet Counting", "Other Purpose"],
  data: [12400, 6200, 4100, 2600, 1255],
  colors: ["#06b6d4", "#10b981", "#f59e0b", "#8b5cf6", "#64748b"],
};

export const otpByOperator = {
  labels: ["Rajesh", "Suresh", "Priya", "Vikram", "Anita", "Karthik"],
  data: [820, 715, 640, 590, 480, 420],
};

export const otpByBranch = {
  labels: ["Mumbai AE", "Delhi CP", "Bangalore K", "Chennai TN", "Kolkata PS"],
  data: [1842, 1725, 1650, 1540, 1420],
};

export const otpByHour = {
  labels: ["08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19"],
  data: [420, 780, 1200, 1580, 1725, 1620, 1480, 1350, 1210, 980, 640, 320],
};

export const otpRecords = [
  { id: "1", bm: "BM1024", branch: "Mumbai – Andheri East", purpose: "Customer Purpose", operator: "Rajesh", date: "2026-09-26", time: "12:42:15", mobile: "98XXXXXX12" },
  { id: "2", bm: "BM1088", branch: "Delhi – Connaught Place", purpose: "Final Vault Closing", operator: "Suresh", date: "2026-09-26", time: "12:38:02", mobile: "98XXXXXX34" },
  { id: "3", bm: "BM2010", branch: "Bangalore – Koramangala", purpose: "Audit Purpose", operator: "Priya", date: "2026-09-26", time: "12:35:48", mobile: "98XXXXXX56" },
  { id: "4", bm: "BM3115", branch: "Chennai – T. Nagar", purpose: "Customer Purpose", operator: "Vikram", date: "2026-09-26", time: "12:30:11", mobile: "98XXXXXX78" },
  { id: "5", bm: "BM2201", branch: "Kolkata – Park Street", purpose: "Packet Counting", operator: "Anita", date: "2026-09-26", time: "12:28:55", mobile: "98XXXXXX90" },
  { id: "6", bm: "BM4502", branch: "Pune – Hinjewadi", purpose: "Customer Purpose", operator: "Karthik", date: "2026-09-26", time: "12:25:22", mobile: "98XXXXXX01" },
  { id: "7", bm: "BM4411", branch: "Hyderabad – Gachibowli", purpose: "Other Purpose", operator: "Meera", date: "2026-09-26", time: "12:20:40", mobile: "98XXXXXX23" },
  { id: "8", bm: "BM1320", branch: "Jaipur – MG Road", purpose: "Customer Purpose", operator: "Ravi", date: "2026-09-26", time: "12:15:18", mobile: "98XXXXXX45" },
  { id: "9", bm: "BM5030", branch: "Ahmedabad – SG Highway", purpose: "Audit Purpose", operator: "Sunita", date: "2026-09-26", time: "12:12:03", mobile: "98XXXXXX67" },
  { id: "10", bm: "BM6001", branch: "Lucknow – Hazratganj", purpose: "Final Vault Closing", operator: "Manoj", date: "2026-09-26", time: "11:58:44", mobile: "98XXXXXX89" },
];
