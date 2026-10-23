# Requisitos, decisiones y etapas

## Alcance acordado

Cinco cuentas personales autorizadas, todas con registro y modificación; sin registro público ni invitados. Teléfonos y tablets Android/iOS, trabajo en línea. No migrar a Flutter, Dart o Supabase.

1. Producción: kilogramos diarios por mañana y tarde; consultas por fecha/período.
2. Ventas: solo Dos Pinos, recolección cada tres días incluidos fines de semana y feriados, sin día semanal fijo. Precio confirmado ₡425/kg, conservado en cada venta. Separar kg producidos y vendidos e importe bruto. Confirmar fecha ancla antes de proyectar recolecciones.
3. Nacimientos: fecha, identificación y sexo hembra/macho. Confirmar campos adicionales antes de ampliarlos.
4. Engorde/pesajes: identificación por nombre o arete único, raza, sexo, fecha de compra e historial de fechas/pesos sin sobrescribir mediciones. Sexo aplica también al ganado general.
5. Medicamentos comprados: tipo, nombre comercial, compra, vencimiento y notas. Expirado/no expirado/próximo a vencer; aviso al menos diez días antes. Acordar presentación: propuesta inicial en pantalla pendiente de confirmación; no asumir push.
6. Aplicaciones: medicamento, fecha y animal/grupo/todo el ganado. Guardar los integrantes tratados al momento de la aplicación, aunque el grupo cambie después.

Reportes en pantalla, exportación Excel y PDF para imprimir. Sin cálculo de dosis, cantidades o lotes ni responsable de aplicación. Peso disponible para consulta. Excel actual de medicamentos y facturas de leche requieren futura revisión autorizada, sin subir datos reales.

## Etapas con criterios de aceptación

1. Diagnóstico actual: preservar copia e historiales, aislar arranque, documentar riesgos, revisión de secretos y repositorio nuevo. Pendientes reales se anotan, sin presentar como completada la seguridad integral.
2. Base y acceso: resolver versiones/avisos con cambios puntuales, BD independiente y migraciones; cinco cuentas aprovisionadas sin registro público, bcrypt, secreto obligatorio, validación JWT en servidor, navegación autenticada, recuperación con token de uso único/vencimiento. Probar acceso ajeno, token inválido/vencido y cambios de contraseña.
3. Producción y ventas: formularios nativos, persistencia, períodos y reglas monetarias con decimales. Probar separación de kg y precio histórico, entregas cada tres días.
4. Animales, nacimientos y pesajes: identificación única, sexo e historial. Probar duplicados y conservación de mediciones.
5. Medicamentos/aplicaciones: vencimientos y avisos acordados, integrantes históricos de grupos. Probar límites de diez días y cambios del grupo.
6. Reportes: mismas cifras en pantalla, Excel y PDF; verificar impresión y fechas en zona America/Costa_Rica.
7. Piloto, respaldo/restauración y defensa: pruebas en teléfonos/tablets Android/iOS con datos ficticios y después piloto autorizado. Corregir defectos y documentar limitaciones.

## Calendario provisional

Preparación adelantada desde 23/10/2026; inicio originalmente previsto 23/11/2026. Ajustar fechas de etapas según disponibilidad y diagnóstico, sin dar por confirmadas horas de trabajo. Objetivo piloto: 14/02/2027; defensa: última semana de febrero de 2027. Priorizar acceso y persistencia antes de apariencia y reportes.

## Para comprender y defender el proyecto

React Native dibuja pantallas nativas; Expo facilita ejecutar y empaquetar JavaScript. Node ejecuta JavaScript en el servidor; Express recibe HTTP y aplica controles. mysql2 conecta con MySQL/MariaDB, que conserva los registros compartidos.

Flujo objetivo: pantalla valida para ayudar al usuario → petición HTTPS con JWT → Express verifica identidad y valida campos → consulta SQL parametrizada → respuesta → pantalla muestra resultado, vacío o error real. El servidor es quien decide permisos; ni un correo que diga admin ni ocultar un botón concede seguridad. Hoy /health no toca la BD y /api está cerrado.

Preguntas de defensa: ¿por qué kg y no litros?, ¿cómo se conserva el precio de venta?, ¿por qué cada pesaje es una fila nueva?, ¿qué impide cambiar otra contraseña?, ¿por qué AsyncStorage no sirve como fuente compartida?, ¿cómo se sabe qué animales recibió una aplicación grupal?, ¿cómo se recupera un respaldo?, ¿qué demuestra una prueba y qué no demuestra? Las respuestas deben apoyarse en requisitos y pruebas de cada etapa, sin prometer cero vulnerabilidades.
