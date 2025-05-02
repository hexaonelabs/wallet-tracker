import { Pipe, PipeTransform } from '@angular/core';
import { AssetPosition } from '../../interfaces';

@Pipe({
  name: 'totalPosition',
  standalone: true,
})
export class TotalPositionPipe implements PipeTransform {
  transform(value: AssetPosition): number {
    console.log;
    return (value.currentPrice || 0) * value.units;
  }
}
