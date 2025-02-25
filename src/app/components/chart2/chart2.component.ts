import { Component, ElementRef, Input } from '@angular/core';
import Chart, { ChartTypeRegistry } from 'chart.js/auto';
import ChartDataLabels, { Context } from 'chartjs-plugin-datalabels';
import { getChartLabelPlugin } from 'chart.js-plugin-labels-dv';
Chart.register(ChartDataLabels, getChartLabelPlugin());

@Component({
  standalone: true,
  selector: 'app-chart2',
  templateUrl: './chart2.component.html',
  styleUrls: ['./chart2.component.scss'],
})
export class Chart2Component {
  @Input() set data(data: { datasets: number[]; labels: string[] } | null) {
    setTimeout(() => {
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
      const totalWalletWorth = data.datasets.reduce(
        (acc, curr) => acc + curr,
        0
      );
      const dataAsPercentage = data.datasets.map(
        (value) => (value / totalWalletWorth) * 100
      );
      // limit the data to 5 elements & add the rest to 'others'
      const labelsLimited = [
        ...data.labels.slice(0, 5),
        data.labels.length > 5 ? 'Others' : null,
      ].filter(Boolean) as string[];
      const dataLimited = [
        ...dataAsPercentage.slice(0, 5),
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
              backgroundColor: [
                // generate color with descending opacity
                ...labelsLimited.map(
                  (_, index) => `rgba(93,98,238, ${1 - index * 0.25})`
                ),
              ],
              hoverOffset: 4,
              borderWidth: 0,
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
              formatter: (value: number, ctx: Context) => {
                return `${value.toFixed(2)}%`;
              },
            },
          },
        },
      });
      // handle click
    }, 125);
  }
  public chartElement!: Chart<keyof ChartTypeRegistry, number[], string>;

  constructor(private readonly _elementRef: ElementRef<HTMLElement>) {}
}
