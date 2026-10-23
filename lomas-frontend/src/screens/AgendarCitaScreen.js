import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import api from '../services/api';

export default function AgendarCitaScreen({ route, navigation }) {
  const params = route.params || {};
  const user = params.user && params.user.id ? params.user : null;
  const isInvitado = !user;

  const [nombreInvitado, setNombreInvitado] = useState('');
  const [emailInvitado, setEmailInvitado] = useState('');
  const [telefonoInvitado, setTelefonoInvitado] = useState('');

  const [servicios, setServicios] = useState([]);
  const [barberos, setBarberos] = useState([]);
  const [servicioSeleccionado, setServicioSeleccionado] = useState(null);
  const [barberoSeleccionado, setBarberoSeleccionado] = useState(null);

  const [fechaStr, setFechaStr] = useState(new Date().toISOString().split('T')[0]);
  const [horaStr, setHoraStr] = useState("12:00");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [resServicios, resBarberos] = await Promise.all([
        api.get('/servicios'),
        api.get('/usuarios/barberos')
      ]);
      const listaServicios = resServicios.data.data || resServicios.data;
      const listaBarberos = resBarberos.data.data || resBarberos.data;

      setServicios(Array.isArray(listaServicios) ? listaServicios : []);
      setBarberos(Array.isArray(listaBarberos) ? listaBarberos : []);
    } catch (error) {
      console.error("❌ Error en fetchData:", error);
      alert('No se pudieron cargar los servicios o barberos.');
    }
  };

  const handleAgendar = async () => {
    if (!servicioSeleccionado || !barberoSeleccionado) {
      alert('Por favor selecciona un servicio y un barbero.');
      return;
    }

    if (isInvitado && (!nombreInvitado || !emailInvitado || !telefonoInvitado)) {
      alert('Por favor llena tus datos de contacto de invitado.');
      return;
    }

    const [horas, minutos] = horaStr.split(':').map(Number);
    const horaEnDecimal = horas + (minutos / 60);

    if (horaEnDecimal < 10.0 || horaEnDecimal > 19.0) {
      alert('Error: Pierce Barber Shop opera únicamente en el horario de 10:00 AM a 7:00 PM.');
      return;
    }

    if (horaEnDecimal >= 13.0 && horaEnDecimal < 14.0) {
      alert('Error: Todos los barberos están en su hora de almuerzo global (1:00 PM - 2:00 PM). Por favor elige otra hora.');
      return;
    }

    const fechaHoraFinal = `${fechaStr} ${horaStr}:00`;

    // 🔒 VALIDACIÓN DE CHOQUE DE CITAS PARA EL MISMO BARBERO
    try {
      const resCitas = await api.get('/citas');
      const listaCitasExistentes = resCitas.data.data || resCitas.data;
      
      if (Array.isArray(listaCitasExistentes)) {
        const citaDuplicada = listaCitasExistentes.find(cita => 
          String(cita.barbero_id) === String(barberoSeleccionado) && 
          String(cita.fecha_hora) === String(fechaHoraFinal)
        );

        if (citaDuplicada) {
          alert('⚠️ Lo sentimos, este barbero ya tiene una cita agendada para esta hora exacta. Por favor selecciona otro horario o cambia de barbero.');
          return; // Frena el flujo para que no guarde
        }
      }
    } catch (checkError) {
      console.warn("No se pudo verificar la disponibilidad en tiempo real, procediendo con precaución:", checkError);
    }

    const usuarioIdFinal = user && user.id ? user.id : null;

    const payload = {
      fecha_hora: fechaHoraFinal,
      servicios_idservicios: servicioSeleccionado,
      barbero_id: barberoSeleccionado,
      usuarios_id: isInvitado ? null : usuarioIdFinal,
      invitado_nombre: isInvitado ? nombreInvitado : null,
      invitado_email: isInvitado ? emailInvitado : null,
      invitado_telefono: isInvitado ? telefonoInvitado : null,
    };

    try {
      const response = await api.post('/citas', payload);
      if (response.data.success || response.status === 200 || response.status === 201) {
        alert('¡Éxito! Tu cita ha sido agendada correctamente.');

        if (isInvitado) {
          navigation.navigate('Login');
          return;
        }

        const userRol = user?.rol ? user.rol.toLowerCase().trim() : 'cliente';

        try {
          if (userRol === 'admin') {
            navigation.navigate('AdminDashboard', { user });
          } else if (userRol === 'barbero') {
            navigation.navigate('BarberoDashboard', { user });
          } else {
            navigation.navigate('ClienteHome', { user });
          }
        } catch (navError) {
          console.warn("Ruta específica no encontrada en el Stack, aplicando fallback goBack:", navError);
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate('Login');
          }
        }
      }
    } catch (error) {
      console.error("❌ Error al agendar cita:", error);
      alert('Hubo un problema al guardar la cita en la base de datos.');
    }
  };

  return (
    <div style={{ backgroundColor: '#121212', height: '100vh', overflowY: 'scroll', padding: '20px', boxSizing: 'border-box' }}>
      <Text style={styles.title}>Agendar Cita</Text>

      {isInvitado && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tus Datos de Contacto</Text>
          <TextInput style={styles.input} placeholder="Nombre Completo" placeholderTextColor="#666" value={nombreInvitado} onChangeText={setNombreInvitado} />
          <TextInput style={styles.input} placeholder="Correo Electrónico" placeholderTextColor="#666" value={emailInvitado} onChangeText={setEmailInvitado} keyboardType="email-address" autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Teléfono" placeholderTextColor="#666" value={telefonoInvitado} onChangeText={setTelefonoInvitado} keyboardType="phone-pad" />
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Selecciona el Servicio en Pierce Barber Shop</Text>
        {servicios.map((item) => {
          let imageUrl = 'https://images.unsplash.com/photo-1635273051839-003bf06a8751?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';
          const nombreLower = item.nombre ? item.nombre.toLowerCase() : '';

          if (nombreLower.includes('barba') || nombreLower.includes('afeitado')) {
            imageUrl = 'https://plus.unsplash.com/premium_photo-1661270415179-f7bcff006edb?q=80&w=2069&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';
          } else if (nombreLower.includes('tinte') || nombreLower.includes('color')) {
            imageUrl = 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=500&auto=format&fit=crop&q=60';
          } else if (nombreLower.includes('facial') || nombreLower.includes('mascarilla')) {
            imageUrl = 'https://images.unsplash.com/photo-1653875700329-a7c8aca94c95?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';
          } else if (nombreLower.includes('depilacion') || nombreLower.includes('depilación') || nombreLower.includes('cejas')) {
            imageUrl = 'https://images.unsplash.com/photo-1653875700318-c235ce6eb128?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';
          } else if (nombreLower.includes('vip') || nombreLower.includes('combo premium')) {
            imageUrl = 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=500&auto=format&fit=crop&q=60';
          }

          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.card, servicioSeleccionado === item.id && styles.cardSelected]}
              onPress={() => setServicioSeleccionado(item.id)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <img src={imageUrl} style={{ width: '70px', height: '70px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #333' }} alt={item.nombre} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardText}>{item.nombre} - ₡{item.precio}</Text>
                  <Text style={styles.cardSubtext}>
                    {item.duracion_minutos ? `${item.duracion_minutos} min - ` : ''}{item.descripcion}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. Selecciona tu Barbero</Text>
        {barberos.map((barbero) => (
          <TouchableOpacity
            key={barbero.id}
            style={[styles.card, barberoSeleccionado === barbero.id && styles.cardSelected]}
            onPress={() => setBarberoSeleccionado(barbero.id)}
          >
            <Text style={styles.cardText}>{barbero.nombre}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. Fecha y Hora de la Cita</Text>
        <Text style={styles.dateTimeText}>Programado para el: {fechaStr} a las {horaStr}</Text>
        <View style={{ gap: 15, marginTop: 5 }}>
          <View>
            <Text style={{ color: '#d4af37', fontSize: 14, marginBottom: 6, fontWeight: '600' }}>Cambiar Fecha:</Text>
            <input type="date" value={fechaStr} onChange={(e) => setFechaStr(e.target.value)} style={{ backgroundColor: '#1e1e1e', color: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #333', width: '100%', fontSize: '16px' }} />
          </View>
          <View>
            <Text style={{ color: '#d4af37', fontSize: 14, marginBottom: 6, fontWeight: '600' }}>Cambiar Hora:</Text>
            <input type="time" value={horaStr} onChange={(e) => setHoraStr(e.target.value)} style={{ backgroundColor: '#1e1e1e', color: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #333', width: '100%', fontSize: '16px' }} />
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.submitButton} onPress={handleAgendar}>
        <Text style={styles.submitButtonText}>Confirmar Reservación</Text>
      </TouchableOpacity>

      {/* 🔄 BOTÓN DINÁMICO E INTELIGENTE DE REGRESAR */}
      {isInvitado ? (
        <TouchableOpacity style={styles.backButtonLink} onPress={() => navigation.replace('Login')}>
          <Text style={styles.backButtonLinkText}>Regresar a Login</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.backButtonPanel} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonPanelText}>⬅️ Volver al Panel Anterior</Text>
        </TouchableOpacity>
      )}

      <div style={{ height: '60px' }}></div>
    </div>
  );
}

const styles = StyleSheet.create({
  title: { color: '#d4af37', fontSize: 28, fontWeight: 'bold', marginVertical: 20, textAlign: 'center' },
  section: { marginBottom: 25 },
  sectionTitle: { color: '#d4af37', fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  input: { backgroundColor: '#1e1e1e', color: '#fff', padding: 12, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#333' },
  card: { backgroundColor: '#1e1e1e', padding: 15, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#333' },
  cardSelected: { borderColor: '#d4af37', backgroundColor: '#2a2415' },
  cardText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cardSubtext: { color: '#aaa', fontSize: 13, marginTop: 4 },
  dateTimeText: { color: '#fff', marginBottom: 10, fontSize: 15 },
  submitButton: { backgroundColor: '#d4af37', padding: 16, borderRadius: 8, marginTop: 20, marginBottom: 10 },
  submitButtonText: { color: '#121212', textAlign: 'center', fontWeight: 'bold', fontSize: 18 },
  backButtonLink: { marginTop: 20, padding: 10, alignItems: 'center' },
  backButtonLinkText: { color: '#d4af37', textAlign: 'center', fontSize: 15, textDecorationLine: 'underline', fontWeight: '500' },
  // Estilo del botón elegante para usuarios autenticados
  backButtonPanel: { backgroundColor: '#2a2e3d', padding: 14, borderRadius: 8, marginTop: 15, borderWidth: 1, borderColor: '#4a526b', alignItems: 'center' },
  backButtonPanelText: { color: '#ffffff', fontWeight: '600', fontSize: 15 }
});