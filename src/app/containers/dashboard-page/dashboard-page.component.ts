import { Component } from '@angular/core';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { Auth, authState, signOut, User } from '@angular/fire/auth';
import { RouterOutlet } from '@angular/router';
import {
  IonApp,
  IonButton,
  IonCol,
  IonContent,
  IonGrid,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonRow,
  ModalController,
  IonSelect,
  IonSelectOption,
  IonText,
  IonTextarea,
  IonTitle,
  IonModal,
  IonHeader,
  IonToolbar,
  IonSearchbar,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonIcon,
  ToastController,
  IonAvatar,
  IonFab,
  IonFabButton,
  IonFooter,
  AlertController,
  IonAlert,
  LoadingController,
  AlertButton,
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import {
  BehaviorSubject,
  combineLatest,
  distinctUntilChanged,
  filter,
  firstValueFrom,
  map,
  Observable,
  pairwise,
  shareReplay,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
import { AssetPosition, Tx, UserWallet } from '../../interfaces';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { TxDetailListComponent } from '../../components/tx-detail-list/tx-detail-list.component';
import { TotalPositionPipe } from '../../pipes/total-position/total-position.pipe';
import { CoinsService } from '../../services/coins/coins.service';
import { TotalPercentPipe } from '../../pipes/total-percent/total-percent.pipe';
import { CalculPercentPipe } from '../../pipes/calcul-percent/calcul-percent.pipe';
import {
  addMarketDatas,
  getTotalStableWorth,
  getTotaltPL,
  getTotalWalletWorth,
  isStableTicker,
} from '../../app.utils';
import {
  downloadOutline,
  closeOutline,
  addOutline,
  trashOutline,
  refreshOutline,
  ellipsisVertical,
} from 'ionicons/icons';
import { addIcons } from 'ionicons';
import { Chart2Component } from '../../components/chart2/chart2.component';
import { TotalWorthGraphService } from '../../services/total-worth-graph/total-worth-graph.service';
import { ChartComponent } from '../../components/chart/chart.component';
import { register } from 'swiper/element/bundle';
import { APIService } from '../../services/api.service';

const UIElements = [
  IonApp,
  IonAlert,
  IonContent,
  IonAvatar,
  IonGrid,
  IonRow,
  IonCol,
  IonTitle,
  IonText,
  IonButton,
  IonItem,
  IonList,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonLabel,
  IonTextarea,
  IonModal,
  IonHeader,
  IonToolbar,
  IonSearchbar,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonIcon,
  IonFab,
  IonFabButton,
  IonFooter,
];

register();

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    RouterOutlet,
    ...UIElements,
    CommonModule,
    ReactiveFormsModule,
    TotalPositionPipe,
    TotalPercentPipe,
    CalculPercentPipe,
    Chart2Component,
    ChartComponent,
  ],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class DashboardPageComponent {
  public totalWalletWorth = 0;
  public totalStaleWorth = 0;
  public totalPL = 0;
  public networks: {
    id: string;
    name: string;
  }[] = [];
  public readonly refresh$ = new BehaviorSubject<boolean>(true);
  public readonly user$: Observable<User | null>;
  public readonly assetPositions$: Observable<
    ({
      txs: Tx[];
    } & AssetPosition)[]
  >;
  public readonly userWallets$: Observable<UserWallet[] | null>;
  public readonly selectedWallet$: BehaviorSubject<UserWallet | undefined> =
    new BehaviorSubject(undefined as any);
  public readonly defiProtocols$: Observable<any[] | null>;
  public readonly userConfig$;
  public readonly portfolioGraphData$: Observable<number[]>;

  public readonly txForm = new FormGroup({
    tickerId: new FormControl('', Validators.required),
    wallet: new FormGroup({
      id: new FormControl('', Validators.required),
      displayName: new FormControl('', Validators.required),
    }),
    network: new FormGroup({
      id: new FormControl('', Validators.required),
      displayName: new FormControl('', Validators.required),
    }),
    notes: new FormControl(''),
    quantity: new FormControl(0, Validators.required),
    price: new FormControl(0, Validators.required),
    fees: new FormControl(0),
    defiProtocol: new FormGroup({
      id: new FormControl(undefined as unknown as string),
      displayName: new FormControl(undefined as unknown as string),
    }),
    txType: new FormControl(undefined),
  });
  public openAddTx: boolean = false;
  public openSelectDefi: boolean = false;
  public _defiFilterValue$ = new BehaviorSubject<string | undefined>(undefined);
  public openSelectTicker: boolean = false;
  public filteredTickers: any[] = [];
  public openSelectWallet: boolean = false;
  private readonly _walletFilterValue$ = new BehaviorSubject<
    string | undefined
  >(undefined);
  public openSelectNetwork: boolean = false;
  public chart2Data$: Observable<{ labels: string[]; datasets: number[] }>;
  public chartMarketCapData$: Observable<{
    labels: string[];
    datasets: number[];
  }>;
  public readonly alertOptionsButtons: AlertButton[] = [
    {
      text: 'Refresh',
      role: 'refresh',
      handler: async () => {
        // get current alert open
        const alert = await new AlertController().getTop();
        if (!alert) {
          return;
        }
        // close current alert
        await alert.dismiss();
        this.refresh$.next(true);
      },
    },
    {
      text: 'Download Backup',
      role: 'download',
      handler: async () => {
        // get current alert open
        const alert = await new AlertController().getTop();
        if (!alert) {
          return;
        }
        // close current alert
        await alert.dismiss();
        // show loader
        const ionLoader = await new LoadingController().create({
          message: 'Downloading Backup...',
        });
        await ionLoader.present();
        await this.backup();
        await ionLoader.dismiss();
        const ionToast = await new ToastController().create({
          message: 'Backup downloaded',
          duration: 2000,
          color: 'success',
        });
        await ionToast.present();
      },
    },
    {
      text: 'Toogle Dark Mode',
      role: 'dark',
      handler: async () => {
        // get current alert open
        const alert = await new AlertController().getTop();
        if (!alert) {
          return;
        }
        // close current alert
        await alert.dismiss();
        document.documentElement.classList.toggle('ion-palette-dark');
        const isDarkmode =
          document.documentElement.classList.contains('ion-palette-dark');
        localStorage.setItem('theme', isDarkmode ? 'dark' : 'light');
      },
    },
    {
      text: 'Cancel',
      role: 'cancel',
    },
  ];

  constructor(
    private readonly _auth: Auth,
    // private readonly _db: DBService,
    private readonly _apiService: APIService,
    private readonly _modalCtrl: ModalController,
    private readonly _coinsService: CoinsService,
    private readonly _toastCtrl: ToastController,
    private readonly _portfolioGraphService: TotalWorthGraphService
  ) {
    addIcons({
      downloadOutline,
      closeOutline,
      addOutline,
      trashOutline,
      refreshOutline,
      ellipsisVertical,
    });

    // connect user Observable
    this.user$ = authState(this._auth);
    this.userConfig$ = this._apiService.userConfig$;
    // build userWallets Observable using
    // `_walletFilterValue$` to filter the wallets

    this.userWallets$ = combineLatest([
      this._apiService.userWallets$,
      this._walletFilterValue$.asObservable(),
    ]).pipe(
      map(([wallets, filterBy]) =>
        // filter wallets by name if filterBy is set
        // and has more than 2 characters
        // otherwise return all wallets
        wallets && filterBy && filterBy.length > 2
          ? wallets.filter((wallet) =>
              wallet.name
                .toLocaleLowerCase()
                .includes(filterBy.toLocaleLowerCase() ?? '')
            )
          : wallets
      ),
      shareReplay()
    );

    this.defiProtocols$ = combineLatest([
      this._apiService.defiProtocols$,
      this._defiFilterValue$.asObservable(),
    ]).pipe(
      map(([defiProtocols, filterBy]) =>
        // filter defiProtocols by name if filterBy is set
        // and has more than 2 characters
        // otherwise return all defiProtocols
        defiProtocols && filterBy && filterBy.length > 2
          ? defiProtocols.filter((defiProtocol) =>
              defiProtocol.name
                .toLocaleLowerCase()
                .includes(filterBy.toLocaleLowerCase() ?? '')
            )
          : defiProtocols
      )
    );

    // build txs Observable using `_db.txs$`
    // and add market data to each tx
    // and calculate total wallet worth and total stale worth
    // and total pl dollars and total pl percentage
    // and sort by total position worth
    this.assetPositions$ = combineLatest([
      this._apiService.groupedAssets$,
      this.refresh$.asObservable().pipe(
        distinctUntilChanged(),
        pairwise(),
        filter(([prev, curr]) => !(prev === true && curr === false)),
        map(([prev, curr]) => curr),
        startWith(true)
      ),
      this.selectedWallet$.asObservable(),
    ]).pipe(
      filter(([assets]) => !!assets),
      // filter by selected wallet
      map(([assets, refresh, selectedWallet]) => {
        return {
          assets:
            selectedWallet?.id !== undefined
              ? assets?.filter(
                  (asset) => asset.walletId === selectedWallet.id
                ) || null
              : assets,
          refresh,
        };
      }),
      map(({ assets, refresh }) => ({
        assetPositions: assets,
        refresh,
      })),
      // get the current price and 24h change; calculate total, average cost, pl dollars and pl percentage
      switchMap(async ({ assetPositions, refresh }) =>
        assetPositions && assetPositions.length > 0
          ? await addMarketDatas(assetPositions, {
              _coinsService,
              refresh,
            }).then((result) => {
              if (refresh === true) {
                this.refresh$.next(false);
              }
              return result;
            })
          : []
      ),
      // exclude 0 total
      map((assetPositions) =>
        assetPositions?.filter(
          (asset: AssetPosition) => asset.totalValueUSD || 0 > 0
        )
      ),
      // sort by total value USD
      map((assetPositions) =>
        [...assetPositions].sort((a, b) => b.totalValueUSD! - a.totalValueUSD!)
      ),
      // calculate total wallet worth and total stale worth and other values
      tap(
        (assetPositions) =>
          (this.totalWalletWorth = getTotalWalletWorth(assetPositions))
      ),
      tap(
        (assetPositions) =>
          (this.totalStaleWorth = getTotalStableWorth(assetPositions))
      ),
      tap((assetPositions) => (this.totalPL = getTotaltPL(assetPositions))),
      // return undefined if there is no data in the array
      map((assetPositions) =>
        assetPositions.length > 0
          ? assetPositions
          : (undefined as unknown as AssetPosition[])
      ),
      shareReplay()
    ) as Observable<({ txs: Tx[] } & AssetPosition)[]>; // cast to the correct type

    this.chart2Data$ = this.assetPositions$.pipe(
      map((assetPositions) => {
        const valuesData = assetPositions?.reduce(
          (acc, curr) => {
            // group ticker that have name that include existing name
            const ticker = acc.labels.find((item) => {
              // test if the shorter name is included in the longer name
              return (
                item.toLowerCase().includes(curr.tickerId.toLowerCase()) ||
                curr.tickerId.toLowerCase().includes(item.toLowerCase())
              );
            });
            // group stable ticker
            if (ticker || isStableTicker(curr.tickerId)) {
              const index = acc.labels.indexOf(ticker || 'Stable');
              if (index === -1) {
                acc.labels.push(ticker || 'Stable');
                acc.datasets.push(curr.totalValueUSD!);
              } else {
                acc.datasets[index] += curr.totalValueUSD!;
              }
            } else {
              acc.labels.push(curr.tickerId);
              acc.datasets.push(curr.totalValueUSD!);
            }
            return acc;
          },
          {
            labels: [] as string[],
            datasets: [] as number[],
          }
        );
        return valuesData;
      }),
      shareReplay()
    );

    this.portfolioGraphData$ = this.assetPositions$.pipe(
      filter((assetPositions) => assetPositions?.length > 0),
      switchMap((assetPositions) => {
        return this._portfolioGraphService.getPortfolioHistory$(
          assetPositions,
          7
        );
      }),
      map((data) => {
        return data.map((item) => {
          return item.value;
        });
      }),
      shareReplay()
    );

    this.chartMarketCapData$ = this.assetPositions$.pipe(
      filter((assetPositions) => assetPositions?.length > 0),
      map((assetPositions) => {
        return assetPositions
          .filter((a) => a.marketCap !== undefined && a.marketCap > 0)
          .reduce(
            (p, c) => {
              // check market cap and add to the correct label
              switch (true) {
                case (c.marketCap ?? 0) < 250000000:
                  p.datasets[0] += c.totalValueUSD ?? 0;
                  break;
                case (c.marketCap ?? 0) < 1000000000:
                  p.datasets[1] += c.totalValueUSD ?? 0;
                  break;
                case (c.marketCap ?? 0) >= 1000000000:
                  p.datasets[2] += c.totalValueUSD ?? 0;
                  break;
              }
              return p;
            },
            {
              labels: ['Low Cap.', 'Middle Cap.', 'Large Cap.'],
              datasets: [0, 0, 0],
            }
          );
      })
    );
  }

  async logout() {
    await signOut(this._auth);
  }

  async addTx(button: IonButton | null) {
    const user = await firstValueFrom(this.user$);
    if (!user) {
      throw new Error('User is not logged in');
    }
    if (!button) {
      throw new Error('Button is not defined');
    }
    if (!this.txForm.valid) {
      const toast = await this._toastCtrl.create({
        message: 'Invalid form data. Please fill all required fields',
        duration: 2000,
        color: 'danger',
      });
      await toast.present();
      await toast.onDidDismiss();
      return;
    }
    button.disabled = true;
    const total =
      (this.txForm.value.quantity ?? 0) * (this.txForm.value.price ?? 0) +
      (this.txForm.value.fees ?? 0);
    const value = this.txForm.value;
    const {
      tickerId,
      wallet,
      network,
      defiProtocol,
      notes,
      quantity,
      price,
      fees,
      ...rest
    } = value;
    if (!tickerId) throw new Error('Ticker is not defined');
    if (!wallet?.id) throw new Error('Wallet is not defined');
    if (!network?.id) throw new Error('Network is not defined');
    // build data object
    const tx: Omit<Tx, 'id'> = {
      ...rest,
      fees: fees ?? 0,
      price: price ?? 0,
      quantity: quantity ?? 0,
      notes: notes ?? undefined,
      tickerId,
      walletId: wallet.id,
      networkId: network.id,
      defiProtocolId: defiProtocol?.id ?? undefined,
      createdAt: new Date(),
      uid: user.uid,
      total,
    };
    const ionAlert = await new AlertController().create({
      header: 'Confirm Transaction',
      message: `${quantity}x ${tickerId} at ${price} with ${fees} fees for a total of ${total}`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Confirm',
          role: 'ok',
        },
      ],
    });
    await ionAlert.present();
    const { role } = await ionAlert.onDidDismiss();
    if (role !== 'ok') {
      button.disabled = false;
      return;
    }
    await this._apiService.addTx(tx).catch((err) => {
      button.disabled = false;
      throw err;
    });
    this.txForm.reset();
    button.disabled = false;
    const toast = await this._toastCtrl.create({
      message: 'Transaction added',
      duration: 2000,
      color: 'success',
    });
    await toast.present();
    await toast.onDidDismiss();
  }

  async openDetails(asset: AssetPosition) {
    const ionModal = await this._modalCtrl.create({
      component: TxDetailListComponent,
      componentProps: {
        asset,
      },
      cssClass: 'full-page-modal',
    });
    await ionModal.present();
  }

  async searchTicker(search: string) {
    if (search.length < 2) {
      this.filteredTickers = [];
    }
    const coinsList = await this._coinsService.getAllCoinsId();
    const filteredCoins = coinsList
      .filter((coin: { symbol: string }) =>
        coin.symbol.toLocaleLowerCase().startsWith(search.toLocaleLowerCase())
      )
      // remove ticker with `bridged` in the name
      .filter(
        (coin: { name: string; symbol: string }) =>
          !coin.name.toLocaleLowerCase().includes('bridged') &&
          !coin.name.toLocaleLowerCase().includes('mapped') &&
          !coin.name.toLocaleLowerCase().includes('merged') &&
          coin.name.length > 0 &&
          coin.symbol.length > 0
      )
      // sort by ticker symbol ascending
      .sort((a: { symbol: string }, b: { symbol: string }) =>
        a.symbol.localeCompare(b.symbol)
      )
      // // remove duplicates
      // .filter(
      //   (coin: { symbol: string }, index: number, self: any[]) =>
      //     self.findIndex(
      //       (t: { symbol: string }) => t.symbol === coin.symbol
      //     ) === index
      // )
      // add limit
      .slice(0, 40);
    this.filteredTickers = filteredCoins;
  }

  async searchNetwork(search: string) {
    if (search.length < 2) {
      this.networks = [];
    }
    const txs = (await firstValueFrom(this._apiService.assets$)) ?? [];
    const networksFromTxs = txs.map((tx) => tx.networkId);
    const networks = await this._coinsService.getChainIdList(networksFromTxs);
    const filteredNetworks = networks
      .filter((network: { name: string }) =>
        network.name.toLocaleLowerCase().includes(search.toLocaleLowerCase())
      )
      // add limit to 10
      .slice(0, 10);
    this.networks = filteredNetworks;
  }

  async searchWallet(search: string) {
    if (search.length < 2) {
      this._walletFilterValue$.next(undefined);
      return;
    }
    this._walletFilterValue$.next(search);
  }

  async searchDefi(search: string) {
    if (search.length < 2) {
      this._defiFilterValue$.next(undefined);
      return;
    }
    this._defiFilterValue$.next(search);
  }

  async selectTicker(tickerId: string) {
    this.txForm.patchValue({ tickerId });
    this.filteredTickers = [];
    this.openSelectTicker = false;
    // run form validation
    this.txForm?.markAllAsTouched();
  }

  async selectWallet(wallet: UserWallet) {
    this.txForm.patchValue({
      wallet: {
        id: wallet.id,
        displayName: wallet.name,
      },
    });
    this.openSelectWallet = false;
    this._walletFilterValue$.next(undefined);
  }

  async selectDefi(defiProtocol: { id: string; name: string }) {
    this.txForm.patchValue({
      defiProtocol: {
        id: defiProtocol.id,
        displayName: defiProtocol.name,
      },
    });
    this.openSelectDefi = false;
    this._defiFilterValue$.next(undefined);
  }

  async selectNetwork(network: { id: string; name: string }) {
    if (!network) {
      return;
    }
    if (network.id.length <= 0 || network.name.length <= 0) {
      return;
    }
    this.txForm.patchValue({
      network: {
        id: network.id,
        displayName: network.name,
      },
    });
    this.openSelectNetwork = false;
  }

  async backup() {
    const txs = (await firstValueFrom(this._apiService.assets$)) ?? [];
    const userWallets = (await firstValueFrom(this.userWallets$)) ?? [];
    const defiProtocols = (await firstValueFrom(this.defiProtocols$)) ?? [];

    const data = {
      txs,
      userWallets,
      defiProtocols,
    };
    const blob = new Blob([JSON.stringify(data)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-database-${new Date()
      .toISOString()
      .replace(/ /g, '_')}.json`;
    a.click();
  }

  async createItem(ops: {
    type: 'wallet' | 'defiProtocol' | 'tx';
    payload?: string | null;
  }) {
    const uid = (await firstValueFrom(this.user$))?.uid ?? '';
    const payload = ops.payload;
    if (!uid) {
      throw new Error('User is not logged in');
    }
    if (!payload) {
      return;
    }
    if (ops.type === 'wallet') {
      await this._apiService.addWallet({
        name: payload,
        uid,
      });
    }
    if (ops.type === 'defiProtocol') {
      await this._apiService.addDefiProtocols({
        name: payload,
        uid,
      });
    }
  }

  async updateUserConfig() {
    const userConfig = await firstValueFrom(this.userConfig$);
    const ionAlert = await new AlertController().create({
      header: 'Coingecko API Key',
      message: 'Manage your Coingecko API Key',
      backdropDismiss: false,
      keyboardClose: false,
      inputs: [
        {
          name: 'apiKey',
          type: 'text',
          placeholder: 'Coingecko API Key',
          value: userConfig?.coingeckoApiKey,
        },
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'update',
          role: 'ok',
        },
      ],
    });
    await ionAlert.present();
    const { role, data } = await ionAlert.onDidDismiss();
    if (role !== 'ok') {
      return false;
    }
    if (!data?.values?.apiKey) {
      return false;
    }
    if (!data.values.apiKey.startsWith('CG-')) {
      const toast = await this._toastCtrl.create({
        message: 'Invalid API Key',
        duration: 2000,
        color: 'danger',
      });
      await toast.present();
      return false;
    }
    const currentUser = await firstValueFrom(this.user$);
    if (!currentUser) {
      return false;
    }
    await this._apiService.updateUserConfig(currentUser.uid, {
      coingeckoApiKey: data.values.apiKey,
    });
    return true;
  }
}
