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
  useLottie = true,
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
          {imageSource && (
            <Image
              source={imageSource}
              style={{ width: 120, height: 120, marginBottom: 20 }}
              resizeMode="contain"
            />
          )}
          <ActivityIndicator size="large" color={spinnerColor} />
        </>
      )}
    </View>
  );
};

export default LoadingScreen;
