import {
    Component,
    ViewChild,
    ElementRef,
    AfterViewInit,
    OnDestroy,
    OnChanges,
    ChangeDetectionStrategy,
    Input,
} from '@angular/core';
import Chart from 'chart.js/auto';

export interface IChartDataset {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor?: string;
}

@Component({
    selector: 'app-chart',
    templateUrl: './chart.component.html',
    styleUrls: ['./chart.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartComponent implements AfterViewInit, OnChanges, OnDestroy {
    @ViewChild('canvas', { static: false }) canvas!: ElementRef<HTMLCanvasElement>;

    @Input() labels: string[] = [];
    @Input() datasets: IChartDataset[] = [];

    private chart?: Chart;

    ngAfterViewInit() {
        this.initChart();
    }

    ngOnChanges(): void {
        if (this.chart) {
            this.chart.data.labels = this.labels;
            this.chart.data.datasets = this.datasets.map((ds) => ({
                label: ds.label,
                data: ds.data,
                borderColor: ds.borderColor,
                backgroundColor: ds.backgroundColor,
                tension: 0.4,
                fill: ds.backgroundColor !== undefined,
            }));
            // Skip animation on incremental data updates to avoid janky re-renders.
            this.chart.update('none');
        }
    }

    ngOnDestroy() {
        if (this.chart) {
            this.chart.destroy();
        }
    }

    private initChart() {
        const ctx = this.canvas.nativeElement.getContext("2d");
        if (!ctx) return;

        this.chart = new Chart(
            ctx,
            {
                type: "line",
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: "index",
                        intersect: false,
                        axis: "x",
                    },
                    animation: {
                        duration: 300,
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
                                maxTicksLimit: 8,
                                font: {
                                    family: "Atkinson",
                                    size: 12,
                                },
                                color: "gray",
                            },
                            grid: {
                                display: false,
                            },
                        },
                        y: {
                            display: true,
                            beginAtZero: true,
                            ticks: {
                                font: {
                                    family: "Atkinson",
                                    size: 12,
                                },
                                color: "gray",
                            },
                            grid: {
                                display: true,
                                color: "rgba(128, 128, 128, 0.15)",
                            },
                        },
                    },
                    elements: {
                        point: {
                            radius: 2,
                            hoverRadius: 5,
                        },
                    },
                },
                data: {
                    labels: this.labels,
                    datasets: this.datasets.map((ds) => ({
                        label: ds.label,
                        data: ds.data,
                        borderColor: ds.borderColor,
                        backgroundColor: ds.backgroundColor,
                        tension: 0.4,
                        fill: ds.backgroundColor !== undefined,
                    })),
                },
            },
        );
    }
}
