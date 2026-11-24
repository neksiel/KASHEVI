-- ============================================================================
-- KASHEVI BARBERSHOP — Esquema Completo MySQL / MariaDB (XAMPP)
-- ============================================================================

CREATE DATABASE IF NOT EXISTS kashevi_barbershop
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE kashevi_barbershop;

-- ----------------------------------------------------------------------------
-- 1. Catálogo de servicios
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS servicios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(60) NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  descripcion_corta VARCHAR(200) NOT NULL,
  descripcion_detalle TEXT NOT NULL,
  duracion_min INT NOT NULL,
  precio DECIMAL(10, 2) NOT NULL,
  imagen_url VARCHAR(255) NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 2. Barberos ("donde cuatro talentos se unen")
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS barberos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  especialidad VARCHAR(120) NOT NULL,
  foto_url VARCHAR(255) NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 3. Citas (núcleo transaccional)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS citas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  codigo_reserva VARCHAR(24) NOT NULL UNIQUE,
  servicio_id INT NOT NULL,
  barbero_id INT NOT NULL,
  cliente_nombre VARCHAR(120) NOT NULL,
  cliente_telefono VARCHAR(20) NOT NULL,
  fecha DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  notas VARCHAR(255) NULL,
  estado ENUM('pendiente', 'confirmada', 'completada', 'cancelada') NOT NULL DEFAULT 'pendiente',
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_citas_servicio FOREIGN KEY (servicio_id) REFERENCES servicios(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_citas_barbero FOREIGN KEY (barbero_id) REFERENCES barberos(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX idx_citas_fecha_estado (fecha, estado),
  INDEX idx_citas_barbero_fecha (barbero_id, fecha, hora_inicio, hora_fin)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 4. Testimonios ("NUESTRA PRIORIDAD")
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS testimonios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente_nombre VARCHAR(100) NOT NULL,
  edad TINYINT UNSIGNED NOT NULL,
  comentario VARCHAR(255) NOT NULL,
  foto_url VARCHAR(255) NULL,
  orden INT NOT NULL DEFAULT 0,
  visible TINYINT(1) NOT NULL DEFAULT 1,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 5. Bloqueos manuales de horario
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bloqueos_horario (
  id INT AUTO_INCREMENT PRIMARY KEY,
  barbero_id INT NULL,
  fecha DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  motivo VARCHAR(150) NOT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bloqueo_barbero FOREIGN KEY (barbero_id) REFERENCES barberos(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_bloqueos_fecha (fecha, hora_inicio, hora_fin)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 6. Administradores del panel (/admin.html)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios_admin (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================================
-- DATOS INICIALES (SEED)
-- ============================================================================

INSERT INTO servicios (slug, nombre, descripcion_corta, descripcion_detalle, duracion_min, precio, imagen_url)
VALUES
  (
    'corte-cabello',
    'Corte de Cabello',
    'Fade moderno, corte clásico a tijera y acabado personalizado.',
    'Incluye diagnóstico de textura y facciones, corte de precisión a máquina y tijera, lavado revitalizante y peinado con ceras o pomadas de alta gama.',
    45,
    35.00,
    'img/servicio-corte.jpg'
  ),
  (
    'tinte-cabello',
    'Tinte de Cabello',
    'Coloración uniforme, iluminación o cobertura natural de canas.',
    'Evaluación previa de tono y salud capilar, aplicación de pigmentación profesional con fórmulas suaves, sellado hidratante y estilismo final.',
    60,
    70.00,
    'img/servicio-tinte.jpg'
  ),
  (
    'tratamientos-faciales',
    'Tratamientos Faciales',
    'Limpieza profunda, vapor ozono y mascarilla revitalizante.',
    'Ritual facial masculino diseñado para la piel masculina: exfoliación purificante, vaporización con toalla caliente, mascarilla detox e hidratación con efecto calmante.',
    45,
    50.00,
    'img/servicio-facial.jpg'
  ),
  (
    'diseno-barba',
    'Diseño de Barba, Ceja y Bigote',
    'Perfilado a navaja con ritual de toalla caliente y aceites.',
    'Diseño geométrico acorde a tus facciones, suavizado con toalla caliente y aceites esenciales, perfilado exacto de barba, bigote y cejas, más bálsamo post-afeitado.',
    30,
    30.00,
    'img/servicio-barba.jpg'
  )
ON DUPLICATE KEY UPDATE
  nombre = VALUES(nombre),
  descripcion_corta = VALUES(descripcion_corta),
  descripcion_detalle = VALUES(descripcion_detalle),
  duracion_min = VALUES(duracion_min),
  precio = VALUES(precio),
  imagen_url = VALUES(imagen_url);

INSERT INTO barberos (id, nombre, especialidad, foto_url)
VALUES
  (1, 'Mateo Vargas', 'Fade Moderno y Texturizado', 'img/nosotros-barber.jpg'),
  (2, 'Lucas Mendoza', 'Corte Clásico a Tijera y Estilismo', 'img/ritual-2-corte.jpg'),
  (3, 'Sebastián Quispe', 'Colorimetría y Tintes', 'img/servicio-tinte.jpg'),
  (4, 'Diego Paredes', 'Diseño de Barba y Ritual Facial', 'img/servicio-barba.jpg')
ON DUPLICATE KEY UPDATE
  nombre = VALUES(nombre),
  especialidad = VALUES(especialidad),
  foto_url = VALUES(foto_url);

INSERT INTO testimonios (id, cliente_nombre, edad, comentario, foto_url, orden)
VALUES
  (1, 'Jhosep', 34, 'Era el cambio que necesitaba', 'img/testimonio-jhosep.jpg', 1),
  (2, 'Pedro', 27, 'Me siento mejor conmigo mismo', 'img/testimonio-pedro.jpg', 2),
  (3, 'Santiago', 40, 'Mi barba es mi distintivo', 'img/testimonio-santiago.jpg', 3)
ON DUPLICATE KEY UPDATE
  cliente_nombre = VALUES(cliente_nombre),
  edad = VALUES(edad),
  comentario = VALUES(comentario),
  foto_url = VALUES(foto_url),
  orden = VALUES(orden);

-- Usuario admin inicial: usuario = "admin", contraseña = "kashevi2026" (hash bcrypt)
-- Nota: Cambia la contraseña después de iniciar sesión o ejecuta `npm run db:setup`.
INSERT INTO usuarios_admin (id, usuario, password_hash, nombre)
VALUES
  (1, 'admin', '$2a$10$ywoAnEJAAxPjf6wddTh86O5jrf/gqX6rayTwJsRTk2JU0HcRnKHYO', 'Administrador Kashevi')
ON DUPLICATE KEY UPDATE
  nombre = VALUES(nombre);
