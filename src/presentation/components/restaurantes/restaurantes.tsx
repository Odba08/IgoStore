import React from 'react';

import {
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Text
 
} from 'react-native';

const Restaurantes = () => {
  return (
    <ScrollView
      
      showsHorizontalScrollIndicator={false}
      style={{flex: 0.5}}>
      <TouchableOpacity >
        <Image
          source={require('../../../../assets/Icons/rectangle.png')}
          style={styles.Image}
        />
        <View style={styles.overlay}>
       {/*  <Text style={styles.overlayText}>Pectoral</Text> */}
      </View>
      </TouchableOpacity>
      <View style={{flexDirection: 'row', padding: 15}}>
      
      <Image 
      style={{height: 70, width:70}}
      source={require('../../../../assets/Icons/circle.png')}
      />
      <View style={{flexDirection: 'column', marginLeft: 12}}>
      <Text style={{ fontSize: 18, fontWeight: "bold"}}>
        Nombre del resturante
      </Text>
      <Text>
        45min - 875 mts
      </Text>
      <Text>
        Categorias del Restaurante
      </Text>
      </View>
      </View>

      <TouchableOpacity >
        <Image
          source={require('../../../../assets/Icons/rectangle.png')}
          style={styles.Image}
        />
        <View style={styles.overlay}>
      </View>
      </TouchableOpacity>
      <View style={{flexDirection: 'row', padding: 15}}>
      
      <Image 
      style={{height: 70, width:70}}
      source={require('../../../../assets/Icons/circle.png')}
      />
      <View style={{flexDirection: 'column', marginLeft: 12}}>
      <Text style={{ fontSize: 18, fontWeight: "bold"}}>
        Nombre del resturante
      </Text>
      <Text>
        45min - 875 mts
      </Text>
      <Text>
        Categorias del Restaurante
      </Text>
      </View>
      </View>
    <TouchableOpacity >
        <Image
          source={require('../../../../assets/Icons/rectangle.png')}
          style={styles.Image}
        />
        <View style={styles.overlay}>
      </View>
      </TouchableOpacity>
       <View style={{flexDirection: 'row', padding: 15}}>
      
      <Image 
      style={{height: 70, width:70}}
      source={require('../../../../assets/Icons/circle.png')}
      />
      <View style={{flexDirection: 'column', marginLeft: 12}}>
      <Text style={{ fontSize: 18, fontWeight: "bold"}}>
        Nombre del resturante
      </Text>
      <Text>
        45min - 875 mts
      </Text>
      <Text>
        Categorias del Restaurante
      </Text>
      </View>
      </View>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  Image: {
    height: 120,
    width: 365,
    flex: 0.2,
    marginStart: 8,
    borderRadius: 10,
    marginBottom:15
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
/*     backgroundColor: 'rgba(0, 0, 0, 0.35)', // Ajusta la opacidad aquí (0.5 en este ejemplo)
 */    justifyContent: 'flex-end',
    
    marginHorizontal:11,
    marginBottom:15,
    borderRadius: 10,
  },
  overlayText: {
    color: 'white',
    fontSize: 30,
    fontWeight: 'bold',
    textAlign: 'left',
    padding: 15,
   
  },
});

export default Restaurantes;
