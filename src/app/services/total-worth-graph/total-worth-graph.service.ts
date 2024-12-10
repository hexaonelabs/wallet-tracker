import { Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, of } from 'rxjs';
import { CoinsService } from '../coins/coins.service';
import { AssetPosition, Tx } from '../../interfaces';
import { formatDataForChart } from '../../app.utils';

export interface PortfolioData {
  date: string;
  value: number;
}

@Injectable({
  providedIn: 'root',
})
export class TotalWorthGraphService {
  constructor(private readonly _coinService: CoinsService) {}

  getPortfolioHistory$(
    assets: ({ txs: Tx[] } & AssetPosition)[],
    days: number = 30
  ): Observable<PortfolioData[]> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    // Créer un tableau d'observables pour chaque cryptomonnaie
    const observables = assets.map(
      ({ total, sparkline7d, txs, units }) => {
        const prices = {
          prices: formatDataForChart(sparkline7d?.price || []).map((e) => [
            e.time,
            e.value,
          ]) as [number, number][],
        };
        const result = this._calculateCoinValue(
          prices,
          units,
          startDate,
          endDate,
          txs
        );
        console.log('result', { prices, result });

        // return as Observable
        return of(result);
      }
      // this._getCoinHistory$(tickerId, days).pipe(
      //   map((history) =>
      //     this._calculateCoinValue(
      //       history,
      //       amount,
      //       startDate,
      //       endDate,
      //       transactions.filter((tx) => tx.tickerId === tickerId)
      //     )
      //   )
      // )
    );

    // Combiner tous les observables
    return forkJoin(observables).pipe(
      map((results) => this._aggregatePortfolioValue(results)),
      catchError((error) => {
        console.error(
          'Erreur lors de la récupération des données du portefeuille:',
          error
        );
        return of([]);
      })
    );
  }

  private _getCoinHistory$(
    tickerId: string,
    days: number
  ): Observable<{ prices: [number, number][] }> {
    return this._coinService.get7DaysHistoryData$(tickerId);
    // return this._coinService.getHistoryData$(tickerId, days);
  }

  private _calculateCoinValue(
    history: { prices: [number, number][] },
    finalAmount: number,
    startDate: Date,
    endDate: Date,
    transactions: Tx[]
  ): PortfolioData[] {
    return history.prices
      .map(([timestamp, price]: [number, number]) => {
        const date = new Date(timestamp);
        if (
          date.getTime() >= startDate.getTime() &&
          date.getTime() <= endDate.getTime()
        ) {
          const amountAtDate = this._getAmountAtDate(
            transactions,
            date,
            finalAmount
          );
          return {
            date: date.toISOString(),
            value: price * amountAtDate,
          };
        }
        return null;
      })
      .filter((data) => data !== null);
  }

  private _getAmountAtDate(
    transactions: Tx[],
    date: Date,
    finalAmount: number
  ): number {
    let amount = finalAmount;
    for (let i = transactions.length - 1; i >= 0; i--) {
      const tx = transactions[i];
      if (new Date(tx.createdAt).getTime() > date.getTime()) {
        amount -= tx.quantity;
      } else {
        break;
      }
    }
    return amount;
  }

  private _aggregatePortfolioValue(
    coinsData: PortfolioData[][]
  ): PortfolioData[] {
    const aggregatedData: { [date: string]: number } = {};
    console.log('coinsData', coinsData);

    coinsData.forEach((coinData) => {
      coinData.forEach(({ date, value }) => {
        if (aggregatedData[date]) {
          aggregatedData[date] += value;
        } else {
          aggregatedData[date] = value;
        }
      });
    });

    return Object.entries(aggregatedData)
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}
