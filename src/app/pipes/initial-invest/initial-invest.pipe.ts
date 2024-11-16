import { Pipe, PipeTransform } from '@angular/core';
import { AssetPosition, Tx } from '../../interfaces';

@Pipe({
  name: 'initialInvest',
  standalone: true,
})
export class InitialInvestPipe implements PipeTransform {
  transform(value: AssetPosition & { txs: Tx[] }): number {
    // Calculate total cost of all transactions
    const totalCost = value.txs.reduce(
      (sum, tx) => sum + tx.quantity * tx.price,
      0
    );
    return totalCost;
  }
}
