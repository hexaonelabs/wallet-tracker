import { Injectable, isDevMode } from '@angular/core';
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
} from '@angular/fire/firestore';
import { BehaviorSubject } from 'rxjs';
import { Tx, UserWallet } from '../../interfaces';
import { limit } from 'firebase/firestore';

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

  async addTx(tx: Omit<Tx, 'id'>) {
    const colRef = collection(this._firestore, this._COLLECTIONS.tx);
    await addDoc(colRef, tx);
  }

  async delete(id: string) {
    const docRef = doc(this._firestore, this._COLLECTIONS.tx, id);
    await deleteDoc(docRef);
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
      isDevMode() ? limit(5) : null,
    ].filter(Boolean) as QueryConstraint[];
    const q = query(colRef, ...constraints);
    const sub = onSnapshot(q, (snapshot) => {
      const data = snapshot
        .docChanges()
        .map((change) => {
          if (change.type === 'added') {
            // add to the tx list
            return [
              ...this._txs$.value,
              {
                ...(change.doc.data() as Tx),
                id: change.doc.id,
              },
            ];
          } else if (change.type === 'modified') {
            const index = this._txs$.value.findIndex(
              (tx) => tx.id === change.doc.id
            );
            if (index !== -1) {
              return [
                ...this._txs$.value.slice(0, index),
                {
                  ...(change.doc.data() as Tx),
                  id: change.doc.id,
                },
                ...this._txs$.value.slice(index + 1),
              ];
            }
          } else if (change.type === 'removed') {
            return this._txs$.value.filter((tx) => tx.id !== change.doc.id);
          } else {
            return [];
          }
          return [];
        })
        .flat()
        .filter(Boolean);
      console.log('tx updated', data);
      this._txs$.next(data);
    });
    this._subscriptions.push({ collection: this._COLLECTIONS.tx, sub });
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
      const data = snapshot.docs.map((doc) => doc.data() as UserWallet);
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
      const data = snapshot.docs.map((doc) => doc.data() as any);
      this._defiProtocols$.next(data);
    });
    this._subscriptions.push({
      collection: this._COLLECTIONS.defiProtocols,
      sub,
    });
  }
}
