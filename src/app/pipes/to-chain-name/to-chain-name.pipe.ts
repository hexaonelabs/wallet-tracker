import { Pipe, PipeTransform } from '@angular/core';
import { CoinsService } from '../../services/coins/coins.service';

@Pipe({
  name: 'toChainName',
  standalone: true,
})
export class ToChainNamePipe implements PipeTransform {
  constructor(private readonly _coinService: CoinsService) {}

  async transform(chainId?: string): Promise<string> {
    if (!chainId) {
      return 'chain not set';
    }
    const chains = await this._coinService.getChainIdList([chainId]);
    return (
      chains.find((chain) => chain.id === chainId)?.name ?? 'chain not found'
    );
  }
}
