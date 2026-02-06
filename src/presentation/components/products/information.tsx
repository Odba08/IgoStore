import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Image,
  StyleSheet,
  Text,
  useWindowDimensions,
  TouchableOpacity,
  SafeAreaView
} from 'react-native';
import { ListItem, CheckBox } from '@rneui/themed';
import { Ionicons } from '@expo/vector-icons';

const Information = () => {
  const { width } = useWindowDimensions();

  const [expanded1, setExpanded1] = useState(true);
  const [expanded2, setExpanded2] = useState(false);
  const [cantidad, setCantidad] = useState(1);
  const [selectedOption, setSelectedOption] = useState("");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        {/* Imagen superior */}
        <View>
          <Image
            source={require("../../../../assets/Icons/rectangle.png")}
            style={{
              width,
              height: 250,
              borderBottomRightRadius: 25,
              borderBottomLeftRadius: 25
            }}
          />
        </View>

        {/* Información del producto */}
        <View>
          <Text style={styles.title}>Producto</Text>
          <Text style={styles.description}>
            Esta es una descripción del producto que se busca vender, acá se muestra todo el contenido.
          </Text>

          <View style={styles.priceRow}>
            <Text style={styles.price}>$12.00</Text>
            <Text style={styles.oldPrice}>$15.00</Text>
          </View>
        </View>

        {/* Personalización 1 */}
        <ListItem.Accordion
          isExpanded={expanded1}
          onPress={() => setExpanded1(!expanded1)}
          content={
            <ListItem.Content>
              <ListItem.Title>Personalización 1</ListItem.Title>
              <ListItem.Subtitle>Selecciona máximo 1 opción</ListItem.Subtitle>
            </ListItem.Content>
          }
        >
          {["Opción A", "Opción B", "Opción C"].map((op, index) => (
            <ListItem key={index} onPress={() => setSelectedOption(op)}>
              <ListItem.Content>
                <ListItem.Title>{op}</ListItem.Title>
              </ListItem.Content>
              <CheckBox
                checked={selectedOption === op}
                onPress={() => setSelectedOption(op)}
                checkedIcon="dot-circle-o"
                uncheckedIcon="circle-o"
              />
            </ListItem>
          ))}
        </ListItem.Accordion>

        {/* Personalización 2 */}
        <ListItem.Accordion
          isExpanded={expanded2}
          onPress={() => setExpanded2(!expanded2)}
          content={
            <ListItem.Content>
              <ListItem.Title>Personalización 2</ListItem.Title>
              <ListItem.Subtitle>Selecciona máximo 15 opciones</ListItem.Subtitle>
            </ListItem.Content>
          }
        >
          {[1, 2, 3].map((item, index) => (
            <ListItem key={index}>
              <ListItem.Content>
                <ListItem.Title>Extra {item}</ListItem.Title>
              </ListItem.Content>
              <CheckBox checked={true} />
            </ListItem>
          ))}
        </ListItem.Accordion>
      </ScrollView>

      {/* Footer fijo */}
      <View style={styles.footer}>
        <View style={styles.quantityControl}>
          <TouchableOpacity onPress={() => setCantidad(c => Math.max(1, c - 1))}>
            <Ionicons name="remove" size={20} />
          </TouchableOpacity>
          <Text style={{ marginHorizontal: 15 }}>{cantidad}</Text>
          <TouchableOpacity onPress={() => setCantidad(c => c + 1)}>
            <Ionicons name="add" size={20} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.addButton}>
          <Text style={styles.addText}>Añadir · ${12 * cantidad}.00</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    padding: 10
  },
  description: {
    textAlign: 'justify',
    padding: 7,
    fontSize: 18
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    gap: 10
  },
  price: {
    fontSize: 22,
    fontWeight: 'bold'
  },
  oldPrice: {
    fontSize: 18,
    textDecorationLine: 'line-through',
    color: '#999'
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 15,
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#ddd",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#f2f2f2",
    borderRadius: 20,
    padding: 8
  },
  addButton: {
    backgroundColor: "#FFD700",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 30
  },
  addText: {
    fontWeight: 'bold'
  }
});

export default Information;
