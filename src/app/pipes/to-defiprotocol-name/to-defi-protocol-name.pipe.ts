import { Pipe, PipeTransform } from '@angular/core';
import { DBService } from '../../services/db/db.service';
import { firstValueFrom } from 'rxjs';

@Pipe({
  name: 'toDefiProtocolName',
  standalone: true,
})
export class ToDefiProtocolNamePipe implements PipeTransform {
  constructor(private readonly _dbService: DBService) {}

  async transform(protocolId?: string): Promise<string> {
    if (!protocolId) {
      return 'protocol not set';
    }
    const p = await firstValueFrom(this._dbService.defiProtocols$);
    console.log(p);

    return (
      p.find((protocol) => protocol.id === protocolId)?.name ??
      'protocol not found'
    );
  }
}
