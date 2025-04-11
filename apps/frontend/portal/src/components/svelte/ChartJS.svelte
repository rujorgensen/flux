<script>
    /*
    // ✅ Only import what you use
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  CategoryScale
} from 'chart.js';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  CategoryScale
);
*/

    import { onMount } from "svelte";
    import Chart from "chart.js/auto";

    const data = [20, 100, 50, 12, 20, 130, 45];
    const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    let ctx;
    let canvas;

    onMount(() => {

        let lineColor = '#111';

        setInterval(() => {

            const rootStyles = getComputedStyle(document.documentElement);
            lineColor = rootStyles.getPropertyValue("--pop-color-1").trim();
            const fillColor = rootStyles.getPropertyValue("--pop-color-2").trim();
            
            console.log(lineColor,fillColor);
        });
      
        ctx = canvas.getContext("2d");
        const chart = new Chart(ctx, {
            options: {
                responseive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: "index",
                    intersect: false, // show tooltip even if not directly over the line
                    axis: "x",
                },
                animation: {
                    duration: 0,
                },
                plugins: {
                    tooltip: {
                        enabled: true,
                    },
                    legend: {
                        display: false,
                    },
                },
                scales: {
                    x: {
                        display: true,
                        ticks: {
                            font: {
                                family: "Atkinson",
                                size: 14,
                            },
                            color: "gray",
                        },
                        grid: {
                            display: true,
                        },
                    },
                    y: {
                        display: true,
                        ticks: {
                            font: {
                                family: "Atkinson",
                                size: 14,
                            },
                            color: "gray",
                        },
                        grid: {
                            display: true,
                        },
                    },
                },

                elements: {
                    point: {
                        radius: 0,
                    },
                },
            },
            type: "line",
            data: {
                labels: labels,
                datasets: [
                    {
                        label: "Unit Sales",
                        data: data,
                        tension: 0.4, // smoothness (0 = straight lines, 1 = max curve)


                        borderColor: lineColor,
                        //backgroundColor: fillColor, // "", // Fill under line (if `fill: true`)
                        fill: false, // set to true to fill under the line
                    },
                ],
            },
            annotation: {
                annotations: [
                    {
                        type: "line",
                        mode: "horizontal",
                        scaleID: "y-axis-0",
                        value: 5,
                        borderColor: "--pop-color-1",
                        borderWidth: 4,
                        label: {
                            enabled: false,
                            content: "Test label",
                        },
                    },
                ],
            },
        });
    });
</script>

<div id="chart-container">
    <canvas bind:this={canvas}></canvas>
</div>

<style>
    #chart-container {
        width: 100%;
        height: 100%;
    }
</style>
