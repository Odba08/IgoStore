import React from "react";
import { View, ActivityIndicator, Image } from "react-native";
import LottieView from "lottie-react-native";

interface LoadingScreenProps {
  imageSource?: any; 
  spinnerColor?: string;
  useLottie?: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  imageSource,
  spinnerColor = "#FFC93C",
  useLottie = false,
}) => {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0F0330" }}>
      {useLottie ? (
        <LottieView
          source={require("../../../../assets/igo-login-icon.json")}
          autoPlay
          loop
          style={{ width: 140, height: 140 }}
          resizeMode="contain"
        />
      ) : (
        <>
          <Image
            source={imageSource || require("../../../../assets/images/splash-icon.png")}
            style={{ width: 150, height: 150, marginBottom: 16 }}
            resizeMode="contain"
          />
          <ActivityIndicator size="large" color={spinnerColor} />
        </>
      )}
    </View>
  );
};

export default LoadingScreen;
