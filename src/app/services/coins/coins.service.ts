import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { combineLatest, firstValueFrom, map, Observable } from 'rxjs';
import { Auth, getAuth } from '@angular/fire/auth';
import { APIService } from '../api.service';

@Injectable({
  providedIn: 'root',
})
export class CoinsService {
  constructor(
    private readonly _http: HttpClient,
    private readonly _api: APIService,
    private _auth: Auth
  ) {}

  async getAllCoinsId() {
    // check if data is available in local storage
    const coinsList = localStorage.getItem('coins-list');
    if (coinsList) {
      return JSON.parse(coinsList);
    }
    // fetch data from api
    const url = `https://api.coingecko.com/api/v3/coins/list`;
    const response = this._http.get(url);
    const result = await firstValueFrom(response);
    // save result to local storage
    localStorage.setItem('coins-list', JSON.stringify(result));
    return result;
  }

  async getDataMarket(coinsIdList: string[], force?: boolean) {
    if (force) {
      localStorage.removeItem('coins-market-data');
    }
    // check if data is available in local storage and last updated less than 30 minutes
    const coinsData = localStorage.getItem('coins-market-data');
    if (coinsData) {
      const { timestamp, data } = JSON.parse(coinsData);
      const now = new Date().getTime();
      if (now - timestamp < 30 * 60 * 1000) {
        return data;
      }
    }
    const currentUser = getAuth().currentUser;
    if (!currentUser) {
      return [];
    }
    const userConfig = await firstValueFrom(this._api.userConfig$);
    if (!userConfig?.coingeckoApiKey) {
      return [];
    }
    const apiKey = userConfig?.coingeckoApiKey;
    // fetch data from api
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=id_asc&sparkline=true&price_change_percentage=1h%2C24h%2C7d%2C30d&locale=en&x_cg_demo_api_key=${apiKey}&ids=${coinsIdList.join(
      ','
    )}`;
    const response = this._http.get(url);
    const result = await firstValueFrom(response);
    // save result to local storage
    localStorage.setItem(
      'coins-market-data',
      JSON.stringify({
        timestamp: new Date().getTime(),
        data: result,
      })
    );
    return result;
  }

  async getChainIdList(chainId: string[]) {
    const url = `./datas/chainIds.json`;
    const response = this._http.get<{ [key: string]: string }>(url);
    const result = await firstValueFrom(response);
    // convert to array
    const valueFromList = Object.entries(result).map(([key, value]) => ({
      id: key,
      name: value,
    }));
    // check if chainId not exist in the list & add it
    chainId.filter(Boolean).forEach((id) => {
      if (!valueFromList.find((item) => item.id === id)) {
        valueFromList.push({ id, name: id });
      }
    });
    return valueFromList;
  }

  get7DaysHistoryData$(tickerId: string) {
    return combineLatest([this.getDataMarket([tickerId])]).pipe(
      map(([data]) => {
        if (!data) {
          return { prices: [] };
        }
        console.log('>>>', data);

        return data
          .find((c: { id: string }) => c.id === tickerId)
          .sparkline_in_7d.price.map((price: number, index: number) => [
            new Date().getTime() - (7 - index) * 24 * 60 * 60 * 1000,
            price,
          ]);
      })
    );
  }

  getHistoryData$(tickerId: string, days: number) {
    // check if data is available in local storage and last updated less than 30 minutes
    const coinHistory = localStorage.getItem(`coin-history-${tickerId}`);
    if (coinHistory) {
      const { timestamp, data } = JSON.parse(coinHistory);
      const now = new Date().getTime();
      if (now - timestamp < 30 * 60 * 1000) {
        // return observable from local storage
        return new Observable<{ prices: [number, number][] }>((observer) => {
          observer.next(data);
          observer.complete();
        });
      }
    }
    const url = `https://api.coingecko.com/api/v3/coins/${tickerId}/market_chart?vs_currency=usd&days=${days}`;
    const response = this._http.get<{ prices: [number, number][] }>(url);
    // save result to local storage
    firstValueFrom(response).then((result) => {
      localStorage.setItem(
        `coin-history-${tickerId}`,
        JSON.stringify({
          timestamp: new Date().getTime(),
          data: result,
        })
      );
    });
    // returh observable response
    return response;
  }
}
