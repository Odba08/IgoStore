import { ActivityIndicator, View, StyleSheet } from 'react-native';
import React, { useEffect } from 'react';
import CustomMap from '@/presentation/components/maps/CustomMap';
import { useLocationStore } from '@/presentation/store/useLocationStore';

const MapScreen = () => { // Corregido el nombre y sintaxis

  const { lastKnowLocation, getLocation } = useLocationStore();

  useEffect(() => {
    if (lastKnowLocation === null) {
      getLocation();
    }
  }, []);

  if (lastKnowLocation === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="black" />
      </View>
    );
  }

  return (
    // ⚠️ IMPORTANTE: Este contenedor NECESITA flex: 1
    // Si no se lo pones, el mapa mide 0px de alto y no se ve.
    <View style={styles.container}>
       <CustomMap initialLocation={lastKnowLocation} />
    </View>
  );
};

export default MapScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1, // Esto hace que ocupe toda la pantalla
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
});