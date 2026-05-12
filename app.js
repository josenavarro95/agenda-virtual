/* ============================================================
   MI AGENDA VIRTUAL 🌸 — Lógica Principal
   Versión: 1.0 | Con amor para Paola 💜
   ============================================================ */

'use strict';

// ============================================================
// DATOS DE EMOJIS POR CATEGORÍA
// ============================================================
const EMOJI_DATA = {
  smileys: ['😊','😍','🥰','😘','😂','🤣','😅','😆','😁','😀','🥲','😢','😭','🥺','😴','🤔','😌','🥳','🤩','😎','🫶','🙏','👏','💪','🤗','😏','🫠','😇','😈','🥹'],
  hearts:  ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💖','💗','💓','💞','💕','💌','❣️','💔','💝','♥️','🫀','💟','☮️','✝️','☯️','🫶'],
  flowers: ['🌸','🌺','🌷','🌹','🌻','🌼','💐','🪷','🌾','🍀','🌿','🌱','🪴','🌳','🌲','🌴','🎋','🎍','🍃','🍂','🍁','🍄','🌵','🎄'],
  stars:   ['✨','⭐','🌟','💫','🌙','☀️','🌈','☁️','⛅','🌤️','🌥️','🌦️','🌧️','⛈️','🌩️','🌨️','❄️','🌬️','🌀','🌊','🔥','💧','🌏','🪐','🌌'],
  animals: ['🐱','🐶','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🐤','🦋','🐠','🐟','🐬','🦋','🦄','🐝','🦔','🐩'],
  food:    ['🍰','🎂','🧁','🍩','🍪','🍫','🍬','🍭','🍮','🍯','🍓','🍒','🍎','🍊','🍋','🍑','🍇','🍉','🥝','🍦','🍧','🍨','🧇','🥞','☕','🧋'],
  travel:  ['✈️','🚀','🌍','🗺️','🏖️','🏝️','🏔️','⛰️','🎡','🎢','🎠','🏰','🗼','🗽','🌉','🌃','🏙️','🎑','🌅','🌄','🌠','🎆','🎇','🎋'],
  magic:   ['✨','🪄','🔮','🎩','🌟','💫','🌈','🦄','🧚','🧜','🧙','🏆','🎖️','🥇','🎗️','🎀','🎁','🎊','🎉','🎈','🪅','💎','👑','🪩','🫧']
};

// ============================================================
// ESTADO GLOBAL
// ============================================================
let currentUser     = null;
let currentDate     = new Date();
let calendarDate    = new Date();
let saveDebounceTimer = null;
let autoSaveInterval  = null;
let lastActivity    = Date.now();
let inactivityCheck = null;
let countdownTimer  = null;
let countdownValue  = 10;
let logoutDialogOpen = false;
let selectedImage   = null;
let deferredInstall = null;
let savedRange      = null;   // Rango guardado para insertar emojis

const INACTIVITY_TIMEOUT = 300000; // 5 minutos
const COUNTDOWN_SECONDS  = 30;    // 30 segundos para responder
const DEBOUNCE_DELAY     = 2500;  // 2.5 segundos tras dejar de escribir
const AUTOSAVE_INTERVAL  = 60000; // 60 segundos

// ============================================================
// INICIALIZACIÓN
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  registerServiceWorker();
  setupPWAInstall();
  auth.onAuthStateChanged(handleAuthChange);
  setupAllListeners();
});

function registerServiceWorker() {
  // Service Worker solo funciona con http/https, no con file://
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./service-worker.js')
      .then(() => console.log('✅ Service Worker registrado'))
      .catch(err => console.warn('SW error:', err));
  }
}

function setupPWAInstall() {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredInstall = e;
    const btn = document.getElementById('install-app-btn');
    const hint = document.getElementById('install-hint');
    if (btn) { btn.style.display = 'block'; if (hint) hint.style.display = 'none'; }
  });

  const installBtn = document.getElementById('install-app-btn');
  if (installBtn) {
    installBtn.addEventListener('click', () => {
      if (deferredInstall) {
        deferredInstall.prompt();
        deferredInstall.userChoice.then(() => { deferredInstall = null; });
      }
    });
  }
}

// ============================================================
// AUTENTICACIÓN
// ============================================================
function handleAuthChange(user) {
  hideLoading();
  if (user) {
    currentUser = user;
    showApp();
    initApp();
  } else {
    currentUser = null;
    showLoginScreen();
    stopInactivityTimer();
  }
}

async function doLogin(username, password) {
  const email = usernameToEmail(username);
  try {
    await auth.signInWithEmailAndPassword(email, password);
  } catch (err) {
    if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
      // Primera vez: crear cuenta automáticamente
      try {
        await auth.createUserWithEmailAndPassword(email, password);
      } catch (createErr) {
        throw createErr;
      }
    } else {
      throw err;
    }
  }
}

async function doLogout() {
  stopInactivityTimer();
  stopAutoSave();
  await auth.signOut();
}

async function doChangePassword(currentPwd, newPwd) {
  if (!currentUser) throw new Error('No hay sesión activa');
  const email = currentUser.email;
  const credential = firebase.auth.EmailAuthProvider.credential(email, currentPwd);
  await currentUser.reauthenticateWithCredential(credential);
  await currentUser.updatePassword(newPwd);
}

function usernameToEmail(username) {
  return username.toLowerCase().replace(/[^a-z0-9]/g, '') + '@mi-agenda-virtual.app';
}

// ============================================================
// MOSTRAR/OCULTAR PANTALLAS
// ============================================================
function hideLoading() {
  const el = document.getElementById('loading-overlay');
  if (el) { el.style.opacity = '0'; setTimeout(() => el.style.display = 'none', 400); }
}

function showLoginScreen() {
  document.getElementById('screen-login').classList.remove('hidden');
  document.getElementById('app-container').classList.add('hidden');
}

function showApp() {
  document.getElementById('screen-login').classList.add('hidden');
  document.getElementById('app-container').classList.remove('hidden');
  showWelcomeMessage();
}

