import { Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
  deleteDoc,
  doc,
  docData,
  Firestore,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { AssetPosition, Tx, UserWallet } from '../interfaces';
import { firstValueFrom, map, Observable, of, switchMap } from 'rxjs';
import { Auth, authState, User } from '@angular/fire/auth';

const COLLECTIONS = {
  txs: '_all_txs',
  state: '_all_state',
  userWallet: '_all_user_wallets',
  defiProtocols: '_all_defi_protocols',
  userConfig: '_all_user_config',
} as const;

@Injectable({
  providedIn: 'root',
})
export class APIService {
  public assets$: Observable<AssetPosition[] | null>;
  public groupedAssets$: Observable<AssetPosition[] | null>;
  public readonly userConfig$: Observable<any | null>;
  public readonly userWallets$: Observable<UserWallet[] | null>;
  public readonly defiProtocols$: Observable<any[] | null>;

  constructor(
    private readonly _firestore: Firestore,
    private readonly _auth: Auth
  ) {
    this.assets$ = (authState(this._auth) as Observable<User | null>).pipe(
      switchMap((user) => {
        if (!user) {
          return of(null);
        }
        const uid = user.uid;
        const txsRef = collection(this._firestore, COLLECTIONS.state);
        const q = query(txsRef, where('uid', '==', uid));
        return collectionData(q, {
          idField: 'id',
        }) as Observable<AssetPosition[]>;
      })
    );
    this.groupedAssets$ = this.assets$.pipe(
      map((positions) => {
        // group all positions by symbol
        const groupedPositions = positions?.reduce((acc, position) => {
          const existingPosition = acc.find(
            (p) => p.tickerId === position.tickerId
          );
          if (existingPosition) {
            existingPosition.units += position.units;
            existingPosition.initialInvestedAmountUSD +=
              position.initialInvestedAmountUSD;
          } else {
            acc.push({ ...position });
          }
          return acc;
        }, [] as AssetPosition[]);
        return groupedPositions || [];
      })
    );
    this.userConfig$ = (authState(this._auth) as Observable<User | null>).pipe(
      switchMap((user) => {
        if (!user) {
          return of(null);
        }
        const uid = user.uid;
        const docRef = doc(this._firestore, COLLECTIONS.userConfig + `/${uid}`);
        return docData(docRef, {
          idField: 'id',
        }) as Observable<any>;
      })
    );
    this.userWallets$ = (authState(this._auth) as Observable<User | null>).pipe(
      switchMap((user) => {
        if (!user) {
          return of(null);
        }
        const uid = user.uid;
        const walletsRef = collection(this._firestore, COLLECTIONS.userWallet);
        const q = query(walletsRef, where('uid', '==', uid));
        return collectionData(q, {
          idField: 'id',
        }) as Observable<UserWallet[]>;
      })
    );
    this.defiProtocols$ = (
      authState(this._auth) as Observable<User | null>
    ).pipe(
      switchMap((user) => {
        if (!user) {
          return of(null);
        }
        const uid = user.uid;
        const defiProtocolsRef = collection(
          this._firestore,
          COLLECTIONS.defiProtocols
        );
        const q = query(defiProtocolsRef, where('uid', '==', uid));
        return collectionData(q, {
          idField: 'id',
        }) as Observable<any[]>;
      })
    );
  }

  getTxs$(tickerId: string): Observable<Tx[] | null> {
    return (authState(this._auth) as Observable<User | null>).pipe(
      switchMap((user) => {
        if (!user) {
          return of(null);
        }
        const uid = user.uid;
        const txsRef = collection(this._firestore, COLLECTIONS.txs);
        const q = query(
          txsRef,
          where('uid', '==', uid),
          where('tickerId', '==', tickerId)
        );
        return collectionData(q, {
          idField: 'id',
        }) as Observable<Tx[]>;
      }),
      map((txs) => {
        return (
          txs?.map((tx) => {
            const txData = tx as any;
            txData.createdAt = txData.createdAt?.toDate
              ? txData.createdAt?.toDate()
              : new Date(txData.createdAt) || undefined;
            return txData as Tx;
          }) || []
        );
      })
    );
  }

  async addTx(tx: Omit<Tx, 'id'>): Promise<Omit<AssetPosition, 'averageCost'>> {
    // remove all undefined values
    Object.keys(tx).forEach(
      (key) =>
        ((tx as any)[key] === undefined || (tx as any)[key] === null) &&
        delete (tx as any)[key]
    );
    // get existing coin and calculate new state
    const coinRef = collection(this._firestore, COLLECTIONS.state);
    // build constraints
    const byCoinId = where('tickerId', '==', tx.tickerId);
    const byUID = where('uid', '==', tx.uid);
    const byWalletId = where('walletId', '==', tx.walletId);
    const byNetworkId = where('networkId', '==', tx.networkId);
    const constraintes = [byCoinId, byUID, byWalletId, byNetworkId];
    if (tx.defiProtocolId) {
      const byDefiProtocolId = where('defiProtocolId', '==', tx.defiProtocolId);
      constraintes.push(byDefiProtocolId);
    }
    // build query
    const q = query(coinRef, ...constraintes);
    const coinSnapshot = await getDocs(q);
    let state: Omit<AssetPosition, 'id' | 'averageCost'>;
    const coinDoc = coinSnapshot.docs.find((doc) => {
      const data = doc.data() as Omit<AssetPosition, 'id' | 'averageCost'>;
      return tx.defiProtocolId
        ? data.defiProtocolId === tx.defiProtocolId
        : !data.defiProtocolId;
    });
    console.log('snap', { coinSnapshot, coinDoc });
    if (!coinDoc) {
      state = {
        initialInvestedAmountUSD: (tx.price * 100 * tx.quantity) / 100,
        networkId: tx.networkId,
        tickerId: tx.tickerId,
        uid: tx.uid,
        units: tx.quantity,
        walletId: tx.walletId,
      };
      if (tx.defiProtocolId) {
        state.defiProtocolId = tx.defiProtocolId;
      }
    } else {
      const coinData = {
        ...(coinDoc.data() as Omit<AssetPosition, 'id' | 'averageCost'>),
        id: coinDoc.id,
      };
      // calculate new state
      const initialInvestedAmountUSD =
        coinData.initialInvestedAmountUSD +
        (tx.price * 100 * tx.quantity) / 100;
      state = {
        ...coinData,
        initialInvestedAmountUSD,
        units: coinData.units + tx.quantity,
      };
    }
    let coinId = coinDoc?.id;
    // add new coin state
    if (!coinId) {
      const coinRef = collection(this._firestore, COLLECTIONS.state);
      const result = await addDoc(coinRef, state);
      coinId = result.id;
    } else {
      // update the coin state
      const coinRef = collection(this._firestore, COLLECTIONS.state);
      const coinDocRef = doc(coinRef, coinId);
      await updateDoc(coinDocRef, state);
      coinId = coinDocRef.id;
    }
    // add tx to the _all_txs collection
    const txsRef = collection(this._firestore, COLLECTIONS.txs);
    await addDoc(txsRef, tx);
    // return
    return {
      ...state,
      id: coinId!,
    };
  }

  async addWallet(value: Omit<UserWallet, 'id'>) {
    const colRef = collection(this._firestore, COLLECTIONS.userWallet);
    await addDoc(colRef, value);
  }

  async addDefiProtocols(value: Omit<any & { uid: string }, 'id'>) {
    const colRef = collection(this._firestore, COLLECTIONS.defiProtocols);
    await addDoc(colRef, value);
  }

  async updateUserConfig(uid: string, value: { coingeckoApiKey: string }) {
    const docRef = doc(this._firestore, COLLECTIONS.userConfig + `/${uid}`);
    const docExist = (await getDoc(docRef)).exists();
    if (!docExist) {
      await setDoc(docRef, value);
    } else {
      await updateDoc(docRef, value);
    }
  }

  async deleteTx(id: string) {
    const user: User = await firstValueFrom(authState(this._auth));
    if (!user) {
      return;
    }
    // get tx data
    const txRef = doc(this._firestore, COLLECTIONS.txs, id);
    const txSnap = await getDoc(txRef);
    const tx = txSnap.data() as Tx;
    if (!tx) {
      throw new Error('Tx not found');
    }
    // get coresponding state
    const stateRef = collection(this._firestore, COLLECTIONS.state);
    const byUid = where('uid', '==', user.uid);
    const byTickerId = where('tickerId', '==', tx.tickerId);
    const byWalletId = where('walletId', '==', tx.walletId);
    const byNetworkId = where('networkId', '==', tx.networkId);
    const constraintes = [byUid, byTickerId, byWalletId, byNetworkId];
    if (tx.defiProtocolId) {
      const byDefiProtocolId = where('defiProtocolId', '==', tx.defiProtocolId);
      constraintes.push(byDefiProtocolId);
    }
    const q = query(stateRef, ...constraintes);
    const stateSnapshot = await getDocs(q);
    if (stateSnapshot.empty) {
      throw new Error('State not found');
    }

    // find the state doc that matches the tx
    const stateDoc = stateSnapshot.docs.find((doc) => {
      const data = { ...(doc.data() as AssetPosition), id: doc.id };
      return tx.defiProtocolId
        ? data.defiProtocolId === tx.defiProtocolId
        : !data.defiProtocolId;
    });
    if (!stateDoc) {
      throw new Error('State not found');
    }
    const state = { ...stateDoc.data(), id: stateDoc.id } as AssetPosition;
    // calculate new state
    const newState = {
      ...state,
      units: state.units - tx.quantity,
      initialInvestedAmountUSD:
        state.initialInvestedAmountUSD - (tx.price * 100 * tx.quantity) / 100,
    };
    console.log('>>>>>', state);
    // update state
    const stateDocRef = doc(stateRef, state.id);
    if (newState.units <= 0) {
      await deleteDoc(stateDocRef);
    } else {
      await updateDoc(stateDocRef, newState);
    }
    // delete tx
    await deleteDoc(txRef);
  }
}
