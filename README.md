# InvenAI — Smart Inventory System

Sistema de inventario inteligente con IA (OpenRouter), escaneo de códigos y detección de equipos por foto.

## Stack

- **Backend:** Node.js 24 + Express + SQLite (`node:sqlite` built-in)
- **Frontend:** React 18 + Vite + TailwindCSS + shadcn/ui
- **IA:** OpenRouter (GPT-4o-mini por defecto)
- **Base de datos:** SQLite local (sin servidor externo)

## Inicio Rápido

### 1. Configurar OpenRouter (para funciones de IA)

Edita `backend/.env` y reemplaza la API key:
```
OPENROUTER_API_KEY=sk-or-v1-tu-clave-aqui
```
Obtén tu clave gratis en https://openrouter.ai

### 2. Iniciar la aplicación

**Opción A — Script automático (PowerShell):**
```powershell
.\start.ps1
```

**Opción B — Manual (dos terminales):**

Terminal 1 - Backend:
```powershell
cd backend
node server.js
```

Terminal 2 - Frontend:
```powershell
cd frontend
npm run dev
```

### 3. Abrir en el navegador
```
http://localhost:5173
```

**Usuario demo:** `admin@inventario.com` / `admin123`

---

## Funcionalidades

| Feature | Descripción |
|---------|-------------|
| **Entrada** | Registra equipos. Toma una foto y la IA rellena los campos automáticamente |
| **Salida** | Da salida por identificador (service tag, activo fijo, serie), por foto, o por escáner QR/barras |
| **Escáner** | Compatible con escáneres USB (actúan como teclado) y cámara (QR/barras) |
| **Búsqueda IA** | Búsqueda difusa — escribe parte del nombre y la IA encuentra el dispositivo |
| **Dashboard** | Alertas de stock bajo, actividad reciente |
| **Órdenes de Compra** | Generación automática cuando el stock baja del mínimo |
| **Historial** | Log completo de entradas y salidas con exportación CSV |
| **Departamentos** | Organiza el inventario por departamento |
| **Categorías** | Define categorías con stock mínimo, activo fijo, y ID único |

## Estructura del proyecto

```
Inventario_Inteligente/
├── backend/
│   ├── server.js          # Entry point
│   ├── db/database.js     # SQLite schema + seed
│   ├── routes/            # auth, inventory, departments, categories, logs, purchaseOrders, ai, upload
│   ├── middleware/        # JWT auth, error handler
│   ├── data/              # SQLite database (auto-creado)
│   └── uploads/           # Imágenes subidas (auto-creado)
├── frontend/
│   ├── src/
│   │   ├── pages/         # Dashboard, Inventory, Entry, Checkout, etc.
│   │   ├── components/    # UI components, Layout, Sidebar, Camera
│   │   ├── api/           # Axios client
│   │   └── context/       # AuthContext
│   └── vite.config.js     # Proxy /api → backend
└── start.ps1              # Inicia ambos servidores
```

## Escáner de Códigos

- **USB/Bluetooth scanner:** Conecta el escáner, ve a Salida → busca con "Con Identificador", y escanea directamente en el campo. El escáner actúa como teclado y dispara la búsqueda con Enter.
- **Cámara (QR/Barras):** Presiona "Escaneo Rápido" en la página de Salida para activar la cámara.

## Variables de Entorno

```env
PORT=3001
FRONTEND_URL=http://localhost:5173
JWT_SECRET=tu_secreto_jwt_largo_y_seguro
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=openai/gpt-4o-mini   # o cualquier modelo con visión
```
