"use client";

import { useMemo } from "react";
import { Scatter } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Title,
  type ChartData,
  type ChartDataset,
  type Plugin,
  type ChartOptions,
  type TooltipItem,
} from "chart.js";

import { cn } from "@/lib/utils";

type VectorPoint = {
  x: number;
  y: number;
  title?: string;
  details?: string[];
  distance?: number;
};

type Props = {
  data: VectorPoint[];
  query?: VectorPoint;
  title?: string;
  datasetLabel?: string;
  queryLabel?: string;
  className?: string;
};

const nearestNeighborsPlugin: Plugin<"scatter"> = {
  id: "nearestNeighbors",
  afterDraw: (chart) => {
    const { ctx, scales } = chart;
    const queryDataset = chart.data.datasets[1];
    const vectorsDataset = chart.data.datasets[0];

    if (!queryDataset?.data[0] || !vectorsDataset?.data.length) return;

    const query = queryDataset.data[0] as VectorPoint;
    const vectors = vectorsDataset.data as VectorPoint[];

    const nearestPoints = vectors
      .map((point) => ({
        ...point,
        distance: Math.sqrt(Math.pow(point.x - query.x, 2) + Math.pow(point.y - query.y, 2)),
      }))
      .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
      .slice(0, 5);

    ctx.save();
    ctx.strokeStyle = "rgba(128, 128, 128, 0.7)";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();

    nearestPoints.forEach((point) => {
      const startX = scales.x.getPixelForValue(query.x);
      const startY = scales.y.getPixelForValue(query.y);
      const endX = scales.x.getPixelForValue(point.x);
      const endY = scales.y.getPixelForValue(point.y);
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
    });

    ctx.stroke();
    ctx.restore();
  },
};

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend, Title, nearestNeighborsPlugin);

export default function LowVectorVisualization({ data, query, title = "Low Vector Visualization", datasetLabel = "Vectors", queryLabel = "Query", className }: Props) {
  const chartData = useMemo<ChartData<"scatter", VectorPoint[], unknown>>(() => {
    const datasets: ChartDataset<"scatter", VectorPoint[]>[] = [
      {
        label: datasetLabel,
        data: data.map((point) => ({
          x: point.x,
          y: point.y,
          title: point.title,
          details: point.details,
        })),
        backgroundColor: "rgba(75, 192, 192, 0.6)",
        pointRadius: 6,
        pointHoverRadius: 8,
      },
    ];

    if (query) {
      datasets.push({
        label: queryLabel,
        data: [{ x: query.x, y: query.y, title: query.title, details: query.details }],
        backgroundColor: "rgba(255, 99, 132, 0.85)",
        pointRadius: 8,
        pointHoverRadius: 10,
      });
    }

    return { datasets };
  }, [data, query, datasetLabel, queryLabel]);

  const options: ChartOptions<"scatter"> & { plugins: { nearestNeighbors: { enabled: boolean } } } = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" as const },
      title: { display: true, text: title },
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<"scatter">) => {
            const point = context.raw as VectorPoint;
            const lines: string[] = [];
            if (point.title) lines.push(point.title);
            lines.push(`(x: ${context.parsed.x}, y: ${context.parsed.y})`);
            if (point.details?.length) lines.push(...point.details);
            return lines;
          },
        },
      },
      nearestNeighbors: { enabled: true },
    },
    scales: {
      x: { grid: { display: true, color: "rgba(0, 0, 0, 0.1)" }, title: { display: true, text: "X Axis" } },
      y: { grid: { display: true, color: "rgba(0, 0, 0, 0.1)" }, title: { display: true, text: "Y Axis" } },
    },
  };

  return (
    <div className={cn("relative rounded-lg border border-gray-200 bg-white p-4 shadow-sm", className)} role="region" aria-label={`${title} scatter plot`}>
      <Scatter options={options} data={chartData} />
    </div>
  );
}