function showWelcomeMessage() {
  const overlay = document.createElement('div');
  overlay.className = 'welcome-overlay';
  overlay.innerHTML = `
    <div class="welcome-card">
      <span class="welcome-flowers">🌸 💜 🌸</span>
      <div class="welcome-title">Bienvenida a tu agenda virtual</div>
      <div class="welcome-name">Paola ✨</div>
      <div class="welcome-line"></div>
      <div class="welcome-sub">Tu espacio personal y secreto 💜</div>
    </div>
  `;
  document.body.appendChild(overlay);

  setTimeout(() => {
    overlay.classList.add('hiding');
    overlay.addEventListener('animationend', () => overlay.remove(), { once: true });
  }, 1500);
}

function showScreen(name) {
  // Ocultar todas las pantallas
  document.querySelectorAll('.app-screen').forEach(s => s.classList.remove('active'));
  // Mostrar la pedida
  const screen = document.getElementById('screen-' + name);
  if (screen) screen.classList.add('active');

  // Actualizar menú lateral
  document.querySelectorAll('.menu-item').forEach(i => {
    i.classList.toggle('active', i.dataset.screen === name);
  });
  // Actualizar nav inferior
  document.querySelectorAll('.bottom-nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.screen === name);
  });

  // Actualizar header según pantalla
  const mainEl = document.getElementById('header-date-main');
  const subEl  = document.getElementById('header-date-sub');
  if (name === 'diary') {
    updateDateDisplay(); // restaura fecha del diario
  } else {
    const titles = { calendar: '📅 Calendario', cover: '🌷 Mi Portada', settings: '⚙️ Configuración' };
    if (mainEl) mainEl.textContent = titles[name] || '📖 Mi Agenda';
    if (subEl)  subEl.textContent  = '';
  }

  // Acciones específicas por pantalla
  if (name === 'calendar') renderCalendar(calendarDate.getFullYear(), calendarDate.getMonth());
  if (name === 'cover')    loadCoverData();

  closeSideMenu();
}

function openSideMenu() {
  document.getElementById('side-menu').classList.add('open');
  document.getElementById('menu-overlay').classList.remove('hidden');
  document.getElementById('app-container').classList.add('menu-open');
}

function closeSideMenu() {
  document.getElementById('side-menu').classList.remove('open');
  document.getElementById('menu-overlay').classList.add('hidden');
  document.getElementById('app-container').classList.remove('menu-open');
}

// ============================================================
// INICIALIZAR APP (tras login)
// ============================================================
async function initApp() {
  loadDiaryEntry(formatDate(currentDate));
  loadCoverDataForMenu();
  startInactivityTimer();
  startAutoSave();
  updateDateDisplay();
  renderEmojiGrid('smileys');
}

// ============================================================
// DIARIO — CARGA Y GUARDADO
// ============================================================
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateDisplay(date) {
  const opts = { weekday:'long', year:'numeric', month:'long', day:'numeric' };
  return date.toLocaleDateString('es-ES', opts);
}

function updateDateDisplay() {
  const today   = formatDate(new Date());
  const current = formatDate(currentDate);

  // Fecha completa tipo "lunes, 11 de mayo de 2026"
  const fullDate = currentDate.toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  // Capitalizar primera letra
  const fullDateCap = fullDate.charAt(0).toUpperCase() + fullDate.slice(1);

  // Header principal: muestra "Mi Diario 📖" o "🌸 Hoy"
  const mainEl = document.getElementById('header-date-main');
  const subEl  = document.getElementById('header-date-sub');

  if (mainEl) mainEl.textContent = current === today ? '🌸 Hoy en mi diario' : '📖 Mi Diario';
  if (subEl)  subEl.textContent  = fullDateCap;

  // Selector de fecha y etiqueta dentro del diario
  const labelEl  = document.getElementById('date-display-label');
  const pickerEl = document.getElementById('diary-date-picker');
  if (labelEl)  labelEl.textContent = current === today ? '🌸 Hoy — ' + fullDateCap : fullDateCap;
  if (pickerEl) pickerEl.value = current;
}

async function loadDiaryEntry(dateStr) {
  if (!currentUser) return;
  const editor = document.getElementById('diary-editor');
  editor.innerHTML = '';
  // Limpiar capa de imágenes flotantes
  const layer = document.getElementById('images-layer');
  if (layer) layer.innerHTML = '';
  setSaveStatus('loading', '⏳ Cargando...');

  try {
    const docRef = db.collection('users').doc(currentUser.uid)
                     .collection('entries').doc(dateStr);
    const snap = await docRef.get();
    if (snap.exists) {
      editor.innerHTML = snap.data().content || '';
      restoreImages(snap.data().imagesData || []);
    } else {
      editor.innerHTML = '';
    }
    setSaveStatus('saved', '✅ Todo guardado');
  } catch (err) {
    console.error('Error cargando entrada:', err);
    setSaveStatus('error', '⚠️ Error al cargar');
  }
}

