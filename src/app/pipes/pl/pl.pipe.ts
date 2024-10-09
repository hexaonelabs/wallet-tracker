import { Pipe, PipeTransform } from '@angular/core';
import { AssetPosition } from '../../interfaces';
import { AveragePipe } from '../average/average.pipe';
import { DBService } from '../../services/db/db.service';

@Pipe({
  name: 'PL',
  standalone: true
})
export class PLPipe implements PipeTransform {

  constructor(
    private readonly _db:DBService
  ) { }

  async transform(value: AssetPosition): Promise<number> {
    const assetTotal = value.price * value.units;
    const assetBuyPriceTotal = (await new AveragePipe(this._db).transform(value)) * value.units;
    return assetTotal - assetBuyPriceTotal;
  }

}
