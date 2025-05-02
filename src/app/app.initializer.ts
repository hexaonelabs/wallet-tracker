import { APP_INITIALIZER } from '@angular/core';
import { Auth, authState, User } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AlertController, ToastController } from '@ionic/angular/standalone';
import { APIService } from './services/api.service';

export const provideInitializer = () => ({
  provide: APP_INITIALIZER,
  useFactory: initializeCoinGeckoAPI_KEY,
  multi: true,
  deps: [Auth, APIService, Router],
});

const initializeCoinGeckoAPI_KEY =
  (auth: Auth, api: APIService, router: Router) => () =>
    new Promise(async (resolve: (r: boolean) => void) => {
      const user: User | null = await firstValueFrom(authState(auth));
      if (!user) {
        console.log('User is not authenticated');
        // redirect to the login page if is not on the login page
        if (!router.url.includes('auth')) {
          router.navigate(['/auth']);
        }
        resolve(true);
        return;
      }
      // load the data
      const userConfig = await firstValueFrom(api.userConfig$);
      console.log('User is authenticated', { user, userConfig });
      if (
        // user don't have config
        !userConfig ||
        // user have config but don't have coingeckoApiKey
        !userConfig?.coingeckoApiKey ||
        // user have config but coingeckoApiKey is empty
        (userConfig && (userConfig?.coingeckoApiKey?.length ?? 0) <= 0)
      ) {
        // ask user to add coingeckoApiKey
        const askToCOnfig = async () => {
          const ionAlert = await new AlertController().create({
            header: 'Add Coingecko API Key',
            message: `Welcome on TXS Tracker, please add your Coingecko API Key to calculate your PnL`,
            backdropDismiss: false,
            keyboardClose: false,
            inputs: [
              {
                name: 'apiKey',
                type: 'text',
                placeholder: 'Coingecko API Key',
              },
            ],
            buttons: [
              {
                text: 'Cancel',
                role: 'cancel',
              },
              {
                text: 'Add',
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
            const toast = await new ToastController().create({
              message: 'Invalid API Key',
              duration: 2000,
              color: 'danger',
            });
            await toast.present();
            return false;
          }
          await api.updateUserConfig(user.uid, {
            coingeckoApiKey: data.values.apiKey,
          });
          return true;
        };

        while (true) {
          // wait for user to add coingeckoApiKey
          const result = await askToCOnfig();
          if (result === true) {
            break;
          }
        }
      }
      // redirect to the dashboard page if is not on the dashboard page
      if (!router.url.includes('dashboard')) {
        router.navigate(['/']);
      }
      // resolve the promise on the first event state change
      resolve(true);
    });
