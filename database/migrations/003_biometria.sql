-- Ejecutar únicamente en la base de desarrollo de Lomas.
USE lomas_eveneser_dev;

-- Dispositivos vinculados a una cuenta.
-- La clave privada permanece en el teléfono.
CREATE TABLE mfa_dispositivos (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin
        NOT NULL PRIMARY KEY,

    usuario_id INT UNSIGNED NOT NULL,

    nombre VARCHAR(100) NOT NULL,

    plataforma ENUM('android', 'ios') NOT NULL,

    clave_publica TEXT NOT NULL,

    huella_clave CHAR(64)
        CHARACTER SET ascii COLLATE ascii_bin NOT NULL,

    algoritmo ENUM('RSA2048_SHA256')
        NOT NULL DEFAULT 'RSA2048_SHA256',

    estado ENUM('pendiente', 'activo', 'revocado')
        NOT NULL DEFAULT 'pendiente',

    confirmado_en DATETIME NULL,
    ultimo_uso_en DATETIME NULL,
    revocado_en DATETIME NULL,

    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_mfa_dispositivo_clave
        UNIQUE (huella_clave),

    CONSTRAINT fk_mfa_dispositivo_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE RESTRICT,

    INDEX idx_mfa_dispositivo_usuario_estado (
        usuario_id,
        estado
    )
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- Desafíos de un solo uso para demostrar que el teléfono
-- puede utilizar su clave privada protegida por biometría.
CREATE TABLE mfa_desafios_biometricos (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    usuario_id INT UNSIGNED NOT NULL,

    dispositivo_id CHAR(36)
        CHARACTER SET ascii COLLATE ascii_bin NOT NULL,

    desafio_mfa_id BIGINT UNSIGNED NULL,

    token_hash CHAR(64)
        CHARACTER SET ascii COLLATE ascii_bin NOT NULL,

    mensaje VARCHAR(1024)
        CHARACTER SET ascii COLLATE ascii_bin NOT NULL,

    proposito ENUM('registro', 'ingreso') NOT NULL,

    version_sesion INT UNSIGNED NOT NULL,

    intentos_fallidos TINYINT UNSIGNED NOT NULL DEFAULT 0,

    vence_en DATETIME NOT NULL,
    usado_en DATETIME NULL,

    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_mfa_biometrico_token
        UNIQUE (token_hash),

    CONSTRAINT fk_mfa_biometrico_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuarios(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_mfa_biometrico_dispositivo
        FOREIGN KEY (dispositivo_id)
        REFERENCES mfa_dispositivos(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_mfa_biometrico_desafio
        FOREIGN KEY (desafio_mfa_id)
        REFERENCES mfa_desafios(id)
        ON DELETE RESTRICT,

    INDEX idx_mfa_biometrico_usuario (usuario_id),

    INDEX idx_mfa_biometrico_vencimiento (vence_en)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;