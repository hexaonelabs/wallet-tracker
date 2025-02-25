import { Component, ViewEncapsulation } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { merge, Observable, of, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { ToastOptions } from '@ionic/core';
import { ToastController } from '@ionic/angular/standalone';
import { AsyncPipe, NgIf } from '@angular/common';
import { environment } from '../../../environments/environment';

@Component({
  standalone: true,
  selector: 'app-update',
  template: ` <div *ngIf="updateAvailable$ | async"></div> `,
  encapsulation: ViewEncapsulation.None,
  imports: [NgIf, AsyncPipe],
})
export class UpdateComponent {
  updateAvailable$: Observable<boolean | {}>;
  closed$ = new Subject<void>();

  constructor(
    private readonly _updates: SwUpdate,
    private readonly _toast: ToastController
  ) {
    this.updateAvailable$ = merge(
      of(false),
      this._updates.versionUpdates.pipe(
        filter((e) => e.type === 'VERSION_DETECTED'),
        map(async () => await this._displayNotif()),
        map(() => true)
      ),
      this.closed$.pipe(map(() => false))
    );
  }

  async activateUpdate() {
    if (!environment.isProd) {
      return;
    }
    await this._updates.activateUpdate();
    // reload page with force cache refresh
    location.reload();
  }

  private async _displayNotif() {
    const data: ToastOptions = {
      message: 'New version available',
      color: 'primary',
      position: 'bottom',
      buttons: ['Update'],
      duration: 5000,
    };
    const toast = await this._toast.create(data);
    await toast.present();
    await toast.onDidDismiss();
    await this.activateUpdate();
  }
}
