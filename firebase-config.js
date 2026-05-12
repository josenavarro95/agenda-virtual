// 🌸 Firebase Configuration — Mi Agenda Virtual
// Proyecto: agenda-virtual-93f72

// Importar Firebase SDKs (compat version para uso sin bundler)
const firebaseConfig = {
  apiKey: "AIzaSyA1HikNI9vFPmhvhdwndpPFRedcQXZaX8Q",
  authDomain: "agenda-virtual-93f72.firebaseapp.com",
  projectId: "agenda-virtual-93f72",
  storageBucket: "agenda-virtual-93f72.firebasestorage.app",
  messagingSenderId: "828693054271",
  appId: "1:828693054271:web:cac4283202cffcd52f498a"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Exportar servicios
const db      = firebase.firestore();
const auth    = firebase.auth();
const storage = firebase.storage();

// Habilitar persistencia offline (solo en http/https, no en file://)
if (location.protocol !== 'file:') {
  db.enablePersistence({ synchronizeTabs: true })
    .catch(err => {
      if (err.code === 'failed-precondition') {
        console.warn('Persistencia no disponible (múltiples tabs)');
      } else if (err.code === 'unimplemented') {
        console.warn('Persistencia no soportada por este navegador');
      }
    });
}
