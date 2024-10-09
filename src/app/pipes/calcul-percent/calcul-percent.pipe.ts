import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'calculPercent',
  standalone: true
})
export class CalculPercentPipe implements PipeTransform {

  transform(a: number, b: number): number {
    return (a / b) * 100;
  }

}
