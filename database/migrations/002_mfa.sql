-- Ejecutar únicamente en la base de desarrollo de Lomas.
USE lomas_eveneser_dev;

-- Configuración individual de Google Authenticator u otra app TOTP.
CREATE TABLE mfa_totp (
    usuario_id INT UNSIGNED NOT NULL PRIMARY KEY,
    secreto_cifrado TEXT NOT NULL,
    confirmado_en DATETIME NULL,
    configuracion_vence_en DATETIME NOT NULL,
    ultimo_paso_usado BIGINT UNSIGNED NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_mfa_totp_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- Permisos temporales emitidos después de validar la contraseña.
-- No representan una sesión completa de la aplicación.
CREATE TABLE mfa_desafios (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT UNSIGNED NOT NULL,
    token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    proposito ENUM('configuracion', 'verificacion') NOT NULL,
    version_sesion INT UNSIGNED NOT NULL,
    intentos_fallidos TINYINT UNSIGNED NOT NULL DEFAULT 0,
    vence_en DATETIME NOT NULL,
    usado_en DATETIME NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_mfa_desafios_hash UNIQUE (token_hash),

    CONSTRAINT fk_mfa_desafios_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE RESTRICT,

    INDEX idx_mfa_desafios_usuario (usuario_id),
    INDEX idx_mfa_desafios_vencimiento (vence_en)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- Códigos de emergencia de un solo uso.
-- Se guarda únicamente el hash, nunca el código original.
CREATE TABLE mfa_codigos_recuperacion (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT UNSIGNED NOT NULL,
    codigo_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    usado_en DATETIME NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_mfa_recuperacion_hash UNIQUE (codigo_hash),

    CONSTRAINT fk_mfa_recuperacion_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE RESTRICT,

    INDEX idx_mfa_recuperacion_usuario (usuario_id)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;