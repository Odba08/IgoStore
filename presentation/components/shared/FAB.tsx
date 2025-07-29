import { Ionicons } from "@expo/vector-icons";
import { View, StyleSheet, ViewStyle, StyleProp, TouchableOpacity} from "react-native";

interface Props {
  iconName: keyof typeof Ionicons.glyphMap
  onPress: ()=> void;
  style?: StyleProp<ViewStyle>;
}

const FAB = ({onPress, style, iconName}:Props) => {
    return (
    <View style={[styles.btn, style]} >
      <TouchableOpacity
      onPress={onPress}>
        <Ionicons  name={iconName} color="white" size={33}/>

      </TouchableOpacity>
    
    </View>
  );
}

export default FAB;

const styles = StyleSheet.create({
btn:{
  zIndex:1,
  position: 'absolute',
  height: 50,
  width: 50,
  backgroundColor: 'black',
  borderRadius: 30,
  shadowOpacity: 0.3,
  alignItems: 'center',
  shadowOffset: {
    height: 0.27,
    width: 4.5
  },
  elevation: 5,
  justifyContent: 'center'
}
})