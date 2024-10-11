import { Component, Input } from '@angular/core';
import {
  AlertController,
  IonButton,
  IonButtons,
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
import { Observable } from 'rxjs';
import { DBService } from '../../services/db/db.service';
import { Tx } from '../../interfaces';
import { FilterByTickerPipe } from '../../pipes/filter-by-ticker/filter-by-ticker.pipe';
import { close, trashOutline } from 'ionicons/icons';
import { addIcons } from 'ionicons';

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
];

@Component({
  standalone: true,
  selector: 'app-tx-detail-list',
  templateUrl: './tx-detail-list.component.html',
  styleUrls: ['./tx-detail-list.component.scss'],
  imports: [...UIElements, CommonModule, FilterByTickerPipe],
})
export class TxDetailListComponent {
  @Input() tickerId!: string;
  public readonly txs$: Observable<Tx[]>;

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
