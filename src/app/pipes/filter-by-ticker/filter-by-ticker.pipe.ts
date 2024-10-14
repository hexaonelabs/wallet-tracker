import { Pipe, PipeTransform } from '@angular/core';
import { Tx } from '../../interfaces';

@Pipe({
  name: 'filterByTicker',
  standalone: true,
})
export class FilterByTickerPipe implements PipeTransform {
  transform(value: Tx[] | null, tickerId: string): Tx[] {
    if (value && tickerId) {
      return value.filter(
        (tx) => tx.tickerId.toLocaleUpperCase() === tickerId.toLocaleUpperCase()
      );
    }
    return [];
  }
}
