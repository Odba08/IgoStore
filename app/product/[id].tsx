import React, { useState } from 'react';
import { 
  View, Text, Image, StyleSheet, ScrollView, 
  TouchableOpacity, ActivityIndicator, Alert, TextInput
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
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [showSpecialInstructionsPanel, setShowSpecialInstructionsPanel] = useState(false);

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
        setCollapsedGroups(prev => ({ ...prev, [groupTitle]: true }));
        return;
    }
    const currentChoiceQty = groupSelections[choice.name] || 0;
    const totalInGroup = Object.values(groupSelections).reduce((a, b) => a + b, 0);
    if (delta > 0 && totalInGroup >= maxAllowed) return;
    const newQty = Math.max(0, currentChoiceQty + delta);
    const newGroupSelections = { ...groupSelections, [choice.name]: newQty };
    if (newQty === 0) delete newGroupSelections[choice.name];
    setSelectedOptions(prev => ({ ...prev, [groupTitle]: newGroupSelections }));

    const newTotal = Object.values(newGroupSelections).reduce((a: number, b: number) => a + b, 0);
    if (newTotal === maxAllowed) {
      setCollapsedGroups(prev => ({ ...prev, [groupTitle]: true }));
    }
  };

  let extrasTotal = 0;
  product.options?.forEach((group: any) => {
      const groupSelections = selectedOptions[group.title] || {};
      group.choices.forEach((choice: any) => extrasTotal += (choice.additionalPrice * (groupSelections[choice.name] || 0)));
  });

  const getSelectedOptionsText = () => {
    const list: string[] = [];
    product.options?.forEach((group: any) => {
      const groupSelections = selectedOptions[group.title] || {};
      const choicesText: string[] = [];
      
      Object.entries(groupSelections).forEach(([choiceName, qty]) => {
        if (qty > 0) {
          if (qty === 1) {
            choicesText.push(choiceName);
          } else {
            choicesText.push(`${qty}x ${choiceName}`);
          }
        }
      });
      
      if (choicesText.length > 0) {
        list.push(`${group.title}: ${choicesText.join(', ')}`);
      }
    });

    if (specialInstructions.trim() !== '') {
      list.push(`Notas de cocina: "${specialInstructions.trim()}"`);
    }

    return list.join(' | ');
  };

  const catName = product.business?.category?.name?.toLowerCase() || '';
  const isFoodProduct = catName.includes('comida') || 
                        catName.includes('restaurante') || 
                        catName.includes('hamburguesa') || 
                        catName.includes('pizza') || 
                        catName.includes('sushi') || 
                        catName.includes('cafe') ||
                        product.tags?.some((t: string) => {
                          const lt = t.toLowerCase();
                          return lt.includes('comida') || lt.includes('restaurante') || lt.includes('fastfood') || lt.includes('cafe');
                        });

  const basePrice = (product?.isPromo ? product?.discountPrice : product?.price) || 0;
  const finalUnitTestPrice = basePrice + extrasTotal;
  const totalPrice = finalUnitTestPrice * quantity;

  return (
   <View style={styles.container}>
      <StatusBar style="dark" />
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={22} color="#1a1a1a" />
      </TouchableOpacity>
        
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: product.images?.[0]?.url }} style={styles.productImage} resizeMode="contain" />
        </View>

        <View style={styles.detailsContainer}>
            {/* Tags / Etiquetas */}
            {product.tags && product.tags.length > 0 && (
              <View style={styles.tagContainer}>
                {product.tags.map((tag: string, index: number) => (
                  <View key={index} style={styles.tagPill}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            <Text style={styles.title}>{product.title}</Text>
            
            {/* Stock e Indicador de Disponibilidad */}
            <View style={styles.metaRow}>
              {product.stock <= 5 ? (
                <Text style={styles.stockLow}>¡Solo quedan {product.stock} disponibles!</Text>
              ) : (
                <Text style={styles.stockOk}>Disponible ({product.stock} uds.)</Text>
              )}
              {product.weight !== undefined && product.weight > 0 && (
                <Text style={styles.weightText}> • {product.weight} kg</Text>
              )}
            </View>

            {/* Visualización de Precios */}
            <View style={styles.priceContainer}>
              {product.isPromo ? (
                <View style={styles.priceRow}>
                  <Text style={styles.promoPrice}>${(product.discountPrice ?? 0).toFixed(2)}</Text>
                  <Text style={styles.originalPrice}>${product.price.toFixed(2)}</Text>
                  <View style={styles.promoBadge}>
                    <Text style={styles.promoBadgeText}>OFERTA</Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.price}>${product.price.toFixed(2)}</Text>
              )}
            </View>

            {/* Sección de Descripción */}
            {product.description && product.description.trim() !== "" && (
              <View style={styles.descriptionSection}>
                <Text style={styles.sectionHeading}>Descripción</Text>
                <Text style={styles.descriptionText}>{product.description}</Text>
              </View>
            )}

            {/* Opciones y extras configurables */}
            {product.options && product.options.length > 0 && (
              <View style={{ marginTop: 15 }}>
                <Text style={styles.sectionHeading}>Personaliza tu orden</Text>
                
                {product.options.map((optionGroup: any, gIdx: number) => {
                     const groupSelections = selectedOptions[optionGroup.title] || {};
                     const isCollapsed = collapsedGroups[optionGroup.title] || false;
                     const isSingle = optionGroup.maxAllowed === 1;
                     const totalSelected = Object.values(groupSelections).reduce((a: number, b: number) => a + b, 0);
                     const isCompleted = totalSelected === optionGroup.maxAllowed;
                     
                     return (
                        <View key={gIdx} style={styles.groupContainer}>
                            <TouchableOpacity style={styles.groupHeader} onPress={() => toggleGroup(optionGroup.title)}>
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.sectionTitle}>{optionGroup.title}</Text>
                                  <Text style={styles.sectionSubtitle}>
                                    {isSingle ? 'Selecciona 1 opción' : `Selecciona hasta ${optionGroup.maxAllowed} opciones`}
                                    {optionGroup.isRequired ? ' • Obligatorio' : ' • Opcional'}
                                  </Text>
                                </View>
                                {isCompleted ? (
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                    <Ionicons name="checkmark-circle" size={18} color="#00A86B" />
                                    <Ionicons name={isCollapsed ? "chevron-down" : "chevron-up"} size={20} color="#00A86B" />
                                  </View>
                                ) : (
                                  <Ionicons name={isCollapsed ? "chevron-down" : "chevron-up"} size={20} color="#555" />
                                )}
                            </TouchableOpacity>
                            
                            {!isCollapsed && (
                                <View style={styles.groupBody}>
                                    {optionGroup.choices.map((choice: any, cIdx: number) => {
                                        const qty = groupSelections[choice.name] || 0;
                                        const isSelected = qty > 0;
                                        
                                        if (isSingle) return (
                                            <TouchableOpacity key={cIdx} style={styles.radioRow} onPress={() => handleOptionQuantity(optionGroup.title, choice, 1, 1)}>
                                                <Ionicons name={isSelected ? "radio-button-on" : "radio-button-off"} size={22} color={isSelected ? "#EDB422" : "#999"} />
                                                <Text style={styles.choiceName}>{choice.name}</Text>
                                                {choice.additionalPrice > 0 && (
                                                  <Text style={styles.choicePrice}>+ ${choice.additionalPrice.toFixed(2)}</Text>
                                                )}
                                            </TouchableOpacity>
                                        );
                                        
                                        return (
                                            <View key={cIdx} style={styles.stepperRow}>
                                                <View style={{ flex: 1 }}>
                                                  <Text style={styles.choiceName}>{choice.name}</Text>
                                                  {choice.additionalPrice > 0 && (
                                                    <Text style={styles.choicePrice}>+ ${choice.additionalPrice.toFixed(2)}</Text>
                                                  )}
                                                </View>
                                                <View style={styles.stepperControls}>
                                                    <TouchableOpacity style={styles.stepperBtn} onPress={() => handleOptionQuantity(optionGroup.title, choice, optionGroup.maxAllowed, -1)}>
                                                      <Ionicons name="remove" size={16} color={qty > 0 ? "#1a1a1a" : "#ccc"} />
                                                    </TouchableOpacity>
                                                    <Text style={styles.stepperValue}>{qty}</Text>
                                                    <TouchableOpacity style={styles.stepperBtn} onPress={() => handleOptionQuantity(optionGroup.title, choice, optionGroup.maxAllowed, 1)}>
                                                      <Ionicons name="add" size={16} color="#1a1a1a" />
                                                    </TouchableOpacity>
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
            )}

            {/* Notas Especiales para Comida (Panel Extensible) */}
            {isFoodProduct && (
              <View style={styles.specialInstructionsCard}>
                <TouchableOpacity 
                  style={styles.specialInstructionsHeader} 
                  onPress={() => setShowSpecialInstructionsPanel(!showSpecialInstructionsPanel)}
                >
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="restaurant-outline" size={18} color="#1a1a1a" />
                    <Text style={styles.sectionHeading2}>Instrucciones de Cocina / Notas</Text>
                  </View>
                  <Ionicons name={showSpecialInstructionsPanel ? "chevron-up" : "chevron-down"} size={18} color="#555" />
                </TouchableOpacity>
                
                {showSpecialInstructionsPanel && (
                  <View style={styles.specialInstructionsBody}>
                    <TextInput
                      style={styles.notesInput}
                      placeholder="Ej: Sin cebolla, sin verduras, salsas aparte, etc..."
                      placeholderTextColor="#999"
                      value={specialInstructions}
                      onChangeText={setSpecialInstructions}
                      multiline={true}
                      numberOfLines={2}
                    />
                  </View>
                )}
              </View>
            )}
        </View>
      </ScrollView>

      {/* FOOTER: PASOS DE CANTIDAD E INGRESO AL CARRITO */}
      <View style={styles.footer}>
          <View style={styles.qtyContainer}>
            <TouchableOpacity 
              style={styles.qtyBtn} 
              onPress={() => setQuantity(prev => Math.max(1, prev - 1))}
            >
              <Ionicons name="remove" size={20} color="#1a1a1a" />
            </TouchableOpacity>
            <Text style={styles.qtyText}>{quantity}</Text>
            <TouchableOpacity 
              style={styles.qtyBtn} 
              onPress={() => setQuantity(prev => prev + 1)}
            >
              <Ionicons name="add" size={20} color="#1a1a1a" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.addToCartButton} onPress={() => {
              const optionText = getSelectedOptionsText();
              addItem({ 
                id: `${product.id}-${optionText}`, 
                productId: product.id,
                title: product.title, 
                price: finalUnitTestPrice, 
                quantity: quantity, 
                businessId: product.business?.id || '',
                image: product.images?.[0]?.url || '',
                selectedOptionsText: optionText
              });
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
  scrollContent: { paddingBottom: 150 },
  imageContainer: { width: '100%', height: 350, backgroundColor: '#FAF9F6', justifyContent: 'center', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  productImage: { width: '85%', height: '85%' },
  detailsContainer: { padding: 20 },
  
  title: { fontSize: 26, fontWeight: '900', color: '#1a1a1a', marginBottom: 8 },
  
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  stockLow: { fontSize: 13, fontWeight: '700', color: '#EF4444' },
  stockOk: { fontSize: 13, fontWeight: '700', color: '#00A86B' },
  weightText: { fontSize: 13, color: '#666', fontWeight: '500' },
  
  tagContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  tagPill: { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tagText: { fontSize: 11, color: '#4B5563', fontWeight: '700', textTransform: 'uppercase' },

  priceContainer: { marginBottom: 20 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  price: { fontSize: 24, fontWeight: '900', color: '#1a1a1a' },
  promoPrice: { fontSize: 26, fontWeight: '900', color: '#00A86B' },
  originalPrice: { fontSize: 18, color: '#9CA3AF', textDecorationLine: 'line-through', fontWeight: '500' },
  promoBadge: { backgroundColor: '#EF4444', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  promoBadgeText: { color: 'white', fontSize: 10, fontWeight: '800' },

  descriptionSection: { backgroundColor: '#F9FAFB', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#F3F4F6', marginBottom: 20 },
  sectionHeading: { fontSize: 16, fontWeight: '800', color: '#1a1a1a', marginBottom: 10 },
  descriptionText: { fontSize: 14, color: '#4B5563', lineHeight: 20 },

  groupContainer: { marginBottom: 15, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#F9FAFB' },
  groupBody: { padding: 16, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1a1a1a' },
  sectionSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2, fontWeight: '500' },

  choiceName: { fontSize: 15, marginLeft: 12, color: '#374151', fontWeight: '600', flex: 1 },
  choicePrice: { fontSize: 13, color: '#6B7280', fontWeight: '700', marginRight: 10 },

  stepperRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  radioRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  
  stepperControls: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 20, paddingHorizontal: 4 },
  stepperBtn: { padding: 8 },
  stepperValue: { width: 24, textAlign: 'center', fontWeight: '800', fontSize: 14, color: '#1a1a1a' },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#E5E7EB', flexDirection: 'row', gap: 15, alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 10 },
  
  qtyContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#1a1a1a', borderRadius: 25, paddingHorizontal: 8, height: 50 },
  qtyBtn: { padding: 10 },
  qtyText: { width: 30, textAlign: 'center', fontWeight: '900', fontSize: 16, color: '#1a1a1a' },

  addToCartButton: { backgroundColor: '#FFDB58', height: 50, borderRadius: 25, flex: 1, alignItems: 'center', justifyContent: 'center', shadowColor: '#FFDB58', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  addToCartText: { fontWeight: '900', fontSize: 16, color: '#1a1a1a' },
  backButton: { position: 'absolute', top: 50, left: 20, zIndex: 10, width: 44, height: 44, backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 22, alignItems: 'center', justifyContent: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
  
  specialInstructionsCard: { marginTop: 15, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden', backgroundColor: 'white' },
  specialInstructionsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#FAF9F6' },
  sectionHeading2: { fontSize: 15, fontWeight: '800', color: '#1a1a1a' },
  specialInstructionsBody: { padding: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  notesInput: { backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12, fontSize: 14, color: '#1E293B', borderWidth: 1, borderColor: '#E5E7EB', textAlignVertical: 'top', height: 70 }
});