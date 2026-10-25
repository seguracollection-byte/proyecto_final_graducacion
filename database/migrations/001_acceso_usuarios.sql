-- Ejecutar únicamente en la base de desarrollo de Lomas.
USE lomas_eveneser_dev;

CREATE TABLE usuarios (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    email VARCHAR(254) NOT NULL,
    password_hash VARCHAR(255) NULL,
    rol ENUM('administrador', 'usuario') NOT NULL DEFAULT 'usuario',
    estado ENUM('pendiente_activacion', 'activo', 'inactivo')
        NOT NULL DEFAULT 'pendiente_activacion',
    version_sesion INT UNSIGNED NOT NULL DEFAULT 1,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uq_usuarios_email UNIQUE (email)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE solicitudes_acceso (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    email VARCHAR(254) NOT NULL,
    estado ENUM('pendiente', 'aprobada', 'rechazada')
        NOT NULL DEFAULT 'pendiente',
    revisada_por INT UNSIGNED NULL,
    revisada_en DATETIME NULL,
    usuario_id INT UNSIGNED NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_solicitudes_email UNIQUE (email),

    CONSTRAINT fk_solicitudes_administrador
        FOREIGN KEY (revisada_por)
        REFERENCES usuarios(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_solicitudes_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE tokens_cuenta (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT UNSIGNED NOT NULL,
    token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    proposito ENUM('activacion', 'recuperacion') NOT NULL,
    vence_en DATETIME NOT NULL,
    usado_en DATETIME NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_tokens_hash UNIQUE (token_hash),

    CONSTRAINT fk_tokens_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE RESTRICT,

    INDEX idx_tokens_usuario_proposito (usuario_id, proposito)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;