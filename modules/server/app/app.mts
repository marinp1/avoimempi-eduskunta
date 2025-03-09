import { Chart, type ChartConfiguration, plugins } from "chart.js/auto";
import "./app.css";

Chart.register(plugins.Filler);

const generateGenderStatistics = async (): Promise<ChartConfiguration> => {
  const resp = await fetch("/api/statistics/by-gender", { method: "GET" });
  const data = (await resp.json()) as {
    date: string;
    total_rows: number;
    number_of_women: number;
    number_of_men: number;
  }[];
  const config: ChartConfiguration = {
    type: "line",
    data: {
      labels: data.map((d) => d.date.slice(0, 10)),
      datasets: [
        {
          label: "# of Men",
          data: data.map((d) => d.number_of_men),
          fill: "+1",
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          borderColor: "rgb(75, 192, 192)",
          tension: 0.1,
        },
        {
          label: "# of Women",
          data: data.map((d) => d.number_of_women),
          fill: "origin",
          backgroundColor: "rgba(234, 82, 27, 0.2)",
          borderColor: "rgb(234, 82, 27)",
          tension: 0.1,
        },
      ],
    },
    options: {
      plugins: {
        filler: {
          propagate: true,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  };
  return config;
};

document.addEventListener("DOMContentLoaded", () => {
  const ctx = document.querySelector<HTMLCanvasElement>("#app-chart")!;
  generateGenderStatistics().then((conf) => {
    new Chart(ctx, conf);
  });
});
