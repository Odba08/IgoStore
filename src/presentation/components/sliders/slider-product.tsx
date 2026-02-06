import React from "react";
import {
  Image,
  StyleSheet,
  Dimensions,
  View,
  ImageSourcePropType,
  ImageStyle,
  ViewStyle,
  TouchableOpacity,
  ScrollView,
} from "react-native";

const { width } = Dimensions.get("window");
const IMAGE_SIZE = width / 3.3 - 12; 

type Props = {
  images: ImageSourcePropType[];
  imageStyle?: ImageStyle;
  containerStyle?: ViewStyle;
  onImagePress?: (image: ImageSourcePropType, index: number) => void;
  columns?: number;
};

const SliderProduct: React.FC<Props> = ({
  images = [],
  onImagePress,
  imageStyle,
  containerStyle,
}) => {
  const groupedColumns: ImageSourcePropType[][] = [];
  for (let i = 0; i < images.length; i += 1) {
    groupedColumns.push(images.slice(i, i + 1));
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.container, containerStyle]}
    >
      <View style={styles.row}>
        {groupedColumns.map((column, colIndex) => (
          <View key={colIndex} style={styles.column}>
            {column.map((img, rowIndex) => (
              <TouchableOpacity
                key={rowIndex}
                onPress={() => onImagePress?.(img, colIndex * 2 + rowIndex)}
              >
                <Image
                  source={img}
                  style={[
                    styles.image,
                    { width: IMAGE_SIZE, height: IMAGE_SIZE },
                    imageStyle,
                  ]}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
  },
  row: {
    flexDirection: "row",
  },
  column: {
    flexDirection: "column",
    marginHorizontal: 4,
  },
  image: {
    marginVertical: 4,
    borderRadius: 8,
  },
});

export default SliderProduct;