async function saveDiaryEntry(dateStr, content) {
  if (!currentUser) return;
  setSaveStatus('saving', '💾 Guardando...');
  try {
    const docRef = db.collection('users').doc(currentUser.uid)
                     .collection('entries').doc(dateStr);
    await docRef.set({
      content: content,
      imagesData: getImagesData(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      date: dateStr
    }, { merge: true });
    setSaveStatus('saved', '✅ Todo guardado');
  } catch (err) {
    console.error('Error guardando:', err);
    setSaveStatus('error', '❌ Error al guardar');
  }
}

function setSaveStatus(type, text) {
  const el = document.getElementById('save-status');
  const textEl = document.getElementById('save-status-text');
  if (!el || !textEl) return;
  el.className = 'save-status ' + type;
  textEl.textContent = text;
}

function triggerSave() {
  const content = document.getElementById('diary-editor').innerHTML;
  const dateStr = formatDate(currentDate);
  clearTimeout(saveDebounceTimer);
  saveDebounceTimer = setTimeout(() => saveDiaryEntry(dateStr, content), DEBOUNCE_DELAY);
}

function startAutoSave() {
  stopAutoSave();
  autoSaveInterval = setInterval(() => {
    const content = document.getElementById('diary-editor').innerHTML;
    const dateStr = formatDate(currentDate);
    if (content.trim()) saveDiaryEntry(dateStr, content);
  }, AUTOSAVE_INTERVAL);
}

function stopAutoSave() {
  if (autoSaveInterval) { clearInterval(autoSaveInterval); autoSaveInterval = null; }
  if (saveDebounceTimer) { clearTimeout(saveDebounceTimer); saveDebounceTimer = null; }
}

// ============================================================
// AUTO-LOGOUT — Temporizador de Inactividad
// ============================================================
function startInactivityTimer() {
  stopInactivityTimer();
  lastActivity = Date.now();
  inactivityCheck = setInterval(checkInactivity, 1000);
}

function stopInactivityTimer() {
  if (inactivityCheck) { clearInterval(inactivityCheck); inactivityCheck = null; }
  if (countdownTimer)  { clearInterval(countdownTimer);  countdownTimer  = null; }
}

function resetActivity() {
  // Solo actualizar el timestamp — NO cerrar el diálogo automáticamente.
  // El diálogo solo se cierra si el usuario pulsa "Seguir escribiendo".
  lastActivity = Date.now();
}

function checkInactivity() {
  if (logoutDialogOpen) return;
  const elapsed = Date.now() - lastActivity;
  if (elapsed >= INACTIVITY_TIMEOUT) {
    showLogoutDialog();
  }
}

function showLogoutDialog() {
  if (logoutDialogOpen) return;
  logoutDialogOpen = true;
  countdownValue = COUNTDOWN_SECONDS;
  document.getElementById('countdown-display').textContent = countdownValue;
  document.getElementById('logout-dialog').classList.remove('hidden');

  // Guardar antes de mostrar el diálogo
  const content = document.getElementById('diary-editor').innerHTML;
  const dateStr = formatDate(currentDate);
  if (content.trim()) saveDiaryEntry(dateStr, content);

  countdownTimer = setInterval(() => {
    countdownValue--;
    const el = document.getElementById('countdown-display');
    if (el) el.textContent = countdownValue;
    if (countdownValue <= 0) {
      clearInterval(countdownTimer);
      countdownTimer = null;
      doLogout();
    }
  }, 1000);
}

function hideLogoutDialog() {
  logoutDialogOpen = false;
  document.getElementById('logout-dialog').classList.add('hidden');
  if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
  lastActivity = Date.now();
}

// ============================================================
// EDITOR DE TEXTO — Formato
// ============================================================
function execFormat(cmd, value) {
  document.getElementById('diary-editor').focus();
  document.execCommand(cmd, false, value || null);
  triggerSave();
}

function applyFontFamily(font) {
  document.getElementById('diary-editor').focus();
  document.execCommand('fontName', false, font);
  triggerSave();
}

function applyFontSize(size) {
  document.getElementById('diary-editor').focus();
  document.execCommand('fontSize', false, size);
  triggerSave();
}

function applyTextColor(color) {
  const editor = document.getElementById('diary-editor');

  // Restaurar selección guardada (se pierde cuando se abre el color picker)
  editor.focus();
  if (savedRange) {
    try {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedRange);
      savedRange = null;
    } catch(e) { /* range inválido, ignorar */ }
  }

  document.execCommand('foreColor', false, color);

  // Actualizar indicador visual del botón
  const indicator = document.getElementById('color-indicator');
  const preview   = document.getElementById('color-preview-text');
  if (indicator) indicator.style.background = color;
  if (preview)   preview.style.color = color;

  triggerSave();
}

// ============================================================
// MANEJO DE CURSOR — guardar/restaurar posición
// ============================================================

// Guardar cursor cuando el editor pierde el foco (blur)
// Se llama automáticamente, también manualmente antes de abrir diálogos
function saveCursorPosition() {
  const editor = document.getElementById('diary-editor');
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    // Solo guardar si la selección está dentro del editor
    if (editor.contains(range.commonAncestorContainer) ||
        editor === range.commonAncestorContainer) {
      savedRange = range.cloneRange();
    }
  }
}

function restoreCursorAndFocus() {
  const editor = document.getElementById('diary-editor');
  editor.focus();
  if (savedRange) {
    try {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedRange);
    } catch(e) {
      // Si el range ya no es válido, posicionar al final
      placeCursorAtEnd(editor);
    }
    savedRange = null;
  }
}

