import { Pipe, PipeTransform } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { APIService } from '../../services/api.service';

@Pipe({
  name: 'toDefiProtocolName',
  standalone: true,
})
export class ToDefiProtocolNamePipe implements PipeTransform {
  constructor(private readonly _api: APIService) {}

  async transform(protocolId?: string): Promise<string> {
    if (!protocolId) {
      return 'protocol not set';
    }
    const p = await firstValueFrom(this._api.defiProtocols$);
    return (
      p?.find((protocol) => protocol.id === protocolId)?.name ??
      'protocol not found'
    );
  }
}
