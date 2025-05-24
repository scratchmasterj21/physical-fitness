import { initializeApp } from "firebase/app";


const firebaseConfig = {
    apiKey: "AIzaSyD0i6rwqFUByN0jDHvpj-lmd8PtkO4C6-c",
    authDomain: "physicalfitness-48836.firebaseapp.com",
    databaseURL: "https://physicalfitness-48836-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "physicalfitness-48836",
    storageBucket: "physicalfitness-48836.appspot.com",
    messagingSenderId: "749626629438",
    appId: "1:749626629438:web:b1247249b4dc2015ad606f",
    measurementId: "G-3JVLHEE3LJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export default app;