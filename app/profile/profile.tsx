import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const PROFILE_OPTIONS = [
  { id: '1', title: 'Mis Pedidos', icon: 'receipt-outline' },
  { id: '2', title: 'Métodos de Pago', icon: 'card-outline' },
  { id: '3', title: 'Mis Direcciones', icon: 'location-outline' },
  { id: '4', title: 'Configuración', icon: 'settings-outline' },
  { id: '5', title: 'Ayuda y Soporte', icon: 'help-circle-outline' },
];

const ProfileScreen = () => {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      
      {/* HEADER PERSONALIZADO (Integrado con el fondo amarillo) */}
      <View style={styles.customHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mi Perfil</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ENCABEZADO DEL PERFIL */}
        <View style={styles.headerSection}>
          <View style={styles.avatarContainer}>
            <Image source={{ uri: 'https://avatar.iran.liara.run/public/33' }} style={styles.avatar} />
            <TouchableOpacity style={styles.editAvatarBtn}>
              <Ionicons name="camera" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>Oscar Bueno</Text>
          <Text style={styles.userEmail}>obueno8@gmail.com</Text>
          
          <TouchableOpacity style={styles.editProfileBtn}>
            <Text style={styles.editProfileText}>Editar Perfil</Text>
          </TouchableOpacity>
        </View>

        {/* LISTA DE OPCIONES */}
        <View style={styles.optionsContainer}>
          {PROFILE_OPTIONS.map((option) => (
            <TouchableOpacity key={option.id} style={styles.optionRow}>
              <View style={styles.optionIconBox}>
                <Ionicons name={option.icon as any} size={22} color="#1A1A1A" />
              </View>
              <Text style={styles.optionTitle}>{option.title}</Text>
              <Ionicons name="chevron-forward" size={20} color="#CCC" />
            </TouchableOpacity>
          ))}
        </View>

        {/* CERRAR SESIÓN */}
        <TouchableOpacity style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color="#E74C3C" />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFDB58' }, // El SafeArea asume el color amarillo arriba
  customHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 10, backgroundColor: '#FFDB58' },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
  scrollContent: { paddingBottom: 40, backgroundColor: '#F2F4F7', flexGrow: 1 },
  headerSection: { backgroundColor: '#FFDB58', alignItems: 'center', paddingBottom: 30, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  avatarContainer: { position: 'relative', marginTop: 10 },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#FFF' },
  editAvatarBtn: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#1A1A1A', padding: 8, borderRadius: 20, borderWidth: 2, borderColor: '#FFF' },
  userName: { fontSize: 22, fontWeight: 'bold', color: '#1A1A1A', marginTop: 15 },
  userEmail: { fontSize: 14, color: '#555', marginTop: 5 },
  editProfileBtn: { marginTop: 15, backgroundColor: 'rgba(0,0,0,0.05)', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20 },
  editProfileText: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  optionsContainer: { backgroundColor: '#FFF', margin: 20, borderRadius: 15, padding: 10, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
  optionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  optionIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#F9F9F9', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  optionTitle: { flex: 1, fontSize: 16, fontWeight: '500', color: '#333' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 20, marginTop: 10, paddingVertical: 15, backgroundColor: '#FFF', borderRadius: 15, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
  logoutText: { fontSize: 16, fontWeight: 'bold', color: '#E74C3C', marginLeft: 10 }
});

export default ProfileScreen;