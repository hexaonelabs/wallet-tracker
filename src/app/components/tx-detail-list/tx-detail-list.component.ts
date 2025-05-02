import { Component, Input, OnInit } from '@angular/core';
import {
  AlertController,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonRow,
  IonSelect,
  IonSelectOption,
  IonText,
  IonTextarea,
  IonTitle,
  IonToolbar,
  ModalController,
  ToastController,
} from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { BehaviorSubject, firstValueFrom, map } from 'rxjs';
import { AssetPosition, Tx } from '../../interfaces';
import { FilterByTickerPipe } from '../../pipes/filter-by-ticker/filter-by-ticker.pipe';
import { close, trashOutline } from 'ionicons/icons';
import { addIcons } from 'ionicons';
import { ToChainNamePipe } from '../../pipes/to-chain-name/to-chain-name.pipe';
import { ToDefiProtocolNamePipe } from '../../pipes/to-defiprotocol-name/to-defi-protocol-name.pipe';
import { ChartComponent } from '../chart/chart.component';
import { TotalPositionPipe } from '../../pipes/total-position/total-position.pipe';
import { APIService } from '../../services/api.service';

const UIElements = [
  IonHeader,
  IonToolbar,
  IonContent,
  IonIcon,
  IonGrid,
  IonRow,
  IonCol,
  IonTitle,
  IonText,
  IonButton,
  IonButtons,
  IonItem,
  IonList,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonLabel,
  IonTextarea,
  IonNote,
  IonCard,
  IonCardContent,
];

@Component({
  standalone: true,
  selector: 'app-tx-detail-list',
  templateUrl: './tx-detail-list.component.html',
  styleUrls: ['./tx-detail-list.component.scss'],
  imports: [
    ...UIElements,
    CommonModule,
    FilterByTickerPipe,
    ToChainNamePipe,
    ToDefiProtocolNamePipe,
    ChartComponent,
    TotalPositionPipe,
  ],
})
export class TxDetailListComponent implements OnInit {
  public selectedSegment: 'history' | 'location' = 'history';
  @Input() asset!: AssetPosition;
  public readonly assetsLocation$;
  private readonly _txs$ = new BehaviorSubject<Tx[]>([]);
  public readonly txs$ = this._txs$.asObservable();

  constructor(
    private readonly _api: APIService,
    private readonly _alertCtrl: AlertController,
    private readonly _toastCtrl: ToastController,
    public readonly modalCtrl: ModalController
  ) {
    addIcons({
      close,
      trashOutline,
    });
    this.assetsLocation$ = this._api.assets$.pipe(
      map((assets) =>
        assets?.filter(
          (asset) =>
            asset.tickerId.toLocaleUpperCase() ===
            this.asset.tickerId.toLocaleUpperCase()
        )
      ),
      // group tx by network and defiProtocolIds
      map((assets) => {
        return assets?.reduce(
          (acc, asset) => {
            const key = `${asset.networkId}-${
              asset.defiProtocolId || 'no_defi'
            }-${asset.walletId}`;
            if (!acc[key]) {
              acc[key] = [asset];
            } else {
              const quantity = acc[key].find(
                (item) =>
                  (asset.defiProtocolId
                    ? item.defiProtocolId === asset.defiProtocolId
                    : true) &&
                  item.tickerId.toLocaleUpperCase() ===
                    asset.tickerId.toLocaleUpperCase() &&
                  item.networkId === asset.networkId &&
                  item.walletId === asset.walletId
              );
              if (quantity) {
                quantity.units += asset.units;
              } else {
                acc[key].push(asset);
              }
            }
            return acc;
          },
          {} as {
            [key: string]: AssetPosition[];
          }
        );
      }),
      map((txs) => {
        // loop to remove item with quantity >= 0
        for (const key in txs) {
          txs[key] = txs[key].filter((tx) => tx.units > 0);
        }
        return txs;
      })
    );
  }

  async ngOnInit() {
    const txs = await firstValueFrom(this._api.getTxs$(this.asset.tickerId));
    console.log('txs', txs);

    if (!txs) {
      return;
    }
    this._txs$.next(txs);
  }

  segmentChanged($event: CustomEvent) {
    this.selectedSegment = $event.detail.value as 'history' | 'location';
  }

  async deleteTx(txId: string) {
    const alert = await this._alertCtrl.create({
      header: 'Delete Transaction',
      message: 'Are you sure you want to delete this transaction?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Delete',
          role: 'ok',
        },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role !== 'ok') {
      return;
    }
    await this._api.deleteTx(txId);
    const txs = await firstValueFrom(this._api.getTxs$(this.asset.tickerId));
    console.log('txs', txs);
    this._txs$.next(txs || []);
    const asset = await firstValueFrom(
      this._api.groupedAssets$.pipe(
        map((assets) => assets?.find((asset) => asset.id === this.asset.id))
      )
    );
    this.asset = asset || this.asset;
    // Show toast
    const toast = await this._toastCtrl.create({
      message: 'Transaction deleted',
      duration: 2000,
      color: 'success',
    });
    await toast.present();
    await toast.onDidDismiss();
  }
}
