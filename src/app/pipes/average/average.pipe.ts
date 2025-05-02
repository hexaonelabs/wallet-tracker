import { Pipe, PipeTransform } from '@angular/core';
import { AssetPosition } from '../../interfaces';

@Pipe({
  name: 'average',
  standalone: true,
})
export class AveragePipe implements PipeTransform {
  async transform(value: AssetPosition) {
    return value.averageCost;
  }
}
