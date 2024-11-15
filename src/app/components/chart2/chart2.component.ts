import { Component, ElementRef, Input } from '@angular/core';
import Chart, { ChartTypeRegistry } from 'chart.js/auto';
import ChartDataLabels from 'chartjs-plugin-datalabels';
Chart.register(ChartDataLabels);

@Component({
  standalone: true,
  selector: 'app-chart2',
  templateUrl: './chart2.component.html',
  styleUrls: ['./chart2.component.scss'],
})
export class Chart2Component {
  @Input() set data(data: { datasets: number[]; labels: string[] } | null) {
    if (this.chartElement) {
      this.chartElement.destroy();
    }
    if (!this._elementRef.nativeElement) {
      return;
    }
    const el = this._elementRef.nativeElement.querySelector(
      'canvas'
    ) as HTMLCanvasElement;
    if (!el) {
      return;
    }
    if (!data) {
      return;
    }
    const totalWalletWorth = data.datasets.reduce((acc, curr) => acc + curr, 0);
    const dataAsPercentage = data.datasets.map(
      (value) => (value / totalWalletWorth) * 100
    );
    // limit the data to 9 elements & add the rest to 'others'
    const labelsLimited = [...data.labels.slice(0, 9), 'Others'];
    const dataLimited = [
      ...dataAsPercentage.slice(0, 9),
      dataAsPercentage.slice(9).reduce((acc, curr) => acc + curr, 0),
    ];
    // build chart
    this.chartElement = new Chart(el, {
      type: 'doughnut',
      data: {
        labels: labelsLimited,
        datasets: [
          {
            data: dataLimited,
          },
        ],
      },
      plugins: [ChartDataLabels],
      options: {
        plugins: {
          legend: {
            position: 'right',
          },
          datalabels: {
            formatter: function (value, context) {
              return `${value.toFixed(2)}%`;
            },
          },
        },
      },
    });
  }
  public chartElement!: Chart<keyof ChartTypeRegistry, number[], string>;

  constructor(private readonly _elementRef: ElementRef<HTMLElement>) {}
}
