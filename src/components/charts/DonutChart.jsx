import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function DonutChart({
  labels = [], data = [],
  colors = ["#06b6d4", "#10b981", "#f59e0b", "#8b5cf6", "#64748b"],
  height = 260,
}) {
  const chartData = {
    labels,
    datasets: [{
      data,
      backgroundColor: colors,
      borderColor: "#0a0e1a",
      borderWidth: 3,
      hoverOffset: 6,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "65%",
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: "#94a3b8",
          font: { size: 11 },
          padding: 12,
          boxWidth: 8,
          boxHeight: 8,
          usePointStyle: true,
          pointStyle: "circle",
        },
      },
      tooltip: {
        backgroundColor: "#111827",
        borderColor: "#1f2937",
        borderWidth: 1,
        titleColor: "#f1f5f9",
        bodyColor: "#94a3b8",
        padding: 10,
      },
    },
  };

  return <div style={{ height }}><Doughnut data={chartData} options={options} /></div>;
}