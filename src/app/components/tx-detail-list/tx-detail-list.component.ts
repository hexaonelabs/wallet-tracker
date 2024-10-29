import { Component, Input } from '@angular/core';
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
import { map, Observable } from 'rxjs';
import { DBService } from '../../services/db/db.service';
import { AssetPosition, Tx } from '../../interfaces';
import { FilterByTickerPipe } from '../../pipes/filter-by-ticker/filter-by-ticker.pipe';
import { close, trashOutline } from 'ionicons/icons';
import { addIcons } from 'ionicons';
import { ToChainNamePipe } from '../../pipes/to-chain-name/to-chain-name.pipe';
import { ToDefiProtocolNamePipe } from '../../pipes/to-defiprotocol-name/to-defi-protocol-name.pipe';
import { ChartComponent } from '../chart/chart.component';

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
  ],
})
export class TxDetailListComponent {
  public selectedSegment: 'history' | 'location' = 'history';
  @Input() asset!: AssetPosition;
  public readonly txs$: Observable<Tx[]>;
  public readonly txsLocation$;

  constructor(
    private readonly _db: DBService,
    private readonly _alertCtrl: AlertController,
    private readonly _toastCtrl: ToastController,
    public readonly modalCtrl: ModalController
  ) {
    addIcons({
      close,
      trashOutline,
    });
    this.txs$ = this._db.txs$;
    this.txsLocation$ = this._db.txs$.pipe(
      map((txs) =>
        txs.filter(
          (tx) =>
            tx.tickerId.toLocaleUpperCase() ===
            this.asset.tickerId.toLocaleUpperCase()
        )
      ),
      // group tx by network and defiProtocolIds
      map((txs) => {
        return txs.reduce(
          (acc, tx) => {
            const key = `${tx.networkId}`;
            if (!acc[key]) {
              acc[key] = [
                {
                  defiProtocolId: tx.defiProtocolId,
                  networkId: tx.networkId,
                  tickerId: tx.tickerId.toLocaleUpperCase(),
                  quantity: tx.quantity,
                },
              ];
            } else {
              const quantity = acc[key].find(
                (item) =>
                  (tx.defiProtocolId
                    ? item.defiProtocolId === tx.defiProtocolId
                    : true) &&
                  item.tickerId.toLocaleUpperCase() ===
                    tx.tickerId.toLocaleUpperCase()
              );
              if (quantity) {
                quantity.quantity += tx.quantity;
              } else {
                acc[key].push({
                  defiProtocolId: tx.defiProtocolId,
                  networkId: tx.networkId,
                  tickerId: tx.tickerId.toLocaleUpperCase(),
                  quantity: tx.quantity,
                });
              }
            }
            return acc;
          },
          {} as {
            [key: string]: {
              defiProtocolId: string;
              networkId: string;
              tickerId: string;
              quantity: number;
            }[];
          }
        );
      }),
      map((txs) => {
        // loop to remove item with quantity >= 0
        for (const key in txs) {
          txs[key] = txs[key].filter((tx) => tx.quantity > 0);
        }
        return txs;
      })
    );
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
    await this._db.delete(txId);
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
