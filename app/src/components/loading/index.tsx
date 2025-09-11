import React from "react";
import { View, ActivityIndicator, Image } from "react-native";

interface LoadingScreenProps {
  imageSource: any; 
  spinnerColor?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  imageSource,
  spinnerColor = "#0000ff",
}) => {
  return (

    
    <View style={{ flex: 1, justifyContent: "center",alignItems: "center" }}>
      <Image
        source={imageSource}
        style={{ width: 120, height: 120, marginBottom: 20 }}
        resizeMode="contain"
      />
      <ActivityIndicator size="large" color={spinnerColor} />
    </View>
  );
};

export default LoadingScreen;
