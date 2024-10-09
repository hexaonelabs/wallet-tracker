import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'total',
  standalone: true
})
export class TotalPipe implements PipeTransform {

  transform(value: unknown, ...args: unknown[]): unknown {
    return null;
  }

}
