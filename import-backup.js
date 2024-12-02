const fs = require('fs');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, getDocs, writeBatch } = require('firebase/firestore');

// Initialiser Firebase
initializeApp();

const db = getFirestore();
// handle node first argument
const userID = process.argv[2];
// handle node second argument
const fileUrl = process.argv[3];

if (userID.length <= 0) {
  throw new Error('Please provide a valid user ID');
}
if (fileUrl.length <= 0) {
  throw new Error('Please provide a valid file URL');
}

const importBackup = async () => {
  console.log(`1) Importing backup for user ${userID}`);
  // Lire le fichier JSON et mettre à jour les walletId
  const data = fs.readFileSync(fileUrl, 'utf8');
  if (!data) {
    console.error(err);
    return;
  }
  const {
    txs, userWallets, defiProtocols,
  } = JSON.parse(data);
  // update `uid` field to `userID`
  console.log(`2) Updating data with user uid...`);
  const updatedTxs = txs.map(tx => {
    tx.uid = userID;
    return tx;
  });
  const updatedUserWallets = userWallets.map(wallet => {
    wallet.uid = userID;
    return wallet;
  });
  const updatedDefiProtocols = defiProtocols.map(protocol => {
    protocol.uid = userID;
    return protocol;
  });

  console.log(`3) Sending data to Firestore...`);
  // batch save
  const batch = writeBatch(db);
  updatedTxs.forEach(tx => {
    const docRef = doc(collection(db, 'txs'));
    batch.set(docRef, tx);
  });
  updatedUserWallets.forEach(wallet => {
    const docRef = doc(collection(db, 'user-wallets'));
    batch.set(docRef, wallet);
  });
  updatedDefiProtocols.forEach(protocol => {
    const docRef = doc(collection(db, 'defi-protocols'));
    batch.set(docRef, protocol);
  });
  console.log(`4) Committing batch...`);
  await batch.commit();
  console.log(`5) Data has been sent to Firestore 🎉`);
}

importBackup();