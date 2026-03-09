// Firebase configuration for NEETstuff Wallet
// TODO: Replace with your Firebase project config from Firebase Console

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
let app, auth, db, firestore;

async function initFirebase() {
  if (typeof firebase !== 'undefined') {
    app = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    firestore = firebase.firestore();
    
    // Enable offline persistence
    firestore.enablePersistence({ synchronizeTabs: true }).catch((err) => {
      if (err.code == 'failed-precondition') {
        console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
      } else if (err.code == 'unimplemented') {
        console.warn('The current browser does not support persistence.');
      }
    });
    
    console.log('Firebase initialized successfully');
    return true;
  } else {
    console.warn('Firebase SDK not loaded');
    return false;
  }
}

// Auth functions
async function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const result = await auth.signInWithPopup(provider);
    return result.user;
  } catch (error) {
    console.error('Google sign-in error:', error);
    throw error;
  }
}

async function signInWithEmail(email) {
  try {
    // For anonymous/email sign-in, we'll create a custom flow
    const result = await auth.signInAnonymously();
    return result.user;
  } catch (error) {
    console.error('Email sign-in error:', error);
    throw error;
  }
}

async function signInWithFacebook() {
  const provider = new firebase.auth.FacebookAuthProvider();
  try {
    const result = await auth.signInWithPopup(provider);
    return result.user;
  } catch (error) {
    console.error('Facebook sign-in error:', error);
    throw error;
  }
}

async function signOut() {
  await auth.signOut();
}

function onAuthStateChanged(callback) {
  auth.onAuthStateChanged(callback);
}

// User Profile functions
async function getUserProfile(uid) {
  const doc = await firestore.collection('players').doc(uid).get();
  return doc.exists ? doc.data() : null;
}

async function createUserProfile(uid, data) {
  const profile = {
    uid: uid,
    displayName: data.displayName || 'Player',
    email: data.email || null,
    photoURL: data.photoURL || null,
    flxBalance: 0,
    vltBalance: 0,
    xamanAddress: null,
    metamaskAddress: null,
    phantomAddress: null,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
    gamesPlayed: {},
    highScores: {}
  };
  await firestore.collection('players').doc(uid).set(profile);
  return profile;
}

async function updateUserProfile(uid, data) {
  await firestore.collection('players').doc(uid).update({
    ...data,
    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// Wallet functions
async function getFLXBalance(uid) {
  const doc = await firestore.collection('players').doc(uid).get();
  return doc.exists ? (doc.data().flxBalance || 0) : 0;
}

async function getVLTBalance(uid) {
  const doc = await firestore.collection('players').doc(uid).get();
  return doc.exists ? (doc.data().vltBalance || 0) : 0;
}

async function addFLX(uid, amount, reason) {
  const batch = firestore.batch();
  const playerRef = firestore.collection('players').doc(uid);
  const txRef = firestore.collection('transactions').doc();
  
  batch.update(playerRef, {
    flxBalance: firebase.firestore.FieldValue.increment(amount)
  });
  
  batch.set(txRef, {
    uid: uid,
    type: 'credit',
    currency: 'FLX',
    amount: amount,
    reason: reason,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });
  
  await batch.commit();
}

async function subtractFLX(uid, amount, reason) {
  const batch = firestore.batch();
  const playerRef = firestore.collection('players').doc(uid);
  const txRef = firestore.collection('transactions').doc();
  
  batch.update(playerRef, {
    flxBalance: firebase.firestore.FieldValue.increment(-amount)
  });
  
  batch.set(txRef, {
    uid: uid,
    type: 'debit',
    currency: 'FLX',
    amount: -amount,
    reason: reason,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });
  
  await batch.commit();
}

// Transaction history
async function getTransactionHistory(uid, limit = 20) {
  const snapshot = await firestore.collection('transactions')
    .where('uid', '==', uid)
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .get();
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Wallet linking
async function linkXamanWallet(uid, xamanAddress) {
  await firestore.collection('players').doc(uid).update({
    xamanAddress: xamanAddress,
    linkedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

async function linkMetamaskWallet(uid, address) {
  await firestore.collection('players').doc(uid).update({
    metamaskAddress: address,
    linkedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

async function linkPhantomWallet(uid, address) {
  await firestore.collection('players').doc(uid).update({
    phantomAddress: address,
    linkedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// Subscribe to real-time balance updates
function subscribeToBalance(uid, callback) {
  return firestore.collection('players').doc(uid)
    .onSnapshot((doc) => {
      if (doc.exists) {
        const data = doc.data();
        callback({
          flx: data.flxBalance || 0,
          vlt: data.vltBalance || 0
        });
      }
    });
}
