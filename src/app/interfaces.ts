export interface Tx {
  id: string;
  walletId: string;
  tickerId: string;
  quantity: number;
  price: number;
  fees?: number;
  total: number;
  networkId: string;
  defiProtocolId?: string;
  notes?: string;
  createdAt: Date;
  uid: string;
}

export interface UserWallet {
  id: string;
  name: string;
  address?: string;
  createdAt?: Date;
  uid: string;
}

export interface ChainIds {
  [key: string]: string;
}

export interface AssetPosition {
  id: string; // database object ID
  uid: string; // user ID
  walletId: string; // wallet ID
  networkId: string; // network ID
  defiProtocolId?: string; // defi protocol ID

  // Asset data
  tickerId: string;
  units: number;
  initialInvestedAmountUSD: number;
  averageCost: number;

  // meta & market data
  logo?: string;
  totalValueUSD?: number;
  currentPrice?: number;
  plDollars?: number;
  plPercentage?: number;
  '24h_change'?: number;
  '7d_change'?: number;
  '30d_change'?: number;
  '1h_change'?: number;
  circulatingSupply?: number;
  marketCap?: number;
  fdv?: number;
  maxSupply?: number;
  totalSupply?: number;
  sparkline7d?: { price: number[] };
}
