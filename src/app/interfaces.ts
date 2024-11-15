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
  tickerId: string;
  units: number;
  price: number;
  '24h_change': number;
  '7d_change'?: number;
  '30d_change'?: number;
  '1h_change'?: number;
  circulatingSupply?: number;
  marketCap?: number;
  fdv?: number;
  maxSupply?: number;
  totalSupply?: number;
  sparkline7d?: { price: number[] };
  total: number;
  averageCost: number;
  plDollars: number;
  plPercentage: number;
  logo?: string;
}
