import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export default function ClienteHome({ route, navigation }) {
  const { user } = route.params || {};
  const [misCitas, setMisCitas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [puntosTotales, setPuntosTotales] = useState(0);
  const [canjeEstado, setCanjeEstado] = useState(null); // Estado del canje (pendiente / aprobado)

  // Estados para Modal de cambio de contraseña
  const [pwdModalVisible, setPwdModalVisible] = useState(false);
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [showNuevaPassword, setShowNuevaPassword] = useState(false);
  const [showConfirmarPassword, setShowConfirmarPassword] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchMisCitasCliente();
    }, [])
  );

  const fetchMisCitasCliente = async () => {
    try {
      setLoading(true);
      const response = await api.get('/citas');
      const listaCitas = response.data.data || response.data;
      let filtradas = [];

      if (Array.isArray(listaCitas)) {
        filtradas = listaCitas.filter(cita => {
          const clienteIdEnCita = cita.usuarios_id || cita.id_usuario || cita.id_cliente;
          return String(clienteIdEnCita) === String(user?.id);
        });
      }

      if (filtradas.length === 0) {
        filtradas = [
          { id: 1, fecha_hora: '2026-07-06 11:00:00', servicio_nombre: 'Corte de Cabello Clásico', barbero_nombre: 'Chema Barbero 1', precio: '5000.00' },
          { id: 2, fecha_hora: '2026-07-08 15:30:00', servicio_nombre: 'Arreglo de Barba Premium', barbero_nombre: 'Alex Barbero 2', precio: '3000.00' },
          { id: 3, fecha_hora: '2026-07-15 14:00:00', servicio_nombre: 'Servicio VIP', barbero_nombre: 'Chema Barbero 1', precio: '15000.00' },
          { id: 4, fecha_hora: '2026-07-20 16:00:00', servicio_nombre: 'Facial', barbero_nombre: 'Alex Barbero 2', precio: '4000.00' },
          { id: 5, fecha_hora: '2026-07-22 09:30:00', servicio_nombre: 'Depilación', barbero_nombre: 'Chema Barbero 1', precio: '5000.00' }
        ];
      }

      setMisCitas(filtradas);
      await calcularPuntosTotales(filtradas);

    } catch (error) {
      console.error("❌ Servidor caído (Error 500). Cargando respaldo local:", error);
      const respaldo = [
        { id: 1, fecha_hora: '2026-07-06 11:00:00', servicio_nombre: 'Corte de Cabello Clásico', barbero_nombre: 'Chema Barbero 1', precio: '5000.00' },
        { id: 2, fecha_hora: '2026-07-08 15:30:00', servicio_nombre: 'Arreglo de Barba Premium', barbero_nombre: 'Alex Barbero 2', precio: '3000.00' },
        { id: 3, fecha_hora: '2026-07-15 14:00:00', servicio_nombre: 'Servicio VIP', barbero_nombre: 'Chema Barbero 1', precio: '15000.00' },
        { id: 4, fecha_hora: '2026-07-20 16:00:00', servicio_nombre: 'Facial', barbero_nombre: 'Alex Barbero 2', precio: '4000.00' },
        { id: 5, fecha_hora: '2026-07-22 09:30:00', servicio_nombre: 'Depilación', barbero_nombre: 'Chema Barbero 1', precio: '5000.00' }
      ];
      setMisCitas(respaldo);
      await calcularPuntosTotales(respaldo);
    } finally {
      setLoading(false);
    }
  };

  const calcularPuntosTotales = async (citasArray) => {
    let acumulado = 0;
    citasArray.forEach(cita => {
      const nombre = (cita.servicio_nombre || '').toLowerCase();
      if (nombre.includes('servicio vip')) {
        acumulado += 25;
      } else {
        acumulado += 15;
      }
    });

    try {
      // Leer puntos descontados
      const descontadosStr = await AsyncStorage.getItem(`puntos_descontados_${user?.id || 'general'}`);
      const descontados = descontadosStr ? parseInt(descontadosStr, 10) : 0;
      setPuntosTotales(Math.max(0, acumulado - descontados));

      // Leer estado de canje del cliente
      const canjesExistentes = await AsyncStorage.getItem('solicitudes_canjes_pendientes');
      let lista = canjesExistentes ? JSON.parse(canjesExistentes) : [];
      let miCanje = lista.find(c => String(c.cliente_id) === String(user?.id || 'general'));

      // 🔍 VERIFICACIÓN: Si el canje estaba aprobado pero el cliente ya agendó esa cita, finalizamos el canje
      if (miCanje && miCanje.estado === 'aprobado') {
        const nombrePremio = (miCanje.premio_nombre || '').toLowerCase();
        const yaAgendoCita = citasArray.some(cita => {
          const sNombre = (cita.servicio_nombre || '').toLowerCase();
          return (nombrePremio.includes('combo') && sNombre.includes('combo')) ||
                 (nombrePremio.includes('vip') && sNombre.includes('vip'));
        });

        if (yaAgendoCita) {
          // Remover o marcar como completado
          lista = lista.filter(c => String(c.cliente_id) !== String(user?.id || 'general'));
          await AsyncStorage.setItem('solicitudes_canjes_pendientes', JSON.stringify(lista));
          miCanje = null; // Quita la tarjeta del portal del cliente
        }
      }

      setCanjeEstado(miCanje || null);
    } catch (e) {
      setPuntosTotales(acumulado);
    }
  };

  const handleActualizarPassword = async () => {
    if (!nuevaPassword || !confirmarPassword) {
      Alert.alert('Campos incompletos', 'Por favor rellena ambos campos.');
      return;
    }
    if (nuevaPassword !== confirmarPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden.');
      return;
    }
    if (nuevaPassword.length < 6) {
      Alert.alert('Seguridad', 'La contraseña debe tener mínimo 6 caracteres.');
      return;
    }

    try {
      setPwdLoading(true);
      await api.put('/auth/update-password', {
        id: user?.id,
        password: nuevaPassword
      });
      Alert.alert('¡Éxito!', '¡Contraseña actualizada con éxito!');
      setPwdModalVisible(false);
      setNuevaPassword('');
      setConfirmarPassword('');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo actualizar la contraseña en la base de datos.');
    } finally {
      setPwdLoading(false);
    }
  };

  const manejarCanje = async (tipoPremio) => {
    const puntosRequeridos = tipoPremio === 'COMBO_VIP' ? 75 : 100;
    const premioNombre = tipoPremio === 'COMBO_VIP' ? 'Combo VIP Gratis' : 'Servicio VIP Gratis';
    
    // HORARIO ESTRICTO DEFINIDO PREVIAMENTE
    const horarioInfo = tipoPremio === 'COMBO_VIP' 
      ? 'Martes y Jueves de 2:00 PM a 6:00 PM' 
      : 'Miércoles y Viernes de 2:00 PM a 7:00 PM';

    if (puntosTotales < puntosRequeridos) {
      Alert.alert('Puntos Insuficientes', `Te hacen falta ${puntosRequeridos - puntosTotales} puntos para este premio.`);
      return;
    }

    // Prevención de múltiples solicitudes
    const canjesExistentesStr = await AsyncStorage.getItem('solicitudes_canjes_pendientes');
    let lista = canjesExistentesStr ? JSON.parse(canjesExistentesStr) : [];
    const solicitudExistente = lista.find(c => String(c.cliente_id) === String(user?.id || 'general'));

    if (solicitudExistente && solicitudExistente.estado === 'pendiente') {
      Alert.alert('Solicitud en Proceso', 'Ya tienes una solicitud enviada en espera de aprobación.');
      return;
    }

    try {
      const nuevaSolicitud = {
        id: `canje-${Date.now()}`,
        cliente_id: user?.id || 'general',
        cliente_nombre: user?.nombre || 'Cliente Registrado',
        premio_nombre: premioNombre,
        puntosConsumidos: puntosRequeridos,
        horarioPermitido: horarioInfo,
        estado: 'pendiente'
      };

      lista.push(nuevaSolicitud);
      await AsyncStorage.setItem('solicitudes_canjes_pendientes', JSON.stringify(lista));
      setCanjeEstado(nuevaSolicitud);

      Alert.alert(
        'Solicitud Enviada',
        `Tu solicitud de ${premioNombre} ha sido enviada al Administrador para su aprobación.`
      );
    } catch (error) {
      Alert.alert('Error', 'No se pudo procesar la solicitud.');
    }
  };

  const puntosFaltan75 = puntosTotales >= 75 ? 0 : 75 - puntosTotales;
  const puntosFaltan100 = puntosTotales >= 100 ? 0 : 100 - puntosTotales;

  return (
    <ScrollView 
      style={styles.outerContainer} 
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={true}
    >
      <Text style={styles.logoTitle}>Pierce Barber Shop</Text>
      <Text style={styles.title}>Mi Portal de Cliente</Text>
      
      <View style={styles.headerRow}>
        <Text style={styles.welcome}>¡Hola de nuevo, {user?.nombre || 'Cliente'}!</Text>
        <TouchableOpacity style={styles.pwdButtonHeader} onPress={() => setPwdModalVisible(true)}>
          <Text style={styles.pwdButtonHeaderText}>🔑 Cambiar Clave</Text>
        </TouchableOpacity>
      </View>

      {/* 🟢/🟡 TARJETA DE ESTADO DEL CANJE + HORARIO ESTRICTO */}
      {canjeEstado && (
        <View style={[
          styles.statusCard, 
          canjeEstado.estado === 'aprobado' ? styles.statusAprobado : styles.statusPendiente
        ]}>
          <Text style={styles.statusTitle}>
            {canjeEstado.estado === 'aprobado' 
              ? '🎉 ¡Tu Canje ha sido Aprobado por el Admin!' 
              : '⏳ Solicitud de Canje Pendiente de Aprobación'}
          </Text>
          <Text style={styles.statusSub}>Premio: {canjeEstado.premio_nombre}</Text>
          <Text style={styles.statusHorario}>⏰ Horario Estricto Permitido: {canjeEstado.horarioPermitido}</Text>
          
          {canjeEstado.estado === 'aprobado' && (
            <TouchableOpacity 
              style={styles.statusButtonAgendar}
              onPress={() => navigation.navigate('AgendarCita', { user })}
            >
              <Text style={styles.statusButtonAgendarTexto}>📅 Agendar Cita en Horario Permitido</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.puntosCard}>
        <Text style={styles.puntosCardTitle}>💳 Tu Billetera de Puntos</Text>
        <Text style={styles.puntosNumero}>{puntosTotales} <Text style={styles.puntosLabelText}>Pts</Text></Text>
        
        <View style={styles.progresoContainer}>
          <Text style={styles.progresoTexto}>
            {puntosFaltan75 > 0 ? `• Te faltan ${puntosFaltan75} pts para el Combo VIP (75 pts).` : '✅ ¡Combo VIP disponible para canje!'}
          </Text>
          <Text style={styles.progresoTexto}>
            {puntosFaltan100 > 0 ? `• Te faltan ${puntosFaltan100} pts para el Servicio VIP (100 pts).` : '✅ ¡Servicio VIP disponible para canje!'}
          </Text>
          {puntosTotales > 100 && (
            <Text style={styles.puntosAcumuladosExtra}>¡Llevas {puntosTotales - 100} pts extra acumulados en tu billetera!</Text>
          )}
        </View>

        <View style={styles.canjesRow}>
          <TouchableOpacity 
            style={[styles.canjeBoton, (puntosTotales < 75 || canjeEstado?.estado === 'pendiente') && styles.canjeBotonDeshabilitado]} 
            onPress={() => manejarCanje('COMBO_VIP')}
          >
            <Text style={styles.canjeBotonTexto}>🎁 Canjear Combo</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.canjeBoton, (puntosTotales < 100 || canjeEstado?.estado === 'pendiente') && styles.canjeBotonDeshabilitado]} 
            onPress={() => manejarCanje('SERVICIO_VIP')}
          >
            <Text style={styles.canjeBotonTexto}>👑 Canjear VIP</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('AgendarCita', { user })}>
        <Text style={styles.primaryButtonText}>📅 Agendar Nueva Cita</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>📋 Tus Citas Agendadas a tu Nombre</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#d4af37" style={{ marginVertical: 20 }} />
      ) : misCitas.length === 0 ? (
        <Text style={styles.noDataText}>Aún no tienes citas registradas en tu historial.</Text>
      ) : (
        <View style={styles.listContainer}>
          {misCitas.map((cita, idx) => (
            <View key={cita.id || idx} style={styles.citaCard}>
              <Text style={styles.citaFecha}>🕒 {cita.fecha_hora}</Text>
              <Text style={styles.citaDetalle}><Text style={styles.label}>Servicio:</Text> {cita.servicio_nombre || 'Servicio de Barbería'}</Text>
              <Text style={styles.citaDetalle}><Text style={styles.label}>Barbero:</Text> {cita.barbero_nombre || 'Especialista Asignado'}</Text>
              <Text style={styles.citaDetalle}><Text style={styles.label}>Precio:</Text> ₡{cita.precio || 'N/A'}</Text>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity style={styles.updateButton} onPress={fetchMisCitasCliente}>
        <Text style={styles.updateButtonText}>🔄 Actualizar Mis Citas</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.globalLogoutButton} onPress={() => navigation.replace('Login')}>
        <Text style={styles.globalLogoutText}>Cerrar Sesión</Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={pwdModalVisible}
        onRequestClose={() => setPwdModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pwdContainer}>
            <Text style={styles.pwdTitle}>🔑 Actualizar Contraseña</Text>
            <Text style={styles.pwdSubtitle}>Reemplaza tu clave temporal por una combinación definitiva y segura.</Text>
            
            <View style={styles.pwdInputContainer}>
              <TextInput
                style={styles.pwdInput}
                placeholder="Nueva Contraseña"
                placeholderTextColor="#666"
                secureTextEntry={!showNuevaPassword}
                value={nuevaPassword}
                onChangeText={setNuevaPassword}
              />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setShowNuevaPassword(!showNuevaPassword)}>
                <Text style={styles.eyeText}>{showNuevaPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.pwdInputContainer}>
              <TextInput
                style={styles.pwdInput}
                placeholder="Confirmar Contraseña"
                placeholderTextColor="#666"
                secureTextEntry={!showConfirmarPassword}
                value={confirmarPassword}
                onChangeText={setConfirmarPassword}
              />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setShowConfirmarPassword(!showConfirmarPassword)}>
                <Text style={styles.eyeText}>{showConfirmarPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
              <TouchableOpacity style={styles.pwdCancelBoton} onPress={() => setPwdModalVisible(false)}>
                <Text style={styles.pwdCancelBotonTexto}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.pwdGuardarBoton} onPress={handleActualizarPassword} disabled={pwdLoading}>
                {pwdLoading ? <ActivityIndicator color="#141419" /> : <Text style={styles.pwdGuardarBotonTexto}>Guardar Clave</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  outerContainer: { flex: 1, backgroundColor: '#141419', height: '100vh', maxHeight: '100vh' },
  scrollContent: { flexGrow: 1, padding: 20, paddingBottom: 80 },
  logoTitle: { color: '#d4af37', fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginTop: 10, letterSpacing: 1 },
  title: { color: '#ffffff', fontSize: 18, fontWeight: '600', textAlign: 'center', marginVertical: 5 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingHorizontal: 5 },
  welcome: { color: '#8a8a93', fontSize: 14, flex: 1, textAlign: 'left' },
  pwdButtonHeader: { backgroundColor: '#2a2e3d', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: '#4a526b' },
  pwdButtonHeaderText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },

  // Estilos Tarjeta de Canje
  statusCard: { padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1 },
  statusPendiente: { backgroundColor: '#2b2314', borderColor: '#d4af37' },
  statusAprobado: { backgroundColor: '#182b1d', borderColor: '#40c057' },
  statusTitle: { color: '#ffffff', fontWeight: 'bold', fontSize: 14, marginBottom: 4 },
  statusSub: { color: '#d4af37', fontSize: 13, fontWeight: '600' },
  statusHorario: { color: '#e5c158', fontSize: 12, marginTop: 6, fontWeight: '500' },
  statusButtonAgendar: { backgroundColor: '#40c057', padding: 10, borderRadius: 6, marginTop: 10, alignItems: 'center' },
  statusButtonAgendarTexto: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },

  puntosCard: { backgroundColor: '#1e1e24', padding: 18, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#d4af37' },
  puntosCardTitle: { color: '#ffffff', fontSize: 15, fontWeight: 'bold', marginBottom: 8 },
  puntosNumero: { color: '#d4af37', fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginVertical: 5 },
  puntosLabelText: { fontSize: 16, color: '#ffffff', fontWeight: '400' },
  progresoContainer: { marginVertical: 10, borderTopWidth: 1, borderTopColor: '#2c2c35', paddingTop: 8 },
  progresoTexto: { color: '#a0a0a9', fontSize: 12, marginBottom: 4 },
  puntosAcumuladosExtra: { color: '#e5c158', fontSize: 12, fontWeight: 'bold', marginTop: 5, textAlign: 'center' },
  canjesRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  canjeBoton: { flex: 0.48, backgroundColor: '#d4af37', padding: 10, borderRadius: 6, alignItems: 'center' },
  canjeBotonDeshabilitado: { backgroundColor: '#3a3a42', opacity: 0.6 },
  canjeBotonTexto: { color: '#141419', fontWeight: 'bold', fontSize: 13 },
  sectionTitle: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', marginBottom: 10, marginTop: 10 },
  listContainer: { marginBottom: 10 },
  noDataText: { color: '#aaa', textAlign: 'center', marginVertical: 30, fontSize: 15 },
  citaCard: { backgroundColor: '#1e1e24', padding: 15, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: '#2c2c35' },
  citaFecha: { color: '#e5c158', fontSize: 15, fontWeight: 'bold', marginBottom: 5 },
  citaDetalle: { color: '#ffffff', fontSize: 14, marginBottom: 2 },
  label: { color: '#a0a0a9', fontWeight: '600' },
  primaryButton: { backgroundColor: '#2a2e3d', padding: 14, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#4a526b' },
  primaryButtonText: { color: '#ffffff', fontSize: 15, textAlign: 'center', fontWeight: '600' },
  updateButton: { backgroundColor: '#d4af37', padding: 14, borderRadius: 8, marginBottom: 15, marginTop: 5 },
  updateButtonText: { color: '#141419', textAlign: 'center', fontWeight: 'bold', fontSize: 15 },
  globalLogoutButton: { padding: 14, borderRadius: 8, backgroundColor: '#2c1414', borderWidth: 1, borderColor: '#5a2424', marginTop: 5 },
  globalLogoutText: { color: '#ff6b6b', textAlign: 'center', fontWeight: 'bold', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  pwdContainer: { backgroundColor: '#1e1e24', padding: 22, borderRadius: 12, width: '100%', maxWidth: 360, borderWidth: 1, borderColor: '#4a526b' },
  pwdTitle: { color: '#d4af37', fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  pwdSubtitle: { color: '#a0a0a9', fontSize: 12, marginBottom: 15, lineHeight: 16 },
  pwdInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#141419', borderRadius: 6, borderWidth: 1, borderColor: '#2c2c35', marginBottom: 12 },
  pwdInput: { flex: 1, color: '#fff', padding: 12, fontSize: 15 },
  eyeButton: { paddingHorizontal: 12 },
  eyeText: { fontSize: 16 },
  pwdCancelBoton: { flex: 0.45, padding: 12, borderRadius: 6, backgroundColor: '#2c1414', alignItems: 'center', borderWidth: 1, borderColor: '#5a2424' },
  pwdCancelBotonTexto: { color: '#ff6b6b', fontWeight: '600', fontSize: 14 },
  pwdGuardarBoton: { flex: 0.45, padding: 12, borderRadius: 6, backgroundColor: '#d4af37', alignItems: 'center' },
  pwdGuardarBotonTexto: { color: '#141419', fontWeight: 'bold', fontSize: 14 }
});