function placeCursorAtEnd(editor) {
  const range = document.createRange();
  range.selectNodeContents(editor);
  range.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

// ============================================================
// EMOJI PICKER
// ============================================================
function renderEmojiGrid(category) {
  const grid = document.getElementById('emoji-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const emojis = EMOJI_DATA[category] || [];
  emojis.forEach(emoji => {
    const btn = document.createElement('button');
    btn.className = 'emoji-item';
    btn.textContent = emoji;
    btn.type = 'button';
    // mousedown en vez de click para que se dispare ANTES del blur del editor
    btn.addEventListener('mousedown', e => {
      e.preventDefault(); // Evitar que el editor pierda el foco
      insertEmoji(emoji);
    });
    grid.appendChild(btn);
  });
}

function insertEmoji(emoji) {
  // Cerrar el picker
  document.getElementById('emoji-picker').classList.add('hidden');

  const editor = document.getElementById('diary-editor');

  // Si el editor ya tiene foco, insertar directamente con execCommand
  if (document.activeElement === editor) {
    document.execCommand('insertText', false, emoji);
  } else {
    // Restaurar cursor guardado y luego insertar
    editor.focus();
    if (savedRange) {
      try {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(savedRange);
        savedRange = null;
      } catch(e) {
        placeCursorAtEnd(editor);
      }
    }
    document.execCommand('insertText', false, emoji);
  }

  triggerSave();
  resetActivity();
}

function filterEmojis(query) {
  const allEmojis = Object.values(EMOJI_DATA).flat();
  const grid = document.getElementById('emoji-grid');
  grid.innerHTML = '';
  allEmojis.forEach(emoji => {
    const btn = document.createElement('button');
    btn.className = 'emoji-item';
    btn.textContent = emoji;
    btn.type = 'button';
    btn.addEventListener('mousedown', e => {
      e.preventDefault();
      insertEmoji(emoji);
    });
    grid.appendChild(btn);
  });
}

// ============================================================
// INSERTAR IMAGEN EN CAPA FLOTANTE (posición libre)
// ============================================================
async function insertImageInEditor(file) {
  if (!file) return;
  if (!file.type.match('image/(png|jpeg|jpg)')) {
    alert('Solo se permiten imágenes PNG o JPG 🖼️');
    return;
  }
  setSaveStatus('saving', '🖼️ Procesando imagen...');
  try {
    const compressed = await compressImage(file, 1200, 0.82);
    const layer = document.getElementById('images-layer');
    const lw = layer ? layer.offsetWidth  : 400;
    const lh = layer ? layer.offsetHeight : 400;
    const left = Math.max(80, (lw / 2) - 130 + (Math.random() * 60 - 30));
    const top  = Math.max(20, (lh / 4)        + (Math.random() * 40 - 20));
    addImageToLayer(compressed, left, top, 260);
    setSaveStatus('saved', '✅ Imagen insertada — arrástrala donde quieras 🖼️');
    triggerSave();
  } catch (err) {
    console.error('Error insertando imagen:', err);
    setSaveStatus('error', '❌ Error al insertar imagen');
    alert('Error al procesar la imagen. Intenta con una imagen más pequeña.');
  }
}

// Agrega un bloque imagen a la capa flotante
function addImageToLayer(src, left, top, width) {
  const layer = document.getElementById('images-layer');
  if (!layer) return null;

  const block = document.createElement('div');
  block.className = 'img-block';
  block.style.left  = (left  || 80) + 'px';
  block.style.top   = (top   || 20) + 'px';

  const img = document.createElement('img');
  img.src = src;
  img.style.width = (width || 260) + 'px';
  img.setAttribute('data-width', (width || 260));
  img.draggable = false;

  // Botón eliminar
  const delBtn = document.createElement('button');
  delBtn.className = 'img-block-delete';
  delBtn.title = 'Eliminar imagen';
  delBtn.textContent = '✕';
  delBtn.addEventListener('mousedown', e => e.stopPropagation());
  delBtn.addEventListener('click', e => {
    e.stopPropagation();
    if (confirm('¿Eliminar esta imagen? 🗑️')) {
      block.remove();
      triggerSave();
    }
  });

  // Handle de resize
  const resizeHandle = document.createElement('div');
  resizeHandle.className = 'img-block-resize';
  resizeHandle.title = 'Redimensionar';
  setupResizeHandle(resizeHandle, img);

  block.appendChild(img);
  block.appendChild(delBtn);
  block.appendChild(resizeHandle);
  layer.appendChild(block);

  // Selección al hacer clic
  block.addEventListener('mousedown', e => {
    if (e.target === delBtn || e.target === resizeHandle) return;
    selectImgBlock(block);
  });

  // Arrastre libre
  setupBlockDrag(block);
  // Pinch resize móvil
  setupPinchResize(img);

  return block;
}

// Selecciona un bloque
function selectImgBlock(block) {
  document.querySelectorAll('.img-block.selected').forEach(b => b.classList.remove('selected'));
  block.classList.add('selected');
  selectedImage = block.querySelector('img');
}

// ============================================================
// DRAG LIBRE — acumula offsetLeft/offsetTop correctamente
// ============================================================
function setupBlockDrag(block) {
  let dragging = false;
  let startMouseX, startMouseY, startLeft, startTop;

  block.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    if (e.target.classList.contains('img-block-delete') ||
        e.target.classList.contains('img-block-resize')) return;
    dragging    = true;
    startMouseX = e.clientX;
    startMouseY = e.clientY;
    // Leer posición actual del bloque como punto de partida
    startLeft   = parseInt(block.style.left) || 0;
    startTop    = parseInt(block.style.top)  || 0;
    block.style.cursor = 'grabbing';
    e.preventDefault();
    e.stopPropagation();
  });

  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const layer   = document.getElementById('images-layer');
    const dx      = e.clientX - startMouseX;
    const dy      = e.clientY - startMouseY;
    const newLeft = startLeft + dx;
    const newTop  = startTop  + dy;
    const maxLeft = layer ? layer.offsetWidth  - block.offsetWidth  : 9999;
    const maxTop  = layer ? layer.offsetHeight - block.offsetHeight : 9999;
    block.style.left = Math.max(0, Math.min(maxLeft, newLeft)) + 'px';
    block.style.top  = Math.max(0, Math.min(maxTop,  newTop))  + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (dragging) {
      dragging = false;
      block.style.cursor = 'grab';
      triggerSave();
    }
  });

  // Touch drag
  block.addEventListener('touchstart', e => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    dragging    = true;
    startMouseX = t.clientX;
    startMouseY = t.clientY;
    startLeft   = parseInt(block.style.left) || 0;
    startTop    = parseInt(block.style.top)  || 0;
  }, { passive: true });

  block.addEventListener('touchmove', e => {
    if (!dragging || e.touches.length !== 1) return;
    const t     = e.touches[0];
    const layer = document.getElementById('images-layer');
    const dx    = t.clientX - startMouseX;
    const dy    = t.clientY - startMouseY;
    const maxLeft = layer ? layer.offsetWidth  - block.offsetWidth  : 9999;
    const maxTop  = layer ? layer.offsetHeight - block.offsetHeight : 9999;
    block.style.left = Math.max(0, Math.min(maxLeft, startLeft + dx)) + 'px';
    block.style.top  = Math.max(0, Math.min(maxTop,  startTop  + dy)) + 'px';
    e.preventDefault();
  }, { passive: false });

  block.addEventListener('touchend', () => {
    if (dragging) { dragging = false; triggerSave(); }
  });
}

// Resize arrastrando esquina inferior derecha
function setupResizeHandle(handle, img) {
  let resizing = false;
  let startX, startWidth;

  handle.addEventListener('mousedown', e => {
    e.stopPropagation();
    e.preventDefault();
    resizing   = true;
    startX     = e.clientX;
    startWidth = parseInt(img.getAttribute('data-width')) || img.offsetWidth || 260;
  });

  document.addEventListener('mousemove', e => {
    if (!resizing) return;
    const newW = Math.max(60, Math.min(700, startWidth + (e.clientX - startX)));
    img.style.width = newW + 'px';
    img.setAttribute('data-width', newW);
  });

  document.addEventListener('mouseup', () => {
    if (resizing) { resizing = false; triggerSave(); }
  });
}

// Serializa imágenes flotantes para Firestore
function getImagesData() {
  const layer = document.getElementById('images-layer');
  if (!layer) return [];
  return Array.from(layer.querySelectorAll('.img-block')).map(block => {
    const img = block.querySelector('img');
    return {
      src:   img.src,
      left:  parseInt(block.style.left) || 0,
      top:   parseInt(block.style.top)  || 0,
      width: parseInt(img.getAttribute('data-width')) || 260
    };
  });
}

