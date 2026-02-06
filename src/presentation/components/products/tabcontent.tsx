import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Dimensions,Image
} from 'react-native';

const TABS = ['Promos', 'Los Favoritos', 'Categoría 1', 'Categoría 2'];
interface TabContentProps {
  selectedTab: string;
}

const TabContent = ({ selectedTab }: TabContentProps) => {

  switch (selectedTab) {
    case 'Promos':
      return (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Promos</Text>
          <Text style={styles.cardDescription}>Pequeña descripción de la categoría</Text>
          <View style={styles.productBox}>
            <View style={styles.productImagePlaceholder} />
            <View style={styles.productDetails}>
              <Text style={styles.productTitle}>Nombre del producto</Text>
              <Text style={styles.productDesc}>Esta es una descripción del producto que se busca vender...</Text>
              <View style={styles.priceContainer}>
                <Text style={styles.price}>$12.00</Text>
                <Text style={styles.oldPrice}>$15.00</Text>
              </View>
            </View>
          </View>
        </View>
      );
    case 'Los Favoritos':
      return <Text style={styles.contentText}>Contenido de Favoritos</Text>;
    case 'Categoría 1':
      return <Text style={styles.contentText}>Contenido de Categoría 1</Text>;
    case 'Categoría 2':
      return <Text style={styles.contentText}>Contenido de Categoría 2</Text>;
    default:
      return null;
  }
};

const RestaurantScreen = () => {
  const [selectedTab, setSelectedTab] = useState(TABS[0]);

  return (
    
    <View style={styles.container}>
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
      {/* Encabezado de información del restaurante */}
      <View style={styles.header}>
        <Text style={styles.restaurantName}>🍽 Restaurante</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoItem}>⏱ Delivery 30 min</Text>
          <Text style={styles.infoItem}>📍 Distancia 875 mts</Text>
          <Text style={styles.infoItem}>📂 Categoría China</Text>
        </View>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
        {TABS.map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setSelectedTab(tab)}
            style={styles.tab}
          >
            <Text style={[styles.tabText, selectedTab === tab && styles.activeTabText]}>
              {tab}
            </Text>
            {selectedTab === tab && <View style={styles.activeLine} />}
          </Pressable>
        ))}
      </ScrollView>

      {/* Contenido de la tab */}
      <ScrollView style={styles.contentContainer}>
        <TabContent selectedTab={selectedTab} />
      </ScrollView>
    </View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 40
  },
  header: {
    padding: 15,
    backgroundColor: '#f4f4f4',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20
  },
  restaurantName: {
    fontSize: 22,
    fontWeight: 'bold'
  },
  infoRow: {
    flexDirection: 'row',
    marginTop: 10,
    flexWrap: 'wrap'
  },
  infoItem: {
    marginRight: 15,
    fontSize: 14,
    color: '#555'
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#eee',
    paddingHorizontal: 10,
    marginTop: 10
  },
  tab: {
    marginRight: 20,
    alignItems: 'center',
    paddingBottom: 10
  },
  tabText: {
    fontSize: 16,
    color: '#999'
  },
  activeTabText: {
    color: '#6C00FF',
    fontWeight: 'bold'
  },
  activeLine: {
    height: 3,
    width: '100%',
    backgroundColor: '#6C00FF',
    marginTop: 5,
    borderRadius: 10
  },
  contentContainer: {
    padding: 15
  },
  contentText: {
    fontSize: 18,
    textAlign: 'left'
  },
  card: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 15
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold'
  },
  cardDescription: {
    fontSize: 14,
    color: '#777',
    marginBottom: 10
  },
  productBox: {
    flexDirection: 'row',
    marginTop: 10
  },
  productImagePlaceholder: {
    width: 100,
    height: 100,
    backgroundColor: '#ccc',
    borderRadius: 10
  },
  productDetails: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'space-between'
  },
  productTitle: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  productDesc: {
    fontSize: 14,
    color: '#555'
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000'
  },
  oldPrice: {
    fontSize: 14,
    color: '#888',
    marginLeft: 10,
    textDecorationLine: 'line-through'
  }
});

export default RestaurantScreen;
