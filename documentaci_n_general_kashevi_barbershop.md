# 💈 KASHEVI BARBERSHOP — Sistema Web de Citas y Gestión

## 1. Análisis General del Proyecto

### 1.1 Visión del Producto
**Kashevi Barbershop** es una plataforma web tipo *One-Page* con estética editorial oscuro/dorado (`#000000` / `#F3ECA2`) orientada a proyectar una marca premium, artesanal y moderna, integrada con un **motor transaccional de reservas en tiempo real**.

El recorrido del usuario sigue la narrativa exacta del diseño visual:
`Hero ("Transformemos tu cabello")` $\rightarrow$ `Nosotros` $\rightarrow$ `Servicios (+ DETALLES)` $\rightarrow$ `Ritual (R-I-T-U-A-L)` $\rightarrow$ `Testimonios ("Nuestra Prioridad")` $\rightarrow$ `Ubicación y CTA ("¿Nos vemos frente al espejo?")` $\rightarrow$ `Agenda (Confirmación por WhatsApp)`.

Adicionalmente incluye un **Panel Administrativo (`/admin.html`)** protegido mediante autenticación para gestionar el estado de las citas, filtrar por fecha o barbero y registrar bloqueos manuales de horario.

---

### 1.2 Stack Tecnológico Confirmado
* **Frontend:** HTML5 semántico, CSS3 modular (variables de diseño, Grid, Flexbox, `clip-path` diagonal y máscaras orgánicas), JavaScript ES6+ puro (`Fetch API`, validación en tiempo real y carrusel accesible).
* **Backend:** Node.js + Express (`API REST` organizada en capas: rutas, servicios de dominio y repositorios).
* **Seguridad Admin:** Autenticación basada en tokens firmados (`HMAC-SHA256` nativo con `crypto`) y hash de contraseñas con `bcryptjs`.
* **Base de Datos:** MySQL / MariaDB ejecutándose en **XAMPP** (`127.0.0.1:3306`), conectado mediante `mysql2/promise` con *pool* de conexiones y transacciones `InnoDB`.

---

### 1.3 Reglas de Negocio
1. **Horario de atención:** Lunes a Sábado de **09:00 a 22:00** (Domingos cerrado).
2. **Capacidad del estudio (4 talentos):** Hasta **4 barberos/estilistas** atienden en paralelo. El cliente puede elegir *"Cualquier talento disponible"* (asignación automática) o seleccionar un barbero específico.
3. **Catálogo base de 4 servicios principales:**
   * **Corte de Cabello** (`45 min` — `S/ 35.00`)
   * **Tinte de Cabello** (`60 min` — `S/ 70.00`)
   * **Tratamientos Faciales** (`45 min` — `S/ 50.00`)
   * **Diseño de Barba, Ceja y Bigote** (`30 min` — `S/ 30.00`)
4. **Control estricto de disponibilidad y traslapes:**
   * Los intervalos disponibles se generan en pasos de **30 minutos** dentro de `[09:00, 22:00]`.
   * Ningún turno puede exceder las `22:00` (`hora_fin <= '22:00:00'`).
   * Si la fecha seleccionada es **hoy**, solo se habilitan horarios futuros con margen mínimo de anticipación.
   * No se permiten reservas sobre horarios con bloqueos manuales (`bloqueos_horario`) ni cuando todos los barberos elegibles ya tienen citas `pendiente` o `confirmada` traslapadas (`inicio_existente < fin_nuevo AND fin_existente > inicio_nuevo`).
   * La creación de la cita se ejecuta dentro de una **transacción MySQL (`BEGIN ... FOR UPDATE ... COMMIT`)** para evitar reservas dobles simultáneas.
5. **Confirmación por WhatsApp:** Al confirmarse en MySQL, el sistema genera un `codigo_reserva` único (ej. `KSH-20261124-0001`), muestra la tarjeta resumen y abre el enlace `https://wa.me/51907550557?text=...` con el detalle de la cita prellenado.

---

## 2. Arquitectura del Sistema (Capas)

```text
KASHEVI_BARBERSHOP/
├── public/                        # Capa de Presentación (estáticos servidos por Express)
│   ├── index.html                 # Sitio One-Page fiel al diseño PDF
│   ├── admin.html                 # Panel administrativo protegido
│   ├── css/
│   │   ├── tokens.css             # Paleta oscuro/dorado, tipografía y radios
│   │   ├── styles.css             # Estilos landing, modales, carrusel, agenda y responsive
│   │   └── admin.css              # Estilos del panel administrativo
│   ├── js/
│   │   ├── api.js                 # Cliente HTTP Fetch centralizado
│   │   ├── main.js                # Navegación, modal + DETALLES y carrusel Testimonios
│   │   ├── agenda.js              # Selector de fecha/barbero/slots y confirmación WhatsApp
│   │   └── admin.js               # Login admin, tabla de citas, cambios de estado y bloqueos
│   └── img/                       # Fotografías de barbería, servicios, ritual y testimonios
├── src/
│   ├── config/
│   │   ├── env.js                 # Configuración centralizada (.env) y constantes de negocio
│   │   └── db.js                  # Pool mysql2/promise apuntando a XAMPP MySQL
│   ├── middleware/
│   │   ├── authAdmin.js           # Verificación de token firmado para rutas /api/admin/*
│   │   └── errorHandler.js        # Manejo uniforme de errores HTTP/JSON
│   ├── repositories/              # Capa de Acceso a Datos (SQL parametrizado)
│   │   ├── catalogoRepository.js  # Servicios, barberos y testimonios
│   │   ├── citasRepository.js     # Consultas de ocupación, inserción atómica y CRUD admin
│   │   ├── bloqueosRepository.js  # Bloqueos manuales de horario
│   │   └── adminRepository.js     # Usuarios administradores
│   ├── services/                  # Capa de Lógica de Negocio (pura y testeable)
│   │   ├── timeUtils.js           # Conversión HH:MM <-> minutos, validaciones fecha/hora
│   │   └── agendaService.js       # Cálculo de slots libres, anti-traslape y asignación
│   └── routes/                    # Controladores HTTP / Endpoints REST
│       ├── publicRoutes.js        # GET /api/servicios, /barberos, /testimonios, /disponibilidad, POST /citas
│       └── adminRoutes.js         # POST /api/admin/login, GET/PATCH /citas, GET/POST/DELETE /bloqueos
├── scripts/
│   └── setup-db.js                # Script opcional para inicializar BD y crear admin en XAMPP
├── tests/
│   └── agendaService.test.js      # Pruebas unitarias de reglas de negocio (node --test)
├── sql/
│   └── kashevi_db.sql             # Script completo listo para importar en phpMyAdmin (XAMPP)
├── .env.example                   # Plantilla de variables de entorno
├── server.js                      # Punto de entrada del servidor Express
└── package.json                   # Dependencias y scripts npm
```