// Reconstruye imágenes flotantes al cargar una entrada
function restoreImages(imagesData) {
  const layer = document.getElementById('images-layer');
  if (!layer) return;
  layer.innerHTML = '';
  if (!imagesData || !imagesData.length) return;
  imagesData.forEach(d => addImageToLayer(d.src, d.left, d.top, d.width));
}

// Redimensiona la imagen seleccionada (usada por el panel de controles)
function resizeSelectedImage(delta) {
  if (!selectedImage) return;
  let current = parseInt(selectedImage.getAttribute('data-width') || selectedImage.offsetWidth) + delta;
  current = Math.max(60, Math.min(700, current));
  selectedImage.style.width = current + 'px';
  selectedImage.setAttribute('data-width', current);
  triggerSave();
}

// Elimina la imagen seleccionada (usada por el panel de controles)
function deleteSelectedImage() {
  if (!selectedImage) return;
  const block = selectedImage.closest ? selectedImage.closest('.img-block') : selectedImage.parentNode;
  if (block && confirm('¿Eliminar esta imagen? 🗑️')) {
    block.remove();
    selectedImage = null;
    triggerSave();
  }
}

// Las imágenes flotantes no usan alineación float; esta función es un no-op
function alignSelectedImage(align) { /* no aplica en modo capa flotante */ }

function compressImage(file, maxWidth, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// (funciones de imagen migradas al nuevo sistema de capa flotante arriba)

// Pinch to resize (touch)
function setupPinchResize(img) {
  let initialDist = null;
  let initialWidth = null;

  img.addEventListener('touchstart', e => {
    if (e.touches.length === 2) {
      initialDist = getPinchDist(e.touches);
      initialWidth = parseInt(img.getAttribute('data-width') || img.offsetWidth);
      e.preventDefault();
    }
  }, { passive: false });

  img.addEventListener('touchmove', e => {
    if (e.touches.length === 2 && initialDist) {
      const dist = getPinchDist(e.touches);
      const scale = dist / initialDist;
      let newWidth = Math.round(initialWidth * scale);
      newWidth = Math.max(50, Math.min(900, newWidth));
      img.style.width = newWidth + 'px';
      img.setAttribute('data-width', newWidth);
      e.preventDefault();
    }
  }, { passive: false });

  img.addEventListener('touchend', e => {
    if (e.touches.length < 2) {
      initialDist = null;
      triggerSave();
    }
  });
}

function getPinchDist(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}


// ============================================================
// CALENDARIO
// ============================================================
let currentQNPDate = null;

function renderCalendar(year, month) {
  calendarDate = new Date(year, month, 1);
  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  document.getElementById('cal-month-title').textContent = months[month] + ' ' + year;

  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';

  const firstDay     = new Date(year, month, 1).getDay();
  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const today = formatDate(new Date());

  // Cargar entradas del diario Y notas rápidas en paralelo
  Promise.all([
    loadMonthEntries(year, month),
    loadMonthQuickNotes(year, month)
  ]).then(([entriesDates, quickNoteDates]) => {
    grid.innerHTML = '';

    // Días del mes anterior
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = document.createElement('div');
      day.className = 'cal-day other-month';
      day.textContent = daysInPrevMonth - i;
      grid.appendChild(day);
    }

    // Días del mes actual
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const day = document.createElement('div');
      day.className = 'cal-day';
      day.textContent = d;
      day.setAttribute('data-date', dateStr);
      if (dateStr === today)                   day.classList.add('today');
      if (entriesDates.includes(dateStr))      day.classList.add('has-entry');
      if (quickNoteDates.includes(dateStr))    day.classList.add('has-quick-note');

      // Click: abrir panel de notas rápidas
      day.addEventListener('click', () => openQuickNotePanel(dateStr));
      grid.appendChild(day);
    }

    // Días del mes siguiente
    const total     = firstDay + daysInMonth;
    const remaining = total % 7 === 0 ? 0 : 7 - (total % 7);
    for (let d = 1; d <= remaining; d++) {
      const day = document.createElement('div');
      day.className = 'cal-day other-month';
      day.textContent = d;
      grid.appendChild(day);
    }
  });
}

async function loadMonthEntries(year, month) {
  if (!currentUser) return [];
  try {
    const startDate = `${year}-${String(month+1).padStart(2,'0')}-01`;
    const endDate   = `${year}-${String(month+1).padStart(2,'0')}-31`;
    const snap = await db.collection('users').doc(currentUser.uid)
      .collection('entries')
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .get();
    return snap.docs.map(d => d.id);
  } catch (err) {
    console.error('Error cargando entradas del mes:', err);
    return [];
  }
}

async function loadMonthQuickNotes(year, month) {
  if (!currentUser) return [];
  try {
    const startDate = `${year}-${String(month+1).padStart(2,'0')}-01`;
    const endDate   = `${year}-${String(month+1).padStart(2,'0')}-31`;
    const snap = await db.collection('users').doc(currentUser.uid)
      .collection('quick-notes')
      .where(firebase.firestore.FieldPath.documentId(), '>=', startDate)
      .where(firebase.firestore.FieldPath.documentId(), '<=', endDate)
      .get();
    return snap.docs.filter(d => (d.data().notes || []).length > 0).map(d => d.id);
  } catch (err) { return []; }
}

// ============================================================
// NOTAS RÁPIDAS DEL CALENDARIO
// ============================================================
async function openQuickNotePanel(dateStr) {
  currentQNPDate = dateStr;
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj  = new Date(y, m - 1, d);
  const display  = dateObj.toLocaleDateString('es-ES', {
    weekday:'long', day:'numeric', month:'long', year:'numeric'
  });
  document.getElementById('qnp-date-title').textContent =
    display.charAt(0).toUpperCase() + display.slice(1);
  document.getElementById('quick-note-panel').classList.remove('hidden');
  document.getElementById('qnp-input').value = '';
  await renderQuickNotes(dateStr);
  setTimeout(() => document.getElementById('qnp-input').focus(), 350);
}

function closeQuickNotePanel() {
  document.getElementById('quick-note-panel').classList.add('hidden');
  currentQNPDate = null;
}

