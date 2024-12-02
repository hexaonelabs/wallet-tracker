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
  updateDoc,
  getDoc,
  setDoc,
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
    userWallet: 'user-wallets',
    userConfig: 'user-config',
    defiProtocols: 'defi-protocols',
  };
  private readonly _whiteListedUIDs = ['H5Gzlf9BBCTyCbSUT9TgTHkZZUw1'];
  private readonly _txs$: BehaviorSubject<Tx[]> = new BehaviorSubject<Tx[]>(
    [] as unknown as Tx[]
  );
  private readonly _userWallets$: BehaviorSubject<UserWallet[]> =
    new BehaviorSubject<UserWallet[]>(undefined as unknown as UserWallet[]);
  private readonly _defiProtocols$: BehaviorSubject<any[]> =
    new BehaviorSubject([] as unknown as Tx[]);
  private readonly _userConfig$: BehaviorSubject<
    | {
        coingeckoApiKey?: string;
      }
    | undefined
    | null
  > = new BehaviorSubject(undefined as any);
  private readonly _subscriptions: {
    sub: Subscribtion;
    collection: string;
  }[] = [];
  public readonly txs$ = this._txs$.asObservable().pipe();
  public readonly userWallets$ = this._userWallets$.asObservable();
  public readonly defiProtocols$ = this._defiProtocols$.asObservable().pipe();
  public readonly userConfig$ = this._userConfig$.asObservable().pipe();

  constructor(private readonly _firestore: Firestore) {}

  async loadUserData(uid: string) {
    this._loadConfig(uid);
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
    // remove all undefined values
    Object.keys(tx).forEach(
      (key) => (tx as any)[key] === undefined && delete (tx as any)[key]
    );
    // call the addDoc method
    const result = await addDoc(colRef, tx);
    // add new Tx to the list
    const currentTxs = this._txs$.value ?? [];
    this._txs$.next([...currentTxs, { ...tx, id: result.id }]);
  }

  async delete(id: string) {
    const docRef = doc(this._firestore, this._COLLECTIONS.tx, id);
    await deleteDoc(docRef);
    // update the list
    const currentTxs = this._txs$.value ?? [];
    const index = currentTxs.findIndex((tx) => tx.id === id);
    if (index !== -1) {
      currentTxs.splice(index, 1);
      this._txs$.next(currentTxs);
    }
  }

  async updateUserConfig(uid: string, value: { coingeckoApiKey: string }) {
    const docRef = doc(
      this._firestore,
      this._COLLECTIONS.userConfig + `/${uid}`
    );
    const docExist = (await getDoc(docRef)).exists();
    if (!docExist) {
      await setDoc(docRef, value);
    } else {
      await updateDoc(docRef, value);
    }
  }
  private async _loadTxs(uid: string) {
    // check if there is already a subscription
    if (
      this._subscriptions.find((sub) => sub.collection === this._COLLECTIONS.tx)
    ) {
      return;
    }
    // check if is in white list
    let maxLimit = 500;
    if (this._whiteListedUIDs.includes(uid)) {
      maxLimit = -1;
    }
    console.log(
      `[INFO] Is in white list: ${this._whiteListedUIDs.includes(
        uid
      )} with limit to ${maxLimit}`
    );
    const colRef = collection(this._firestore, this._COLLECTIONS.tx);
    const constraints = [
      where('uid', '==', uid),
      environment.isProd
        ? maxLimit < 0
          ? undefined
          : limit(maxLimit)
        : limit(15),
      // orderBy('createdAt', 'desc'),
    ].filter(Boolean) as QueryConstraint[];
    const q = query(colRef, ...constraints);
    // get data without listener
    const data: any[] = await firstValueFrom(
      collectionData(q, { idField: 'id' })
    );
    this._txs$.next(
      data.length > 0
        ? (
            [
              ...data.map((tx) => ({
                ...tx,
                createdAt: tx.createdAt?.toDate
                  ? tx.createdAt?.toDate()
                  : new Date(tx.createdAt) || undefined,
              })),
            ] as Tx[]
          )
            // sort by createdAt desc with undefined at the end
            .sort((a, b) => {
              if (a.createdAt && b.createdAt) {
                return b.createdAt.getTime() - a.createdAt.getTime();
              }
              if (a.createdAt) {
                return -1;
              }
              if (b.createdAt) {
                return 1;
              }
              return 0;
            })
        : (undefined as unknown as Tx[])
    );
    console.log('tx data', this._txs$.value);
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
      console.log('wallet data', data);

      this._userWallets$.next(
        data.length > 0 ? data : (undefined as unknown as UserWallet[])
      );
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
    const constraints: QueryConstraint[] = [where('uid', '==', uid)];
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

  private async _loadConfig(uid: string) {
    if (
      this._subscriptions.find(
        (sub) => sub.collection === this._COLLECTIONS.userConfig
      )
    ) {
      return;
    }
    const docRef = doc(
      this._firestore,
      this._COLLECTIONS.userConfig + `/${uid}`
    );
    const sub = onSnapshot(docRef, (snapshot) => {
      if (!snapshot.exists()) {
        this._userConfig$.next(null);
        return;
      }
      const data = {
        ...snapshot.data(),
        id: snapshot.id,
      } as { coingeckoApiKey: string; id: string };
      this._userConfig$.next(data);
    });
    this._subscriptions.push({ collection: this._COLLECTIONS.userConfig, sub });
  }
}