---

## 3. Modelo de Base de Datos (MySQL en XAMPP)

Base de datos: **`kashevi_barbershop`** (`utf8mb4_unicode_ci`, motor `InnoDB`).

1. **`servicios`**: `id`, `slug`, `nombre`, `descripcion_corta`, `descripcion_detalle`, `duracion_min`, `precio`, `imagen_url`, `activo`, `creado_en`.
2. **`barberos`**: `id`, `nombre`, `especialidad`, `foto_url`, `activo`, `creado_en`.
3. **`citas`**: `id`, `codigo_reserva`, `servicio_id` (FK), `barbero_id` (FK), `cliente_nombre`, `cliente_telefono`, `fecha`, `hora_inicio`, `hora_fin`, `notas`, `estado` (`pendiente`, `confirmada`, `completada`, `cancelada`), `creado_en`, `actualizado_en`.
4. **`testimonios`**: `id`, `cliente_nombre`, `edad`, `comentario`, `foto_url`, `orden`, `visible`, `creado_en`.
5. **`bloqueos_horario`**: `id`, `barbero_id` (FK nullable; `NULL` bloquea toda la barbería), `fecha`, `hora_inicio`, `hora_fin`, `motivo`, `creado_en`.
6. **`usuarios_admin`**: `id`, `usuario`, `password_hash`, `nombre`, `activo`, `creado_en`.

---

## 4. Contrato de API REST

### Rutas Públicas
| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/health` | Verifica estado del servidor y conexión con MySQL (XAMPP). |
| `GET` | `/api/servicios` | Lista servicios activos con duración, precio e imagen. |
| `GET` | `/api/barberos` | Lista los 4 barberos activos del estudio. |
| `GET` | `/api/testimonios` | Lista testimonios visibles ordenados para el carrusel. |
| `GET` | `/api/disponibilidad?fecha=YYYY-MM-DD&servicio_id=X&barbero_id=Y` | Retorna los bloques horarios disponibles reales considerando duración, capacidad y bloqueos. |
| `POST` | `/api/citas` | Crea la cita dentro de transacción MySQL, asigna barbero libre y devuelve código + URL WhatsApp. |

### Rutas Administrativas (`/api/admin/*`, requieren `Authorization: Bearer <token>`)
| Método | Endpoint | Descripción |
|---|---|---|
| `POST` | `/api/admin/login` | Autentica administrador y devuelve token de sesión. |
| `GET` | `/api/admin/citas?fecha=YYYY-MM-DD&estado=...` | Lista citas filtradas y métricas resumen del día. |
| `PATCH` | `/api/admin/citas/:id/estado` | Actualiza estado (`pendiente`, `confirmada`, `completada`, `cancelada`). |
| `GET` | `/api/admin/bloqueos?fecha=YYYY-MM-DD` | Lista bloqueos manuales activos. |
| `POST` | `/api/admin/bloqueos` | Crea bloqueo manual (por barbero o global para todo el local). |
| `DELETE` | `/api/admin/bloqueos/:id` | Elimina un bloqueo manual. |

---

## 5. Puesta en Marcha Local con XAMPP + Node.js

1. **Encender MySQL en XAMPP:** En *XAMPP Control Panel*, asegúrate de tener iniciado **MySQL** (puerto `3306`) y **Apache** (para entrar a phpMyAdmin).
2. **Crear la base de datos:**
   * Opción A (phpMyAdmin): Entra a `http://localhost/phpmyadmin`, ve a **Importar** y selecciona `sql/kashevi_db.sql`.
   * Opción B (automática por consola): Ejecuta `npm run db:setup` (crea tablas, datos iniciales y usuario admin).
3. **Configurar variables de entorno:** Copia `.env.example` a `.env` (por defecto usa `DB_HOST=127.0.0.1`, `DB_USER=root`, `DB_PASSWORD=` vacío como viene en XAMPP).
4. **Instalar e iniciar servidor:**
   ```bash
   npm install
   npm start
   ```
5. **Accesos:**
   * Web pública y reservas: `http://localhost:3000`
   * Panel administrativo: `http://localhost:3000/admin.html`
