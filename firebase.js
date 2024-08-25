// firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: "AIzaSyDWVXcB4P1w2BoYWSABPjNMnW2rvmB4qig",
  authDomain: "profplus-3f2e6.firebaseapp.com",
  projectId: "profplus-3f2e6",
  storageBucket: "profplus-3f2e6.appspot.com",
  messagingSenderId: "49164059935",
  appId: "1:49164059935:web:9c4879df37f2421a171c2a",
  measurementId: "G-M0HGG93SJN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const auth = getAuth(app);

// Export the initialized Firebase services
export { app, auth, firestore };