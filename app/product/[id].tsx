import React, { useState } from 'react';
import { 
  View, Text, Image, StyleSheet, ScrollView, 
  TouchableOpacity, ActivityIndicator, Alert, 
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useProduct } from '@/presentation/hooks/useProducts';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useCartStore } from '@/presentation/store/useCartStore';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams(); 
  const router = useRouter();
  
  const addItem = useCartStore((state) => state.addItem);
  
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, Record<string, number>>>({});
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const { data: product, isLoading } = useProduct(id as string);

  const toggleGroup = (groupTitle: string) => {
    setCollapsedGroups(prev => ({ ...prev, [groupTitle]: !prev[groupTitle] }));
  };

  if (isLoading) return <View style={styles.center}><ActivityIndicator size="large" color="#FFDB58" /></View>;
  if (!product) return null;

  const handleOptionQuantity = (groupTitle: string, choice: { name: string; additionalPrice: number }, maxAllowed: number, delta: number) => {
    const groupSelections = selectedOptions[groupTitle] || {};
    if (maxAllowed === 1) {
        setSelectedOptions(prev => ({ ...prev, [groupTitle]: { [choice.name]: 1 } }));
        return;
    }
    const currentChoiceQty = groupSelections[choice.name] || 0;
    const totalInGroup = Object.values(groupSelections).reduce((a, b) => a + b, 0);
    if (delta > 0 && totalInGroup >= maxAllowed) return;
    const newQty = Math.max(0, currentChoiceQty + delta);
    const newGroupSelections = { ...groupSelections, [choice.name]: newQty };
    if (newQty === 0) delete newGroupSelections[choice.name];
    setSelectedOptions(prev => ({ ...prev, [groupTitle]: newGroupSelections }));
  };

  let extrasTotal = 0;
  product.options?.forEach((group: any) => {
      const groupSelections = selectedOptions[group.title] || {};
      group.choices.forEach((choice: any) => extrasTotal += (choice.additionalPrice * (groupSelections[choice.name] || 0)));
  });

  const finalUnitTestPrice = (product.isPromo ? product.discountPrice : product.price) + extrasTotal;
  const totalPrice = finalUnitTestPrice * quantity;

  return (
   <View style={styles.container}>
      <StatusBar style="dark" />
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}><Ionicons name="arrow-back" size={24} /></TouchableOpacity>
        
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.imageContainer}><Image source={{ uri: product.images?.[0]?.url }} style={styles.productImage} resizeMode="contain" /></View>

        <View style={styles.detailsContainer}>
            <Text style={styles.title}>{product.title}</Text>
            {product.options?.map((optionGroup: any, gIdx: number) => {
                 const groupSelections = selectedOptions[optionGroup.title] || {};
                 const isCollapsed = collapsedGroups[optionGroup.title] || false;
                 const isSingle = optionGroup.maxAllowed === 1;
                 const isQuantitative = optionGroup.maxAllowed > 1 && optionGroup.allowRepeated === true;
                 
                 return (
                    <View key={gIdx} style={styles.groupContainer}>
                        <TouchableOpacity style={styles.groupHeader} onPress={() => toggleGroup(optionGroup.title)}>
                            <Text style={styles.sectionTitle}>{optionGroup.title}</Text>
                            <Ionicons name={isCollapsed ? "chevron-down" : "chevron-up"} size={20} />
                        </TouchableOpacity>
                        {!isCollapsed && (
                            <View style={styles.groupBody}>
                                {optionGroup.choices.map((choice: any, cIdx: number) => {
                                    const qty = groupSelections[choice.name] || 0;
                                    const isSelected = qty > 0;
                                    
                                    if (isSingle) return (
                                        <TouchableOpacity key={cIdx} style={styles.radioRow} onPress={() => handleOptionQuantity(optionGroup.title, choice, 1, 1)}>
                                            <Ionicons name={isSelected ? "radio-button-on" : "radio-button-off"} size={24} />
                                            <Text style={styles.stepperName}>{choice.name}</Text>
                                        </TouchableOpacity>
                                    );
                                    
                                    return (
                                        <View key={cIdx} style={styles.stepperRow}>
                                            <Text style={styles.stepperName}>{choice.name}</Text>
                                            <View style={styles.stepperControls}>
                                                <TouchableOpacity style={styles.stepperBtn} onPress={() => handleOptionQuantity(optionGroup.title, choice, optionGroup.maxAllowed, -1)}><Ionicons name="remove" size={18} /></TouchableOpacity>
                                                <Text style={styles.stepperValue}>{qty}</Text>
                                                <TouchableOpacity style={styles.stepperBtn} onPress={() => handleOptionQuantity(optionGroup.title, choice, optionGroup.maxAllowed, 1)}><Ionicons name="add" size={18} /></TouchableOpacity>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                    </View>
                 );
            })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
          <TouchableOpacity style={styles.addToCartButton} onPress={() => {
              addItem({ id: product.id, title: product.title, price: finalUnitTestPrice, quantity: quantity, businessId: product.business?.id });
              router.back(); 
          }}>
              <Text style={styles.addToCartText}>Agregar • ${totalPrice.toFixed(2)}</Text>
          </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 140 },
  imageContainer: { width: '100%', height: 350, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  productImage: { width: '80%', height: '80%' },
  detailsContainer: { padding: 20 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 10 },
  groupContainer: { marginBottom: 15 },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, backgroundColor: '#F9F9F9', borderRadius: 10 },
  groupBody: { padding: 10 },
  sectionTitle: { fontWeight: 'bold' },
  stepperRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  radioRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  stepperControls: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#EEE', borderRadius: 8 },
  stepperBtn: { padding: 10 },
  stepperValue: { width: 30, textAlign: 'center', fontWeight: 'bold' },
  stepperName: { fontSize: 15, marginLeft: 10 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#EEE' },
  addToCartButton: { backgroundColor: '#FFDB58', height: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  addToCartText: { fontWeight: 'bold' },
  backButton: { position: 'absolute', top: 50, left: 20, zIndex: 10, padding: 10, backgroundColor: 'white', borderRadius: 20 }
});