async function renderQuickNotes(dateStr) {
  const listEl = document.getElementById('qnp-notes-list');
  listEl.innerHTML = '<div class="qnp-empty">⏳ Cargando...</div>';
  try {
    const snap = await db.collection('users').doc(currentUser.uid)
      .collection('quick-notes').doc(dateStr).get();
    const notes = snap.exists ? (snap.data().notes || []) : [];
    if (notes.length === 0) {
      listEl.innerHTML = '<div class="qnp-empty">Sin notas aún ✨<br>Agrega una nota rápida abajo 📝</div>';
      return;
    }
    listEl.innerHTML = '';
    notes.forEach((note, index) => {
      const item = document.createElement('div');
      item.className = 'qnp-note-item';
      item.innerHTML = `
        <span class="qnp-note-text">📌 ${note}</span>
        <button class="qnp-note-delete" title="Eliminar">✕</button>
      `;
      item.querySelector('.qnp-note-delete')
          .addEventListener('click', () => deleteQuickNote(dateStr, index));
      listEl.appendChild(item);
    });
  } catch(err) {
    listEl.innerHTML = '<div class="qnp-empty" style="color:#e74c3c;">⚠️ Error cargando notas</div>';
  }
}

async function addQuickNote() {
  const input = document.getElementById('qnp-input');
  const note  = input.value.trim();
  if (!note || !currentQNPDate || !currentUser) return;
  const btn = document.getElementById('qnp-add-btn');
  btn.disabled = true;
  try {
    const docRef = db.collection('users').doc(currentUser.uid)
      .collection('quick-notes').doc(currentQNPDate);
    const snap  = await docRef.get();
    const notes = snap.exists ? (snap.data().notes || []) : [];
    notes.push(note);
    await docRef.set({ notes, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    input.value = '';
    await renderQuickNotes(currentQNPDate);
    // Marcar el día en el calendario con el punto lila
    const dayEl = document.querySelector(`.cal-day[data-date="${currentQNPDate}"]`);
    if (dayEl) dayEl.classList.add('has-quick-note');
  } catch(err) {
    console.error('Error guardando nota:', err);
  } finally {
    btn.disabled = false;
    input.focus();
  }
}

async function deleteQuickNote(dateStr, index) {
  if (!currentUser) return;
  try {
    const docRef = db.collection('users').doc(currentUser.uid)
      .collection('quick-notes').doc(dateStr);
    const snap  = await docRef.get();
    if (!snap.exists) return;
    const notes = snap.data().notes || [];
    notes.splice(index, 1);
    await docRef.set({ notes, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    await renderQuickNotes(dateStr);
    if (notes.length === 0) {
      const dayEl = document.querySelector(`.cal-day[data-date="${dateStr}"]`);
      if (dayEl) dayEl.classList.remove('has-quick-note');
    }
  } catch(err) {
    console.error('Error eliminando nota:', err);
  }
}

// ============================================================
// PORTADA
// ============================================================
async function loadCoverData() {
  if (!currentUser) return;
  try {
    const snap = await db.collection('users').doc(currentUser.uid).collection('profile').doc('cover').get();
    if (snap.exists) {
      const data = snap.data();
      if (data.name)     document.getElementById('cover-name').value     = data.name;
      if (data.birthday) document.getElementById('cover-birthday').value  = data.birthday;
      if (data.phrase)   document.getElementById('cover-phrase').value    = data.phrase;
      if (data.about)    document.getElementById('cover-about').value     = data.about;
      if (data.photoURL) {
        document.getElementById('cover-photo').src  = data.photoURL;
        document.getElementById('menu-avatar').src  = data.photoURL;
      }
      if (data.name) document.getElementById('menu-name').textContent = data.name + ' 🌸';
    }
  } catch (err) {
    console.error('Error cargando portada:', err);
  }
}

async function loadCoverDataForMenu() {
  if (!currentUser) return;
  try {
    const snap = await db.collection('users').doc(currentUser.uid).collection('profile').doc('cover').get();
    if (snap.exists) {
      const data = snap.data();
      if (data.photoURL) document.getElementById('menu-avatar').src = data.photoURL;
      if (data.name)     document.getElementById('menu-name').textContent = data.name + ' 🌸';
    }
  } catch (err) {
    // No crítico
  }
}

async function saveCoverData() {
  if (!currentUser) return;
  const name     = document.getElementById('cover-name').value.trim();
  const birthday = document.getElementById('cover-birthday').value;
  const phrase   = document.getElementById('cover-phrase').value.trim();
  const about    = document.getElementById('cover-about').value.trim();

  try {
    await db.collection('users').doc(currentUser.uid).collection('profile').doc('cover').set({
      name, birthday, phrase, about,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    if (name) {
      document.getElementById('menu-name').textContent = name + ' 🌸';
    }
    alert('✅ ¡Portada guardada! 🌸💜');
  } catch (err) {
    alert('❌ Error guardando la portada: ' + err.message);
  }
}

async function handleCoverPhotoUpload(file) {
  if (!file || !currentUser) return;
  try {
    const compressed = await compressImage(file, 400, 0.85);
    // Guardar foto como base64 en Firestore (tamaño razonable para foto de perfil)
    await db.collection('users').doc(currentUser.uid).collection('profile').doc('cover').set({
      photoURL: compressed,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    document.getElementById('cover-photo').src  = compressed;
    document.getElementById('menu-avatar').src  = compressed;
    alert('✅ ¡Foto actualizada! 📷🌸');
  } catch (err) {
    alert('❌ Error actualizando la foto: ' + err.message);
  }
}

// ============================================================
// CAMBIAR CONTRASEÑA
// ============================================================
async function handleChangePassword() {
  const current  = document.getElementById('current-password').value;
  const newPwd   = document.getElementById('new-password').value;
  const confirm  = document.getElementById('confirm-password').value;
  const msgEl    = document.getElementById('settings-msg');

  msgEl.className = 'info-msg';
  msgEl.classList.remove('hidden');

  if (!current || !newPwd || !confirm) {
    msgEl.textContent = '⚠️ Completa todos los campos';
    msgEl.classList.add('error');
    return;
  }
  if (newPwd !== confirm) {
    msgEl.textContent = '⚠️ Las contraseñas no coinciden';
    msgEl.classList.add('error');
    return;
  }
  if (newPwd.length < 6) {
    msgEl.textContent = '⚠️ La contraseña debe tener al menos 6 caracteres';
    msgEl.classList.add('error');
    return;
  }

  try {
    await doChangePassword(current, newPwd);
    msgEl.textContent = '✅ ¡Contraseña cambiada exitosamente! 🔑';
    msgEl.classList.add('success');
    document.getElementById('current-password').value = '';
    document.getElementById('new-password').value     = '';
    document.getElementById('confirm-password').value = '';
  } catch (err) {
    let msg = '❌ Error: ';
    if (err.code === 'auth/wrong-password') msg += 'Contraseña actual incorrecta';
    else if (err.code === 'auth/weak-password') msg += 'La nueva contraseña es muy débil';
    else msg += err.message;
    msgEl.textContent = msg;
    msgEl.classList.add('error');
  }
}

// ============================================================
// CONFIGURAR TODOS LOS EVENTOS
// ============================================================
function setupAllListeners() {

  // ——— Login ———
  document.getElementById('login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const btn      = document.getElementById('login-btn');
    const errEl    = document.getElementById('login-error');
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    if (!username || !password) return;

    btn.textContent = '⏳ Entrando...';
    btn.disabled = true;
    errEl.classList.add('hidden');

    try {
      await doLogin(username, password);
    } catch (err) {
      let msg = '❌ ';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential')
        msg += 'Usuario o contraseña incorrectos 🔒';
      else if (err.code === 'auth/too-many-requests')
        msg += 'Demasiados intentos. Intenta más tarde ⏳';
      else if (err.code === 'auth/network-request-failed')
        msg += 'Sin conexión a internet 📡';
      else
        msg += err.message;

      errEl.textContent = msg;
      errEl.classList.remove('hidden');
    } finally {
      btn.textContent = '✨ Entrar a mi agenda';
      btn.disabled = false;
    }
  });

  // Toggle visibilidad de contraseña
  document.getElementById('toggle-password').addEventListener('click', () => {
    const input = document.getElementById('login-password');
    const btn   = document.getElementById('toggle-password');
    if (input.type === 'password') { input.type = 'text';     btn.textContent = '🙈'; }
    else                           { input.type = 'password'; btn.textContent = '👁️'; }
  });

  // ——— Navegación ———
  document.getElementById('btn-menu').addEventListener('click', () => {
    const menu = document.getElementById('side-menu');
    menu.classList.contains('open') ? closeSideMenu() : openSideMenu();
  });
  document.getElementById('menu-overlay').addEventListener('click', closeSideMenu);

  document.getElementById('btn-today').addEventListener('click', () => {
    currentDate = new Date();
    updateDateDisplay();
    loadDiaryEntry(formatDate(currentDate));
    showScreen('diary');
  });

  // Ítems del menú lateral
  document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      showScreen(item.dataset.screen);
    });
  });

  // (barra inferior eliminada — navegación solo desde menú lateral)

  // ——— Logout ———
  document.getElementById('btn-logout').addEventListener('click', () => {
    if (confirm('¿Cerrar sesión? 🚪')) doLogout();
  });
  document.getElementById('settings-logout-btn').addEventListener('click', () => {
    if (confirm('¿Cerrar sesión? 🚪')) doLogout();
  });

  // ——— Navegación de Fecha ———
  document.getElementById('prev-day').addEventListener('click', () => {
    currentDate.setDate(currentDate.getDate() - 1);
    updateDateDisplay();
    loadDiaryEntry(formatDate(currentDate));
    resetActivity();
  });
  document.getElementById('next-day').addEventListener('click', () => {
    currentDate.setDate(currentDate.getDate() + 1);
    updateDateDisplay();
    loadDiaryEntry(formatDate(currentDate));
    resetActivity();
  });
  document.getElementById('date-display-label').addEventListener('click', () => {
    document.getElementById('diary-date-picker').showPicker
      ? document.getElementById('diary-date-picker').showPicker()
      : document.getElementById('diary-date-picker').click();
  });
  document.getElementById('diary-date-picker').addEventListener('change', e => {
    const [y, m, d] = e.target.value.split('-').map(Number);
    currentDate = new Date(y, m - 1, d);
    updateDateDisplay();
    loadDiaryEntry(e.target.value);
    resetActivity();
  });

  // ——— Editor de Texto ———
  const editor = document.getElementById('diary-editor');

  editor.addEventListener('input', () => {
    resetActivity();
    triggerSave();
  });

  editor.addEventListener('keydown', e => {
    resetActivity();
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b') { e.preventDefault(); execFormat('bold'); }
      if (e.key === 'i') { e.preventDefault(); execFormat('italic'); }
      if (e.key === 'u') { e.preventDefault(); execFormat('underline'); }
      if (e.key === 's') { e.preventDefault(); saveDiaryEntry(formatDate(currentDate), editor.innerHTML); }
    }
  });

  // *** CLAVE: guardar posición del cursor cuando el editor pierde el foco ***
  editor.addEventListener('blur', () => {
    saveCursorPosition();
  });

  editor.addEventListener('click',      resetActivity);
  editor.addEventListener('touchstart', resetActivity, { passive: true });
  editor.addEventListener('scroll',     resetActivity, { passive: true });

  // Evitar comportamiento drag nativo del editor sobre imágenes
  editor.addEventListener('dragover', e => e.preventDefault());
  editor.addEventListener('drop', e => {
    if (e.dataTransfer.files.length) {
      e.preventDefault();
      insertImageInEditor(e.dataTransfer.files[0]);
    }
  });

  // Deseleccionar imagen al hacer click fuera
  document.addEventListener('click', e => {
    const inBlock = e.target.closest && e.target.closest('.img-block');
    const inPanel = document.getElementById('image-controls-panel').contains(e.target);
    if (!inBlock && !inPanel) {
      document.querySelectorAll('.img-block.selected').forEach(b => b.classList.remove('selected'));
      document.getElementById('image-controls-panel').classList.add('hidden');
      selectedImage = null;
    }
    resetActivity();
  });

  // Barra de herramientas — Formato
  document.getElementById('btn-bold').addEventListener('click',      () => { execFormat('bold');      resetActivity(); });
  document.getElementById('btn-italic').addEventListener('click',    () => { execFormat('italic');    resetActivity(); });
  document.getElementById('btn-underline').addEventListener('click', () => { execFormat('underline'); resetActivity(); });

  document.querySelectorAll('[data-cmd]').forEach(btn => {
    btn.addEventListener('click', () => { execFormat(btn.dataset.cmd); resetActivity(); });
  });

  document.getElementById('font-family-picker').addEventListener('change', e => {
    applyFontFamily(e.target.value);
    resetActivity();
  });
  document.getElementById('font-size-picker').addEventListener('change', e => {
    applyFontSize(e.target.value);
    resetActivity();
  });

  // Color de letra — guardar selección ANTES de abrir el picker
  const colorBox = document.querySelector('.color-preview-box');
  if (colorBox) {
    colorBox.addEventListener('mousedown', e => {
      e.preventDefault();           // no quitar foco del editor
      saveCursorPosition();         // guardar cursor/selección
      document.getElementById('text-color-picker').click();
    });
  }
  // También el label completo
  const colorLabel = document.querySelector('.toolbar-color-label');
  if (colorLabel) {
    colorLabel.addEventListener('mousedown', e => {
      saveCursorPosition();
    });
  }

  document.getElementById('text-color-picker').addEventListener('input', e => {
    applyTextColor(e.target.value);
    resetActivity();
  });
  document.getElementById('text-color-picker').addEventListener('change', e => {
    applyTextColor(e.target.value);
  });

  // Subir imagen — guardar cursor ANTES de abrir diálogo de archivo
  const imageLabel = document.querySelector('label.tb-insert');
  if (imageLabel) {
    imageLabel.addEventListener('mousedown', () => {
      saveCursorPosition();    // guardar cursor antes de que se pierda
    });
  }

  document.getElementById('image-upload').addEventListener('change', e => {
    if (e.target.files[0]) {
      insertImageInEditor(e.target.files[0]);
      e.target.value = '';
      resetActivity();
    }
  });

  // ——— Controles de imagen ———
  document.getElementById('img-smaller').addEventListener('click', () => { resizeSelectedImage(-50); resetActivity(); });
  document.getElementById('img-larger').addEventListener('click',  () => { resizeSelectedImage(+50); resetActivity(); });
  document.getElementById('img-left').addEventListener('click',    () => { alignSelectedImage('left');   resetActivity(); });
  document.getElementById('img-center').addEventListener('click',  () => { alignSelectedImage('center'); resetActivity(); });
  document.getElementById('img-right').addEventListener('click',   () => { alignSelectedImage('right');  resetActivity(); });
  document.getElementById('img-delete').addEventListener('click',  () => { deleteSelectedImage();        resetActivity(); });

  // ——— Emoji Picker ———
  document.getElementById('btn-emoji').addEventListener('mousedown', e => {
    e.preventDefault();           // evitar que el editor pierda el foco
    saveCursorPosition();         // guardar cursor ANTES de perder foco
  });
  document.getElementById('btn-emoji').addEventListener('click', e => {
    e.stopPropagation();
    const picker = document.getElementById('emoji-picker');
    picker.classList.toggle('hidden');
    resetActivity();
  });

  document.getElementById('emoji-search').addEventListener('input', e => {
    const q = e.target.value.trim();
    if (q) filterEmojis(q);
    else renderEmojiGrid(document.querySelector('.emoji-cat-btn.active')?.dataset.cat || 'smileys');
  });

  document.querySelectorAll('.emoji-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.emoji-cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('emoji-search').value = '';
      renderEmojiGrid(btn.dataset.cat);
    });
  });

  // Cerrar emoji picker al hacer click fuera
  document.addEventListener('click', e => {
    const picker = document.getElementById('emoji-picker');
    const emojiBtn = document.getElementById('btn-emoji');
    if (!picker.classList.contains('hidden') &&
        !picker.contains(e.target) && e.target !== emojiBtn) {
      picker.classList.add('hidden');
    }
  });

  // ——— Calendario ———
  document.getElementById('cal-prev-month').addEventListener('click', () => {
    calendarDate.setMonth(calendarDate.getMonth() - 1);
    renderCalendar(calendarDate.getFullYear(), calendarDate.getMonth());
    resetActivity();
  });
  document.getElementById('cal-next-month').addEventListener('click', () => {
    calendarDate.setMonth(calendarDate.getMonth() + 1);
    renderCalendar(calendarDate.getFullYear(), calendarDate.getMonth());
    resetActivity();
  });

  // ——— Portada ———
  document.getElementById('save-cover-btn').addEventListener('click', () => {
    saveCoverData();
    resetActivity();
  });
  document.getElementById('cover-photo-input').addEventListener('change', e => {
    if (e.target.files[0]) {
      handleCoverPhotoUpload(e.target.files[0]);
      e.target.value = '';
    }
    resetActivity();
  });

  // ——— Configuración ———
  document.getElementById('change-password-btn').addEventListener('click', () => {
    handleChangePassword();
    resetActivity();
  });

  // ——— Panel Notas Rápidas ———
  document.getElementById('qnp-close').addEventListener('click', closeQuickNotePanel);
  document.getElementById('qnp-backdrop').addEventListener('click', closeQuickNotePanel);
  document.getElementById('qnp-add-btn').addEventListener('click', addQuickNote);
  document.getElementById('qnp-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') addQuickNote();
  });
  document.getElementById('qnp-open-diary').addEventListener('click', () => {
    if (currentQNPDate) {
      const [y, m, d] = currentQNPDate.split('-').map(Number);
      currentDate = new Date(y, m - 1, d);
      updateDateDisplay();
      loadDiaryEntry(currentQNPDate);
      showScreen('diary');
      closeQuickNotePanel();
    }
  });

  // ——— Diálogo de Auto-Logout ———
  document.getElementById('btn-continue-session').addEventListener('click', () => {
    hideLogoutDialog();
    resetActivity();
  });
  document.getElementById('btn-end-session').addEventListener('click', () => {
    doLogout();
  });

  // Cualquier interacción del usuario resetea la actividad
  ['mousemove','mousedown','keydown','touchstart','scroll'].forEach(event => {
    document.addEventListener(event, resetActivity, { passive: true });
  });
}

// ============================================================
// FIN DEL SCRIPT 🌸
// ============================================================
console.log('🌸 Mi Agenda Virtual — Cargada con amor 💜');
