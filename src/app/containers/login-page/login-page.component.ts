import { Component, OnInit } from '@angular/core';
import {
  Auth,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from '@angular/fire/auth';
import {
  AlertController,
  IonButton,
  IonCol,
  IonContent,
  IonGrid,
  IonRow,
  IonText,
} from '@ionic/angular/standalone';
import { GoogleAuthProvider } from 'firebase/auth';

@Component({
  standalone: true,
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.scss'],
  imports: [IonContent, IonGrid, IonRow, IonCol, IonText, IonButton],
})
export class LoginPageComponent implements OnInit {
  constructor(private readonly _auth: Auth) {}

  ngOnInit() {}

  async login(payload: 'google' | 'email' = 'google') {
    switch (true) {
      case payload === 'google':
        const provider = new GoogleAuthProvider();
        await signInWithPopup(this._auth, provider);
        break;
      case payload === 'email': {
        const ionAlert = await new AlertController().create({
          header: 'Authenticate',
          message: 'Enter your email and password to login',
          inputs: [
            {
              name: 'email',
              type: 'email',
              placeholder: 'Email',
            },
            { name: 'password', type: 'password', placeholder: 'Password' },
          ],
          buttons: [
            { text: 'Cancel', role: 'cancel' },
            { text: 'Login', role: 'login' },
          ],
        });
        await ionAlert.present();
        const { role, data } = await ionAlert.onDidDismiss();
        if (role !== 'login') return;
        const { email, password } = data.values;
        await signInWithEmailAndPassword(this._auth, email, password).catch(
          (err) => {
            throw new Error(err?.code || err?.message || 'An error occurred');
          }
        );
        break;
      }
      default:
        return;
    }
  }

  async register() {
    const ionAlert = await new AlertController().create({
      header: 'Create Account',
      message: 'Enter your email and password to create an account',
      inputs: [
        {
          name: 'email',
          type: 'email',
          placeholder: 'Email',
        },
        { name: 'password', type: 'password', placeholder: 'Password' },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Signin', role: 'signin' },
      ],
    });
    await ionAlert.present();
    const { role, data } = await ionAlert.onDidDismiss();
    if (role !== 'signin') return;
    const { email, password } = data.values;
    await createUserWithEmailAndPassword(this._auth, email, password).catch(
      (err) => {
        throw new Error(err?.code || err?.message || 'An error occurred');
      }
    );
  }
}
