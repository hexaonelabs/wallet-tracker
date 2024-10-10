import { AssetPosition, Tx } from './interfaces';
import { CoinsService } from './services/coins/coins.service';
import { AveragePipe } from './pipes/average/average.pipe';
import { PLPipe } from './pipes/pl/pl.pipe';
import { DBService } from './services/db/db.service';

export const groupByTicker = (txs: Tx[]) => {
  return txs.reduce((acc, tx) => {
    if (!acc[tx.tickerId]) {
      acc[tx.tickerId] = {
        tickerId: tx.tickerId,
        units: 0,
        price: 0,
        '24h_change': 0,
        total: 0,
        averageCost: 0,
        plDollars: 0,
        plPercentage: 0,
      };
    }
    const asset = acc[tx.tickerId];
    asset.units += tx.quantity;
    return acc;
  }, {} as Record<string, AssetPosition>);
};

export const addMarketDatas = async (
  assetPositions: AssetPosition[],
  {
    _coinsService,
    _db,
  }: {
    _coinsService: CoinsService;
    _db: DBService;
  }
) => {
  const tickerIds = assetPositions.map((asset) => asset.tickerId);
  const coinsList = await _coinsService.getAllCoinsId();
  const coinTickerIds = tickerIds
    .map((tickerId) =>
      tickerId.toLocaleLowerCase() === 'btc'
        ? 'bitcoin'
        : coinsList.find(
            (coin: { symbol: string }) =>
              coin.symbol.toLocaleLowerCase() === tickerId.toLocaleLowerCase()
          )?.id
    )
    .filter(Boolean) as string[];
  // replace `btc` tickerId by `bitcoin`
  const index = coinTickerIds.indexOf('btc');
  if (index > -1) {
    coinTickerIds[index] = 'bitcoin';
  }
  const marketData = await _coinsService.getDataMarket(coinTickerIds);
  for (const asset of assetPositions) {
    const assetMarketData = marketData.find(
      (market: { symbol: string }) =>
        market.symbol.toLocaleLowerCase() === asset.tickerId.toLocaleLowerCase()
    );
    if (assetMarketData) {
      asset.price = assetMarketData.current_price;
      asset['24h_change'] = assetMarketData.price_change_percentage_24h;
      asset.total = asset.price * asset.units;
      asset.averageCost = await new AveragePipe(_db).transform(asset);
      asset.plDollars = await new PLPipe(_db).transform(asset);
      // asset.plPercentage = await new TotalPercentPipe().transform(asset, this.totalWalletWorth);
    }
  }
  return assetPositions;
};

export const getTotalWalletWorth = (assetPositions: AssetPosition[]) => {
  return assetPositions.reduce((acc, asset) => acc + asset.total, 0);
};

export const getTotalStableWorth = (assetPositions: AssetPosition[]) => {
  const stalbe = assetPositions.filter(
    (asset) =>
      asset.tickerId === 'USDT' ||
      asset.tickerId === 'USDC' ||
      asset.tickerId === 'DAI' ||
      asset.tickerId === 'TUSD' ||
      asset.tickerId === 'BUSD' ||
      asset.tickerId === 'GO'
  );
  return stalbe.reduce((acc, asset) => acc + asset.total, 0);
};

export const getTotaltPL = (assetPositions: AssetPosition[]) => {
  return assetPositions.reduce(
    (acc, asset) => acc + (Number(asset.plDollars) || 0),
    0
  );
};
