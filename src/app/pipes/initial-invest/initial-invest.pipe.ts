import { Pipe, PipeTransform } from '@angular/core';
import { AssetPosition, Tx } from '../../interfaces';

@Pipe({
  name: 'initialInvest',
  standalone: true,
})
export class InitialInvestPipe implements PipeTransform {
  transform(value: AssetPosition & { txs: Tx[] }): number {
    // calculate the initial investment based on txs with positive quantity
    return value.txs.reduce((acc, tx) => {
      return tx.quantity > 0 ? acc + tx.quantity * tx.price : acc;
    }, 0);
  }
}
