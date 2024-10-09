import { Pipe, PipeTransform } from '@angular/core';
import { AssetPosition, Tx } from '../../interfaces';

@Pipe({
  name: 'totalPosition',
  standalone: true
})
export class TotalPositionPipe implements PipeTransform {

  transform(value: AssetPosition): number {
    return value.price * value.units;
  }

}
