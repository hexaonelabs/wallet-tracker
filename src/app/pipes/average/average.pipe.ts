import { Pipe, PipeTransform } from '@angular/core';
import { AssetPosition } from '../../interfaces';
import { DBService } from '../../services/db/db.service';
import { firstValueFrom } from 'rxjs';

@Pipe({
  name: 'average',
  standalone: true
})
export class AveragePipe implements PipeTransform {

  constructor(
    private readonly _db: DBService
  ) { }

  async transform(value: AssetPosition) {
    const txs = await firstValueFrom(this._db.txs$);
    const filtered = txs.filter(tx => tx.tickerId === value.tickerId);

    if (!filtered.length) {
      return 0;
    }

    // Calculate total cost and total quantity
    const totalCost = filtered.reduce((sum, tx) => sum + (tx.quantity * tx.price), 0);
    const totalQuantity = filtered.reduce((sum, tx) => sum + tx.quantity, 0);

    // Calculate relative average cost
    const relativeAverageCost = totalCost / totalQuantity;

    return relativeAverageCost;
  }

}
