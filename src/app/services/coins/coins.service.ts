import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DBService } from '../db/db.service';
import { Auth, getAuth } from '@angular/fire/auth';

@Injectable({
  providedIn: 'root',
})
export class CoinsService {
  private readonly _APIKEY = environment.apiKey;

  constructor(
    private readonly _http: HttpClient,
    private readonly _db: DBService,
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
      return;
    }
    const userConfig = await firstValueFrom(this._db.userConfig$);
    if (!userConfig?.coingeckoApiKey) {
      return;
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
}
