import { Pipe, PipeTransform } from '@angular/core';
import { AssetPosition } from '../../interfaces';

@Pipe({
  name: 'totalPercent',
  standalone: true
})
export class TotalPercentPipe implements PipeTransform {

  transform(value: AssetPosition, totalWalletWorth: number): number {
    // calcul wallet ratio
    const assetTotal =  value.price * value.units;
    const ratio = assetTotal / totalWalletWorth;
    // return ratio as percentage
    return ratio * 100;

  }

}
