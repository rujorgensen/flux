import {
    Component,
    ViewChild,
    ElementRef,
    AfterViewInit,
    OnDestroy,
    ChangeDetectionStrategy,
} from '@angular/core';
import Chart from 'chart.js/auto';

@Component({
    selector: 'app-chart',
    templateUrl: './chart.component.html',
    styleUrls: ['./chart.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartComponent implements AfterViewInit, OnDestroy {
    @ViewChild('canvas', { static: false }) canvas!: ElementRef<HTMLCanvasElement>;
    private chart?: Chart;

    private readonly data = [20, 100, 50, 12, 20, 130, 45];
    private readonly labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    ngAfterViewInit() {
        this.initChart();
    }

    ngOnDestroy() {
        if (this.chart) {
            this.chart.destroy();
        }
    }

    private initChart() {
        const lineColor = "#111";

        const ctx = this.canvas.nativeElement.getContext("2d");
        if (!ctx) return;

        this.chart = new Chart(
            ctx,
            {
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: "index",
                        intersect: false,
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
                    labels: this.labels,
                    datasets: [
                        {
                            label: "Unit Sales",
                            data: this.data,
                            tension: 0.4,
                            borderColor: lineColor,
                            fill: false,
                        },
                    ],
                },
            },
        );
    }
}
