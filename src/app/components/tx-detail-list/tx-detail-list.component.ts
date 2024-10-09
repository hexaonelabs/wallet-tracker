import { Component, Input } from '@angular/core';
import { Auth, authState, GoogleAuthProvider, signInWithPopup, signOut, User } from '@angular/fire/auth';
import { RouterOutlet } from '@angular/router';
import { IonApp, IonButton, IonCol, IonContent, IonGrid, IonInput, IonItem, IonLabel, IonList, IonNote, IonRow, IonSelect, IonSelectOption, IonText, IonTextarea, IonTitle } from '@ionic/angular/standalone';
import { CommonModule } from '@angular/common';
import { firstValueFrom, map, Observable } from 'rxjs';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { DBService } from '../../services/db/db.service';
import { Tx } from '../../interfaces';
import { FilterByTickerPipe } from '../../pipes/filter-by-ticker/filter-by-ticker.pipe';

const UIElements = [
  IonApp,
  IonContent,
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
  IonNote
]

@Component({
  standalone: true,
  selector: 'app-tx-detail-list',
  templateUrl: './tx-detail-list.component.html',
  styleUrls: ['./tx-detail-list.component.scss'],
  imports: [...UIElements, CommonModule, FilterByTickerPipe],
})
export class TxDetailListComponent  {
  @Input() tickerId!: string;
  public readonly txs$: Observable<Tx[]>;

  constructor(
    private readonly _db: DBService,
  ) {
    this.txs$ = this._db.txs$;
  }

  async deleteItem(tx: Tx) {
    await this._db.delete(tx.id);
  }
}
