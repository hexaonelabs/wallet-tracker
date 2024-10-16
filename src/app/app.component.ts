import { Component } from '@angular/core';
import {
  Auth,
  authState,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  User,
} from '@angular/fire/auth';
import { RouterOutlet } from '@angular/router';
import { DBService } from './services/db/db.service';
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
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import {
  BehaviorSubject,
  combineLatest,
  filter,
  firstValueFrom,
  map,
  Observable,
  switchMap,
  tap,
} from 'rxjs';
import { AssetPosition, Tx, UserWallet } from './interfaces';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { TxDetailListComponent } from './components/tx-detail-list/tx-detail-list.component';
import { TotalPositionPipe } from './pipes/total-position/total-position.pipe';
import { CoinsService } from './services/coins/coins.service';
import { AveragePipe } from './pipes/average/average.pipe';
import { TotalPercentPipe } from './pipes/total-percent/total-percent.pipe';
import { PLPipe } from './pipes/pl/pl.pipe';
import { CalculPercentPipe } from './pipes/calcul-percent/calcul-percent.pipe';
import {
  addMarketDatas,
  getTotalStableWorth,
  getTotaltPL,
  getTotalWalletWorth,
  groupByTicker,
} from './app.utils';
import {
  downloadOutline,
  closeOutline,
  addOutline,
  trashOutline,
} from 'ionicons/icons';
import { addIcons } from 'ionicons';

const UIElements = [
  IonApp,
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
];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    ...UIElements,
    CommonModule,
    ReactiveFormsModule,
    TotalPositionPipe,
    AveragePipe,
    TotalPercentPipe,
    PLPipe,
    CalculPercentPipe,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  public totalWalletWorth = 0;
  public totalStaleWorth = 0;
  public totalPL = 0;
  public networks: {
    id: string;
    name: string;
  }[] = [];
  public readonly user$: Observable<User | null>;
  public readonly txs$: Observable<AssetPosition[]>;
  public readonly userWallets$: Observable<UserWallet[]>;
  public readonly txForm = new FormGroup({
    tickerId: new FormControl('', Validators.required),
    walletId: new FormControl('', Validators.required),
    networkId: new FormControl('', Validators.required),
    notes: new FormControl(''),
    quantity: new FormControl(0, Validators.required),
    price: new FormControl(0, Validators.required),
    fees: new FormControl(0),
    defiProtocolId: new FormControl(''),
  });
  public openSelectTicker: boolean = false;
  public filteredTickers: any[] = [];
  public openSelectWallet: boolean = false;
  private readonly _walletFilterValue$ = new BehaviorSubject<
    string | undefined
  >(undefined);
  public openSelectNetwork: boolean = false;

  constructor(
    private readonly _auth: Auth,
    private readonly _db: DBService,
    private readonly _modalCtrl: ModalController,
    private readonly _coinsService: CoinsService,
    private readonly _toastCtrl: ToastController
  ) {
    addIcons({
      downloadOutline,
      closeOutline,
      addOutline,
      trashOutline,
    });

    // manage user authentication state changes
    // to load user data when user is logged in
    // and clear user data when user is logged out
    this._auth.onAuthStateChanged((user) => {
      if (user) {
        console.log('User is logged in');
        this._db.loadUserData(user.uid);
      } else {
        console.log('User is logged out');
        this._db.clearData();
      }
    });

    // connect user Observable
    this.user$ = authState(this._auth);
    // build userWallets Observable using
    // `_walletFilterValue$` to filter the wallets

    this.userWallets$ = combineLatest([
      this._db.userWallets$,
      this._walletFilterValue$.asObservable(),
    ]).pipe(
      map(([wallets, filterBy]) =>
        // filter wallets by name if filterBy is set
        // and has more than 2 characters
        // otherwise return all wallets
        filterBy && filterBy.length > 2
          ? wallets.filter((wallet) =>
              wallet.name
                .toLocaleLowerCase()
                .includes(filterBy.toLocaleLowerCase() ?? '')
            )
          : wallets
      )
    );

    // build txs Observable using `_db.txs$`
    // and add market data to each tx
    // and calculate total wallet worth and total stale worth
    // and total pl dollars and total pl percentage
    // and sort by total position worth
    this.txs$ = this._db.txs$.pipe(
      filter((txs) => !!txs),
      // group txs by ticker id and sum the quantity
      map((txs) => groupByTicker(txs)),
      // convert object to array
      map((assetPositions) => Object.values(assetPositions)),
      // get the current price and 24h change; calculate total, average cost, pl dollars and pl percentage
      switchMap(async (assetPositions) =>
        assetPositions.length > 0
          ? await addMarketDatas(assetPositions, { _coinsService, _db })
          : []
      ),
      // sort by total
      map((assetPositions) =>
        [...assetPositions].sort((a, b) => b.total - a.total)
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
      tap((assetPositions) => (this.totalPL = getTotaltPL(assetPositions)))
    );
  }

  async login() {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(this._auth, provider);
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
    const tx: Omit<Tx, 'id'> = {
      ...(this.txForm.value as any),
      createdAt: new Date(),
      uid: user.uid,
      total,
    };
    await this._db.addTx(tx).catch((err) => {
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

  async openDetails(tickerId: string) {
    const ionModal = await this._modalCtrl.create({
      component: TxDetailListComponent,
      componentProps: {
        tickerId,
      },
    });
    await ionModal.present();
  }

  async searchTicker(search: string) {
    console.log(search);

    if (search.length < 2) {
      this.filteredTickers = [];
    }
    const coinsList = await this._coinsService.getAllCoinsId();
    const filteredCoins = coinsList
      .filter((coin: { symbol: string }) =>
        coin.symbol.toLocaleLowerCase().includes(search.toLocaleLowerCase())
      )
      // add limit to 10
      .slice(0, 20);
    console.log(filteredCoins);
    this.filteredTickers = filteredCoins;
  }

  async searchNetwork(search: string) {
    console.log(search);
    if (search.length < 2) {
      this.networks = [];
    }
    const txs = await firstValueFrom(this._db.txs$);
    const networksFromTxs = txs.map((tx) => tx.networkId);
    const networks = await this._coinsService.getChainIdList(networksFromTxs);
    console.log(networks);

    const filteredNetworks = networks
      .filter((network: { name: string }) =>
        network.name.toLocaleLowerCase().includes(search.toLocaleLowerCase())
      )
      // add limit to 10
      .slice(0, 10);
    this.networks = filteredNetworks;
  }

  async searchWallet(search: string) {
    console.log(search);
    if (search.length < 2) {
      this._walletFilterValue$.next(undefined);
      return;
    }
    this._walletFilterValue$.next(search);
  }

  async selectTicker(tickerId: string) {
    this.txForm.patchValue({ tickerId });
    this.filteredTickers = [];
    this.openSelectTicker = false;
  }

  async selectWallet(walletId: string) {
    this.txForm.patchValue({ walletId });
    this.openSelectWallet = false;
  }

  async selectNetwork(networkId: string) {
    this.txForm.patchValue({ networkId });
    this.openSelectNetwork = false;
  }

  async backup() {
    console.log('backup');
    const txs = await firstValueFrom(this._db.txs$);
    const userWallets = await firstValueFrom(this.userWallets$);
    const defiProtocols = await firstValueFrom(this._db.defiProtocols$);
    console.log(txs, userWallets, defiProtocols);

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
}
