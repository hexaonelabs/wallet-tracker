const fs = require('fs');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, getDocs, writeBatch } = require('firebase/firestore');


// Initialiser Firebase
initializeApp();

const db = getFirestore();
const userID = '';

const uploadWallet = () => {
  // Lire le fichier JSON
  fs.readFile('data.json', 'utf8', async (err, data) => {
    if (err) {
      console.error(err);
      return;
    }

    // Parser le JSON
    const jsonData = JSON.parse(data);

    // Extraire les walletId uniques
    const uniqueWalletIds = [...new Set(jsonData.map(item => item.walletId))];

    console.log('Wallets uniques:');
    console.log(uniqueWalletIds);

    // Envoyer chaque walletId unique dans Firestore
    const batch = writeBatch(db);
    uniqueWalletIds.forEach(walletId => {
      const docRef = doc(collection(db, 'user-wallet'));
      batch.set(docRef, { userID, walletId });
    });

    await batch.commit();
    console.log('Les wallets ont été envoyés à Firestore.');
  });

}


// Fonction pour récupérer les walletId de l'utilisateur
async function getUserWallets(userID) {
  const walletCollection = collection(db, 'user-wallet');
  const walletSnapshot = await getDocs(walletCollection);
  const wallets = walletSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  return wallets.filter(wallet => wallet.userID === userID);
}

const getDefiProtocols = async () => {
  const defiProtocolsCollection = collection(db, 'defi-protocols');
  const defiProtocolsSnapshot = await getDocs(defiProtocolsCollection);
  return defiProtocolsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}


const uploadDefiProtocols = async () => {
  const data = ['AAVE V3',
    'stargate',
    'mars protocol',
    'levana',
    'tarot protocol',
    'Beefy',
    'MilkyWay',
    'nolus vault',
    'stride',
    'solend',
    'marginfi',
    'aerodrom',
    'velodrom',
    'uniswap',];

  const batch = writeBatch(db);
  data.forEach(protocol => {
    const docRef = doc(collection(db, 'defi-protocols'));
    batch.set(docRef, { name: protocol });
  });
  await batch.commit();
  console.log('Les protocoles DeFi ont été envoyés à Firestore.');
}

const uploadTx = async () => {

  // Lire le fichier JSON et mettre à jour les walletId
  const data = fs.readFileSync('data.json', 'utf8');
  if (!data) {
    console.error(err);
    return;
  }

  const chainIds = fs.readFileSync('public/datas/chainIds.json', 'utf8');
  if (!chainIds) {
    console.error(err);
    return;
  }

  // Parser le JSON
  const jsonData = JSON.parse(data).map(tx => {
    console.log(tx);
    // normalizer les nombre americain en européen (1,000.00 => 1000.00)
    // check if string type and convert to number
    tx.quantity = typeof tx.quantity === 'string'
      ? parseFloat(tx.quantity.replace(/,/g, ''))
      : tx.quantity;
    tx.price = typeof tx.price === 'string'
      ? parseFloat(tx.price.replace(/,/g, ''))
      : tx.price;
    tx.fees = (typeof tx.fees === 'string'
      ? parseFloat(tx.fees.replace(/,/g, ''))
      : tx.fees) || 0;
    tx.total = typeof tx.total === 'string'
      ? parseFloat(tx.total.replace(/,/g, ''))
      : tx.total;
    return tx;
  });
  // Récupérer les walletId de l'utilisateur
  const userWallets = await getUserWallets(userID);
  const protocols = await getDefiProtocols();

  // Créer un mapping des walletId
  const walletIdMap = userWallets.reduce((map, wallet) => {
    map[wallet.walletId] = wallet.id;
    return map;
  }, {});

  // Inverser le mapping de chainIds pour obtenir un mapping nom -> id
  const chainNameToIdMap = Object.entries(JSON.parse(chainIds)).reduce((map, [id, name]) => {
    map[name] = id;
    return map;
  }, {});

  // create a mapping of protocol names
  const protocolNameToIdMap = protocols.reduce((map, protocol) => {
    map[protocol.name] = protocol.id;
    return map;
  }, {});

  // Mettre à jour les transactions
  const updatedData = jsonData.map(tx => {
    if (walletIdMap[tx.walletId]) {
      tx.walletId = walletIdMap[tx.walletId];
      tx.networkId = (tx.networkId === 'optimistic')
        ? chainNameToIdMap['optimism'] || tx.networkId
        : chainNameToIdMap[tx.networkId] || tx.networkId;
      tx.defiProtocolId = protocolNameToIdMap[tx.defiProtocolId] || tx.defiProtocolId || null;
      tx.uid = userID;
      createdAt = new Date();
    }
    return tx;
  });
  // remove all null|empty string|undefined values
  updatedData.forEach(tx => {
    Object.keys(tx).forEach(key => {
      if (tx[key] === null || tx[key] === '' || tx[key] === undefined) {
        delete tx[key];
      }
    });
  });
  console.log('Transactions mises à jour');

  // batch save
  const batch = writeBatch(db);
  updatedData.forEach(tx => {
    const docRef = doc(collection(db, 'txs'));
    batch.set(docRef, tx);
  });

  await batch.commit();
  console.log('Les transactions ont été envoyées à Firestore.');
}
// uploadTx();