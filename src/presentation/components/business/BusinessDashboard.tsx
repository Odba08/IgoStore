import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { igoApi } from '@/infrastructure/api/igo.api';
import { pickImageFromGallery, takePhotoWithCamera, uploadImage } from '@/infrastructure/services/imageUpload.service';

interface BusinessDashboardProps {
  user: any;
  onSwitchToClientMode?: () => void;
}

export const BusinessDashboard: React.FC<BusinessDashboardProps> = ({
  user,
  onSwitchToClientMode
}) => {
  const [loading, setLoading] = useState(true);
  const [myBusiness, setMyBusiness] = useState<any | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');

  // Modal Crear / Editar Producto
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [productTitle, setProductTitle] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productStock, setProductStock] = useState('10');
  const [productDescription, setProductDescription] = useState('');
  const [productImageUri, setProductImageUri] = useState<string | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);

  const fetchBusinessData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      // 1. Obtener el comercio propiedad de este usuario
      let biz: any = null;
      try {
        const res = await igoApi.get(`/business/owner/${user.id}`);
        biz = res.data;
      } catch (err) {
        // En caso de que no tenga ownerId explícito pero sea admin/business, buscar todos los comercios
        const allBizRes = await igoApi.get('/business');
        if (Array.isArray(allBizRes.data) && allBizRes.data.length > 0) {
          biz = allBizRes.data[0];
        }
      }

      if (!biz) {
        setMyBusiness(null);
        setLoading(false);
        return;
      }

      setMyBusiness(biz);

      // 2. Obtener productos de este comercio
      const prodRes = await igoApi.get(`/business/${biz.id}/products`);
      setProducts(prodRes.data || []);

      // 3. Obtener órdenes del negocio para métricas de ventas
      const ordersRes = await igoApi.get('/orders');
      const allOrders = ordersRes.data || [];
      const bizOrders = allOrders.filter((o: any) => o.business?.id === biz.id);
      setOrders(bizOrders);
    } catch (err: any) {
      console.error('Error loading business dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinessData();
  }, [user]);

  // Cálculos de métricas
  const totalSales = orders
    .filter((o) => o.status !== 'CANCELLED' && (o.isPaid || o.status === 'DELIVERED'))
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const activeOrdersCount = orders.filter(
    (o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED'
  ).length;

  const handleOpenCreateProduct = () => {
    setEditingProduct(null);
    setProductTitle('');
    setProductPrice('');
    setProductStock('10');
    setProductDescription('');
    setProductImageUri(null);
    setShowProductModal(true);
  };

  const handleOpenEditProduct = (prod: any) => {
    setEditingProduct(prod);
    setProductTitle(prod.title || '');
    setProductPrice(String(prod.price || ''));
    setProductStock(String(prod.stock ?? 10));
    setProductDescription(prod.description || '');
    const currentImg = prod.images && prod.images.length > 0 
      ? (typeof prod.images[0] === 'string' ? prod.images[0] : prod.images[0].url)
      : null;
    setProductImageUri(currentImg);
    setShowProductModal(true);
  };

  const handleDeleteProduct = (productId: string, productTitle: string) => {
    Alert.alert(
      'Eliminar Producto',
      `¿Estás seguro de que deseas eliminar "${productTitle}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await igoApi.delete(`/business/${myBusiness.id}/products/${productId}`);
              Alert.alert('Éxito', 'Producto eliminado correctamente.');
              await fetchBusinessData();
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || 'No se pudo eliminar el producto.');
            }
          }
        }
      ]
    );
  };

  const handlePickGalleryImage = async () => {
    const uri = await pickImageFromGallery();
    if (uri) setProductImageUri(uri);
  };

  const handleTakePhoto = async () => {
    const uri = await takePhotoWithCamera();
    if (uri) setProductImageUri(uri);
  };

  const handleSaveProduct = async () => {
    if (!productTitle.trim()) {
      Alert.alert('Campo requerido', 'Ingresa el nombre o título del producto.');
      return;
    }
    const priceNum = parseFloat(productPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert('Precio inválido', 'Ingresa un precio válido mayor a 0.');
      return;
    }
    const stockNum = parseInt(productStock, 10);

    setSavingProduct(true);
    try {
      let finalImgUrl = productImageUri;
      // Si la URI es un archivo local (file:// o content://), subirla primero
      if (productImageUri && (productImageUri.startsWith('file://') || productImageUri.startsWith('content://'))) {
        try {
          finalImgUrl = await uploadImage(productImageUri);
        } catch (imgErr) {
          console.warn('Error subiendo imagen de producto, continuando sin imagen nueva:', imgErr);
        }
      }

      const payload: any = {
        title: productTitle.trim(),
        price: priceNum,
        description: productDescription.trim(),
        stock: isNaN(stockNum) ? 10 : stockNum,
        images: finalImgUrl ? [finalImgUrl] : [],
      };

      if (editingProduct) {
        // Actualizar producto existente
        await igoApi.patch(`/business/${myBusiness.id}/products/${editingProduct.id}`, payload);
        Alert.alert('¡Actualizado! ✅', 'El producto se modificó con éxito.');
      } else {
        // Crear nuevo producto
        await igoApi.post(`/business/${myBusiness.id}/products`, payload);
        Alert.alert('¡Creado! 🎉', 'El nuevo producto fue añadido al catálogo.');
      }

      setShowProductModal(false);
      await fetchBusinessData();
    } catch (err: any) {
      console.error('Error saving product:', err);
      Alert.alert('Error', err.response?.data?.message || 'No se pudo guardar el producto.');
    } finally {
      setSavingProduct(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FFDB58" />
        <Text style={styles.loadingText}>Cargando panel de tu negocio...</Text>
      </View>
    );
  }

  if (!myBusiness) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="storefront-outline" size={64} color="#CBD5E1" />
        <Text style={styles.emptyTitle}>Comercio no asignado</Text>
        <Text style={styles.emptySub}>
          Tu usuario tiene permisos de negocio, pero aún no tiene una tienda vinculada.
          Comunícate con soporte para asignarte un comercio.
        </Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={fetchBusinessData}>
          <Ionicons name="refresh" size={18} color="#000" style={{ marginRight: 6 }} />
          <Text style={styles.primaryBtnText}>Reintentar</Text>
        </TouchableOpacity>
        {onSwitchToClientMode && (
          <TouchableOpacity style={styles.switchModeBtn} onPress={onSwitchToClientMode}>
            <Text style={styles.switchModeBtnText}>Ver Tienda como Cliente</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER DE LA TIENDA */}
      <View style={styles.header}>
        <View style={styles.businessInfoRow}>
          {myBusiness.imageUrl ? (
            <Image source={{ uri: myBusiness.imageUrl }} style={styles.businessLogo} />
          ) : (
            <View style={styles.businessLogoPlaceholder}>
              <Ionicons name="storefront" size={24} color="#D97706" />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.businessName} numberOfLines={1}>{myBusiness.name}</Text>
              <Ionicons name="checkmark-circle" size={18} color="#10B981" />
            </View>
            <Text style={styles.businessRoleText}>Panel de Administración de Tienda</Text>
          </View>

          {onSwitchToClientMode && (
            <TouchableOpacity style={styles.clientModeToggle} onPress={onSwitchToClientMode}>
              <Ionicons name="eye-outline" size={16} color="#334155" />
              <Text style={styles.clientModeToggleText}>Ver Cliente</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* TARJETAS DE MÉTRICAS */}
        <View style={styles.metricsContainer}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Total Vendido</Text>
            <Text style={styles.metricValue}>${totalSales.toFixed(2)}</Text>
            <Ionicons name="trending-up" size={18} color="#10B981" style={styles.metricIcon} />
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Pedidos Activos</Text>
            <Text style={[styles.metricValue, { color: activeOrdersCount > 0 ? '#D97706' : '#1E293B' }]}>
              {activeOrdersCount}
            </Text>
            <Ionicons name="receipt-outline" size={18} color="#D97706" style={styles.metricIcon} />
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Productos</Text>
            <Text style={styles.metricValue}>{products.length}</Text>
            <Ionicons name="cube-outline" size={18} color="#6366F1" style={styles.metricIcon} />
          </View>
        </View>
      </View>

      {/* TABS SELECTOR */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'products' && styles.activeTabButton]}
          onPress={() => setActiveTab('products')}
        >
          <Ionicons
            name="cube"
            size={18}
            color={activeTab === 'products' ? '#1E293B' : '#94A3B8'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.tabButtonText, activeTab === 'products' && styles.activeTabButtonText]}>
            Mis Productos ({products.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'orders' && styles.activeTabButton]}
          onPress={() => setActiveTab('orders')}
        >
          <Ionicons
            name="receipt"
            size={18}
            color={activeTab === 'orders' ? '#1E293B' : '#94A3B8'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.tabButtonText, activeTab === 'orders' && styles.activeTabButtonText]}>
            Pedidos ({orders.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* CONTENIDO SEGÚN TAB */}
      {activeTab === 'products' ? (
        <View style={{ flex: 1 }}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Catálogo de Productos</Text>
            <TouchableOpacity style={styles.addProductBtn} onPress={handleOpenCreateProduct}>
              <Ionicons name="add" size={18} color="#000" style={{ marginRight: 4 }} />
              <Text style={styles.addProductBtnText}>Nuevo Producto</Text>
            </TouchableOpacity>
          </View>

          {products.length === 0 ? (
            <View style={styles.emptyProductsBox}>
              <Ionicons name="pricetags-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyProductsText}>Aún no has agregado productos a tu tienda.</Text>
              <TouchableOpacity style={styles.addProductBtnSmall} onPress={handleOpenCreateProduct}>
                <Text style={styles.addProductBtnText}>+ Agregar Primer Producto</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={products}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 100 }}
              renderItem={({ item }) => {
                const imgUrl = item.images && item.images.length > 0 
                  ? (typeof item.images[0] === 'string' ? item.images[0] : item.images[0].url)
                  : null;

                return (
                  <View style={styles.productCard}>
                    {imgUrl ? (
                      <Image source={{ uri: imgUrl }} style={styles.productThumb} />
                    ) : (
                      <View style={styles.productThumbPlaceholder}>
                        <Ionicons name="image-outline" size={24} color="#94A3B8" />
                      </View>
                    )}

                    <View style={styles.productInfo}>
                      <Text style={styles.productTitle} numberOfLines={1}>{item.title}</Text>
                      {item.description ? (
                        <Text style={styles.productDesc} numberOfLines={2}>{item.description}</Text>
                      ) : null}
                      <View style={styles.productMetaRow}>
                        <Text style={styles.productPrice}>${Number(item.price).toFixed(2)}</Text>
                        <Text style={styles.productStock}>Stock: {item.stock ?? 10}</Text>
                      </View>
                    </View>

                    <View style={styles.productActions}>
                      <TouchableOpacity
                        style={[styles.iconActionBtn, { backgroundColor: '#EFF6FF' }]}
                        onPress={() => handleOpenEditProduct(item)}
                      >
                        <Ionicons name="pencil" size={18} color="#2563EB" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.iconActionBtn, { backgroundColor: '#FEF2F2' }]}
                        onPress={() => handleDeleteProduct(item.id, item.title)}
                      >
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
            />
          )}
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 100 }}
          ListEmptyComponent={() => (
            <View style={styles.emptyProductsBox}>
              <Ionicons name="receipt-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyProductsText}>Aún no has recibido pedidos en tu tienda.</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={styles.orderCard}>
              <View style={styles.orderHeaderRow}>
                <Text style={styles.orderNumber}>Orden #{String(item.orderNumber).padStart(4, '0')}</Text>
                <View style={[styles.statusBadge, { 
                  backgroundColor: item.status === 'DELIVERED' ? '#DEF7EC' : '#FEF3C7' 
                }]}>
                  <Text style={[styles.statusBadgeText, { 
                    color: item.status === 'DELIVERED' ? '#03543F' : '#92400E' 
                  }]}>
                    {item.status}
                  </Text>
                </View>
              </View>

              <Text style={styles.orderCustomer}>
                Cliente: {item.user?.fullName || item.userIdTemp || 'Cliente IGO'}
              </Text>
              <Text style={styles.orderAddress} numberOfLines={1}>
                📍 {item.deliveryAddress}
              </Text>

              {item.items && item.items.length > 0 && (
                <View style={styles.orderItemsContainer}>
                  {item.items.map((it: any, idx: number) => (
                    <Text key={idx} style={styles.orderItemRow}>
                      • {it.quantity}x {it.product?.title || 'Producto'} (${Number(it.price).toFixed(2)})
                    </Text>
                  ))}
                </View>
              )}

              <View style={styles.orderFooterRow}>
                <Text style={styles.orderTotal}>Total: ${Number(item.totalAmount || 0).toFixed(2)}</Text>
                <Text style={[styles.orderPaymentStatus, { color: item.isPaid ? '#10B981' : '#F59E0B' }]}>
                  {item.isPaid ? 'Pagado ✅' : 'Pago al recibir / Pendiente'}
                </Text>
              </View>
            </View>
          )}
        />
      )}

      {/* MODAL CREAR / EDITAR PRODUCTO */}
      <Modal
        visible={showProductModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!savingProduct) setShowProductModal(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowProductModal(false)}
                disabled={savingProduct}
              >
                <Ionicons name="close-circle" size={26} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 25 }}>
              {/* IMAGEN DEL PRODUCTO */}
              <View style={styles.imagePickerSection}>
                {productImageUri ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: productImageUri }} style={styles.imagePreview} />
                    <TouchableOpacity
                      style={styles.removeImageBtn}
                      onPress={() => setProductImageUri(null)}
                      disabled={savingProduct}
                    >
                      <Ionicons name="trash" size={16} color="white" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.imagePlaceholderBox}>
                    <Ionicons name="cloud-upload-outline" size={36} color="#94A3B8" />
                    <Text style={styles.imagePlaceholderText}>Sube una foto atractiva del producto</Text>
                  </View>
                )}

                <View style={styles.imageButtonsRow}>
                  <TouchableOpacity
                    style={styles.mediaBtn}
                    onPress={handlePickGalleryImage}
                    disabled={savingProduct}
                  >
                    <Ionicons name="images-outline" size={18} color="#334155" style={{ marginRight: 6 }} />
                    <Text style={styles.mediaBtnText}>Galería</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.mediaBtn}
                    onPress={handleTakePhoto}
                    disabled={savingProduct}
                  >
                    <Ionicons name="camera-outline" size={18} color="#334155" style={{ marginRight: 6 }} />
                    <Text style={styles.mediaBtnText}>Cámara</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* CAMPOS DEL FORMULARIO */}
              <Text style={styles.inputLabel}>Título / Nombre del Producto *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ej. Hamburguesa Doble Queso"
                value={productTitle}
                onChangeText={setProductTitle}
                editable={!savingProduct}
              />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Precio en USD ($) *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ej. 8.50"
                    keyboardType="numeric"
                    value={productPrice}
                    onChangeText={setProductPrice}
                    editable={!savingProduct}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Stock Disponible</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ej. 25"
                    keyboardType="number-pad"
                    value={productStock}
                    onChangeText={setProductStock}
                    editable={!savingProduct}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Descripción del Producto</Text>
              <TextInput
                style={[styles.textInput, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Ingredientes, porciones, detalles..."
                multiline
                numberOfLines={3}
                value={productDescription}
                onChangeText={setProductDescription}
                editable={!savingProduct}
              />

              <TouchableOpacity
                style={[styles.saveBtn, savingProduct && { opacity: 0.6 }]}
                onPress={handleSaveProduct}
                disabled={savingProduct}
              >
                {savingProduct ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#000" style={{ marginRight: 6 }} />
                    <Text style={styles.saveBtnText}>
                      {editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#F8FAFC',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 16,
  },
  emptySub: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFDB58',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 20,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#000',
  },
  switchModeBtn: {
    marginTop: 15,
    padding: 10,
  },
  switchModeBtnText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: 'bold',
  },
  header: {
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  businessInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  businessLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  businessLogoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  businessName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  businessRoleText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  clientModeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  clientModeToggleText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#334155',
  },
  metricsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 4,
  },
  metricIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    marginRight: 20,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabButton: {
    borderBottomColor: '#FFDB58',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  activeTabButtonText: {
    color: '#1E293B',
    fontWeight: 'bold',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  addProductBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFDB58',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  addProductBtnSmall: {
    backgroundColor: '#FFDB58',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 15,
  },
  addProductBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#000',
  },
  emptyProductsBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 20,
  },
  emptyProductsText: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 10,
    textAlign: 'center',
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  productThumb: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  productThumbPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  productTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  productDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  productMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#10B981',
  },
  productStock: {
    fontSize: 12,
    color: '#64748B',
  },
  productActions: {
    flexDirection: 'column',
    gap: 6,
  },
  iconActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  orderHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  orderCustomer: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  orderAddress: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  orderItemsContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    marginVertical: 8,
    gap: 2,
  },
  orderItemRow: {
    fontSize: 12,
    color: '#475569',
  },
  orderFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  orderTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  orderPaymentStatus: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  imagePickerSection: {
    alignItems: 'center',
    marginBottom: 15,
  },
  imagePreviewContainer: {
    position: 'relative',
    width: 120,
    height: 120,
    borderRadius: 14,
    overflow: 'hidden',
  },
  imagePreview: {
    width: 120,
    height: 120,
    borderRadius: 14,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 6,
    borderRadius: 20,
  },
  imagePlaceholderBox: {
    width: '100%',
    height: 100,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  imagePlaceholderText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
  },
  imageButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  mediaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  mediaBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
    marginTop: 10,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1E293B',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFDB58',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
});
