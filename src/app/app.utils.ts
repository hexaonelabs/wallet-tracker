import { AssetPosition } from './interfaces';
import { CoinsService } from './services/coins/coins.service';

// export const groupByTicker = (
//   txs: Tx[]
// ): Record<string, AssetPosition & { txs: Tx[] }> => {
//   return txs.reduce((acc, tx) => {
//     const tickerId = tx.tickerId.toLocaleUpperCase();
//     if (!acc[tickerId]) {
//       acc[tickerId] = {
//         tickerId,
//         units: 0,
//         price: 0,
//         '24h_change': 0,
//         total: 0,
//         averageCost: 0,
//         plDollars: 0,
//         plPercentage: 0,
//         txs: [],
//       };
//     }
//     const asset = acc[tickerId];
//     asset.units += tx.quantity;
//     asset.txs.push(tx);
//     return acc;
//   }, {} as Record<string, AssetPosition & { txs: Tx[] }>);
// };

export const addMarketDatas = async <T>(
  assetPositions: AssetPosition[],
  {
    _coinsService,
    refresh = false,
  }: {
    _coinsService: CoinsService;
    refresh?: boolean;
  }
) => {
  const manualIds = [
    { tickerId: 'btc', apiId: 'bitcoin' },
    { tickerId: 'eth', apiId: 'ethereum' },
    { tickerId: 'jup', apiId: 'jupiter-exchange-solana' },
    { tickerId: 'velo', apiId: 'velodrome-finance' },
    { tickerId: 'op', apiId: 'optimism' },
    { tickerId: 'hype', apiId: 'hyperliquid' },
  ];
  const tickerIds = assetPositions.map((asset) => asset.tickerId);
  const coinsList = await _coinsService.getAllCoinsId();
  const coinTickerIds = tickerIds
    .map((tickerId) => {
      const ticket = manualIds.find(
        (manualId) =>
          manualId.tickerId.toLocaleLowerCase() === tickerId.toLocaleLowerCase()
      );
      if (ticket) {
        return ticket.apiId;
      } else {
        return coinsList.find(
          (coin: { symbol: string }) =>
            coin.symbol.toLocaleLowerCase() === tickerId.toLocaleLowerCase()
        )?.id;
      }
    })
    .filter(Boolean) as string[];
  // replace `btc` tickerId by `bitcoin`
  const index = coinTickerIds.indexOf('btc');
  if (index > -1) {
    coinTickerIds[index] = 'bitcoin';
  }
  const marketData = await _coinsService.getDataMarket(coinTickerIds, refresh);
  console.log('marketData', marketData);
  for (const asset of assetPositions) {
    // const initialInverstmentWorth = asset.averageCost * asset.units;
    const assetMarketData = marketData?.find(
      (market: { symbol: string }) =>
        market.symbol.toLocaleLowerCase() === asset.tickerId.toLocaleLowerCase()
    );
    if (assetMarketData) {
      asset.currentPrice = assetMarketData.current_price;
      asset['24h_change'] = assetMarketData.price_change_percentage_24h;
      asset.totalValueUSD = asset.currentPrice! * asset.units;
      // asset.averageCost = await new AveragePipe(_db).transform(asset);
      // asset.plDollars = await new PLPipe(_db).transform(asset);
      asset.logo = assetMarketData.image;
      asset.sparkline7d = assetMarketData.sparkline_in_7d;
      asset['1h_change'] =
        assetMarketData.price_change_percentage_1h_in_currency;
      asset['7d_change'] =
        assetMarketData.price_change_percentage_7d_in_currency;
      asset['30d_change'] =
        assetMarketData.price_change_percentage_30d_in_currency;
      asset.circulatingSupply = assetMarketData.circulating_supply;
      asset.marketCap = assetMarketData.market_cap;
      asset.fdv = assetMarketData.fully_diluted_valuation;
      asset.maxSupply = assetMarketData.max_supply;
      asset.totalSupply = assetMarketData.total_supply;
      asset.plDollars = asset.totalValueUSD - asset.initialInvestedAmountUSD;
      asset.plPercentage =
        (asset.plDollars / asset.initialInvestedAmountUSD) * 100;
      asset.averageCost = asset.initialInvestedAmountUSD / (asset.units || 1);
      // asset.plPercentage = new CalculPercentPipe().transform(
      //   asset.plDollars,
      //   initialInverstmentWorth
      // );
    }
  }
  return assetPositions;
};

export const getTotalWalletWorth = (assetPositions: AssetPosition[]) => {
  return assetPositions.reduce((acc, asset) => acc + asset.totalValueUSD!, 0);
};

export const getTotalStableWorth = (assetPositions: AssetPosition[]) => {
  const stalbe = assetPositions.filter(
    (asset) =>
      asset.tickerId.toLocaleUpperCase() === 'USDT' ||
      asset.tickerId.toLocaleUpperCase() === 'USDC' ||
      asset.tickerId.toLocaleUpperCase() === 'DAI' ||
      asset.tickerId.toLocaleUpperCase() === 'TUSD' ||
      asset.tickerId.toLocaleUpperCase() === 'BUSD' ||
      asset.tickerId.toLocaleUpperCase() === 'GO'
  );
  return stalbe.reduce((acc, asset) => acc + asset.totalValueUSD!, 0);
};

export const getTotaltPL = (assetPositions: AssetPosition[]) => {
  return assetPositions.reduce(
    (acc, asset) => acc + (Number(asset.plDollars) || 0),
    0
  );
};

export const isStableTicker = (tickerId: string) => {
  const stableTicker = [
    'USDT',
    'USDC',
    'DAI',
    'TUSD',
    'BUSD',
    'USDP',
    'USDN',
    'PAX',
    'HUSD',
    'GUSD',
    'SUSD',
    'UST',
    'mUSD',
    'sUSD',
    'LUSD',
    'MUSD',
    'CUSD',
    'RUSD',
    'USD',
    'EURS',
    'USDS',
    'USDx',
    'USDc',
    'USDG',
    'USDQ',
    'USDJ',
    'USDs',
    'USDt',
    'USDx',
    'USD++',
  ];
  const isStableTicker = stableTicker.includes(tickerId);
  return isStableTicker;
};

export const formatDataForChart = (
  data: number[]
): { time: number; value: number }[] => {
  const interval = 1000 * 60 * 30; // Intervalle de 30 minutes en millisecondes
  const now = new Date();

  // Ajuster le startTime à la prochaine heure pleine ou demi-heure
  const minutes = now.getMinutes();
  const nextHalfHour = minutes < 30 ? 30 : 60;
  now.setMinutes(nextHalfHour, 0, 0);
  const startTime = now.getTime() - interval * (data.length - 1);

  return data.map((value, index) => {
    const time = new Date(startTime + interval * index).getTime();
    return { time, value };
  });
};
