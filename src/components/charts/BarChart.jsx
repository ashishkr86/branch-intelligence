import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, Tooltip, Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function BarChart({ labels = [], data = [], label = "Value", color = "#06b6d4", height = 260 }) {
  const chartData = {
    labels,
    datasets: [{
      label,
      data,
      backgroundColor: `${color}80`,
      hoverBackgroundColor: color,
      borderRadius: 6,
      borderSkipped: false,
      maxBarThickness: 40,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#111827",
        borderColor: "#1f2937",
        borderWidth: 1,
        titleColor: "#f1f5f9",
        bodyColor: "#94a3b8",
        padding: 10,
        displayColors: false,
      },
    },
    scales: {
      y: { grid: { color: "#1f2937" }, ticks: { color: "#64748b", font: { size: 10 } }, border: { display: false } },
      x: { grid: { display: false }, ticks: { color: "#64748b", font: { size: 11 } }, border: { display: false } },
    },
  };

  return <div style={{ height }}><Bar data={chartData} options={options} /></div>;
}