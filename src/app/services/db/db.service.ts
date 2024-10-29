import { Injectable } from '@angular/core';
import {
  collection,
  Firestore,
  onSnapshot,
  query,
  where,
  Unsubscribe as Subscribtion,
  addDoc,
  doc,
  deleteDoc,
  QueryConstraint,
  collectionData,
  limit,
} from '@angular/fire/firestore';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { Tx, UserWallet } from '../../interfaces';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DBService {
  private readonly _COLLECTIONS = {
    tx: 'txs',
    userWallet: 'user-wallet',
    defiProtocols: 'defi-protocols',
  };
  private readonly _txs$: BehaviorSubject<Tx[]> = new BehaviorSubject<Tx[]>(
    [] as unknown as Tx[]
  );
  private readonly _userWallets$: BehaviorSubject<UserWallet[]> =
    new BehaviorSubject<UserWallet[]>([]);
  private readonly _defiProtocols$: BehaviorSubject<any[]> =
    new BehaviorSubject([] as unknown as Tx[]);
  private readonly _subscriptions: {
    sub: Subscribtion;
    collection: string;
  }[] = [];
  public readonly txs$ = this._txs$.asObservable();
  public readonly userWallets$ = this._userWallets$.asObservable();
  public readonly defiProtocols$ = this._defiProtocols$.asObservable();

  constructor(private readonly _firestore: Firestore) {}

  async loadUserData(uid: string) {
    this._loadTxs(uid);
    this._loadUserWallets(uid);
    this._loadDefiProtocols(uid);
  }

  async clearData() {
    this._subscriptions.forEach((sub) => sub.sub());
    this._subscriptions.length = 0;
    this._txs$.next([]);
    this._userWallets$.next([]);
    this._defiProtocols$.next([]);
  }

  async addWallet(value: Omit<UserWallet, 'id'>) {
    const colRef = collection(this._firestore, this._COLLECTIONS.userWallet);
    await addDoc(colRef, value);
  }

  async addDefiProtocols(value: Omit<any, 'id'>) {
    const colRef = collection(this._firestore, this._COLLECTIONS.defiProtocols);
    await addDoc(colRef, value);
  }

  async addTx(tx: Omit<Tx, 'id'>) {
    const colRef = collection(this._firestore, this._COLLECTIONS.tx);
    const result = await addDoc(colRef, tx);
    // add new Tx to the list
    const currentTxs = this._txs$.value;
    this._txs$.next([...currentTxs, { ...tx, id: result.id }]);
  }

  async delete(id: string) {
    const docRef = doc(this._firestore, this._COLLECTIONS.tx, id);
    await deleteDoc(docRef);
    // update the list
    const currentTxs = this._txs$.value;
    const index = currentTxs.findIndex((tx) => tx.id === id);
    if (index !== -1) {
      currentTxs.splice(index, 1);
      this._txs$.next(currentTxs);
    }
  }

  private async _loadTxs(uid: string) {
    // check if there is already a subscription
    if (
      this._subscriptions.find((sub) => sub.collection === this._COLLECTIONS.tx)
    ) {
      return;
    }
    const colRef = collection(this._firestore, this._COLLECTIONS.tx);
    const constraints = [
      where('uid', '==', uid),
      environment.isProd ? undefined : limit(15),
      // orderBy('createdAt', 'desc'),
    ].filter(Boolean) as QueryConstraint[];
    const q = query(colRef, ...constraints);
    // get data without listener
    const data: any[] = await firstValueFrom(
      collectionData(q, { idField: 'id' })
    );
    this._txs$.next([
      ...data.map((tx) => ({
        ...tx,
        createdAt: tx.createdAt?.toDate() || undefined,
      })),
    ] as Tx[]);
  }

  private async _loadUserWallets(uid: string) {
    // check if there is already a subscription
    if (
      this._subscriptions.find(
        (sub) => sub.collection === this._COLLECTIONS.userWallet
      )
    ) {
      return;
    }
    const colRef = collection(this._firestore, this._COLLECTIONS.userWallet);
    const constraints = [where('uid', '==', uid)];
    const q = query(colRef, ...constraints);
    const sub = onSnapshot(q, (snapshot) => {
      const data: UserWallet[] = snapshot.docs.map((doc) => ({
        ...(doc.data() as Omit<UserWallet, 'id'>),
        id: doc.id,
      }));
      this._userWallets$.next(data);
    });
    this._subscriptions.push({ collection: this._COLLECTIONS.userWallet, sub });
  }

  private async _loadDefiProtocols(uid: string) {
    // check if there is already a subscription
    if (
      this._subscriptions.find(
        (sub) => sub.collection === this._COLLECTIONS.defiProtocols
      )
    ) {
      return;
    }
    const colRef = collection(this._firestore, this._COLLECTIONS.defiProtocols);
    const constraints: QueryConstraint[] = [
      // where('uid', '==', uid)
    ];
    const q = query(colRef, ...constraints);
    const sub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        ...(doc.data() as Omit<UserWallet, 'id'>),
        id: doc.id,
      }));
      this._defiProtocols$.next(data);
    });
    this._subscriptions.push({
      collection: this._COLLECTIONS.defiProtocols,
      sub,
    });
  }
}
