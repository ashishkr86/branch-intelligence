import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

export default function LineChart({ labels = [], data = [], label = "Value", color = "#06b6d4", height = 260 }) {
  const chartData = {
    labels,
    datasets: [{
      label,
      data,
      borderColor: color,
      backgroundColor: `${color}15`,
      borderWidth: 2,
      tension: 0.35,
      pointRadius: 0,
      pointHoverRadius: 5,
      pointHoverBackgroundColor: color,
      pointHoverBorderColor: "#0a0e1a",
      pointHoverBorderWidth: 2,
      fill: true,
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
      x: { grid: { display: false }, ticks: { color: "#64748b", font: { size: 10 }, maxTicksLimit: 8 }, border: { display: false } },
    },
  };

  return <div style={{ height }}><Line data={chartData} options={options} /></div>;
}