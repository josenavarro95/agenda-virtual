# 📖 Mi Agenda Virtual 🌸

> Tu diario personal elegante, seguro y siempre contigo 💜

Una agenda virtual completa con diseño femenino y elegante, guardado automático en la nube con Firebase, y disponible como app instalable (PWA).

## ✨ Características

- 🔐 **Login seguro** con usuario y contraseña
- 📖 **Diario diario** con diseño de cuaderno físico con líneas
- 💾 **Guardado automático** en Firebase cada minuto + al dejar de escribir
- 🎨 **Editor rico**: cambio de fuente, tamaño, color de letra
- **B I U** Negrita, cursiva, subrayado y alineación
- 😊 **Picker de emojis** con categorías: caritas, corazones, flores, estrellas y más
- 🖼️ **Insertar imágenes** PNG/JPG con redimensionado táctil (pinch) y botones
- 📅 **Calendario** de navegación con indicador de días escritos
- 🌷 **Portada personalizable** con foto, nombre, frase favorita
- ⚙️ **Cambio de contraseña** desde configuración
- ⏰ **Cierre automático de sesión** tras 20 segundos de inactividad (con diálogo)
- 📱 **Instalable como App** (PWA) en móvil y escritorio

## 🎨 Diseño

- Colores: Lila · Azul Cielo · Rosa Claro · Blanco
- Fuentes: Dancing Script · Playfair Display · Caveat · Pacifico
- Diseño elegante 100% femenino ✨

## 🚀 Configuración

### 1. Firebase
El proyecto ya está conectado a Firebase. Solo necesitas:
1. Ir a la [Consola de Firebase](https://console.firebase.google.com)
2. Proyecto: `agenda-virtual-93f72`
3. Habilitar **Authentication** → **Email/Password**
4. Habilitar **Firestore Database** (modo producción)
5. *(Opcional)* Habilitar **Storage** para imágenes grandes

### 2. Reglas de Firestore
En Firebase Console → Firestore → Reglas:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 3. Usar la app
1. Abre `index.html` en tu navegador
2. Ingresa usuario: `Paola2511` y tu contraseña
3. La primera vez, crea automáticamente tu cuenta
4. ¡Empieza a escribir! 💜

## 📁 Estructura del Proyecto

```
agenda-virtual/
├── index.html          # App principal
├── styles.css          # Estilos completos
├── app.js              # Lógica de la aplicación
├── firebase-config.js  # Configuración Firebase
├── manifest.json       # PWA manifest
├── service-worker.js   # Service Worker (offline)
├── icons/              # Iconos de la app
│   ├── icon-192.png
│   └── icon-512.png
└── README.md
```

## 💡 Uso en Móvil

**Android**: Abre en Chrome → menú → "Añadir a pantalla de inicio"  
**iPhone/iPad**: Abre en Safari → compartir → "Añadir a pantalla de inicio"

---
Hecho con amor 💜 para Paola
