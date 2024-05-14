import { useAppState } from "@react-native-community/hooks";
import { useIsFocused } from "@react-navigation/native";
import { useEffect, useRef } from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";

import { Stack } from "expo-router";
import { useTensorflowModel } from "react-native-fast-tflite";
import {
  Camera,
  useCameraDevice,
  useCameraFormat,
  useCameraPermission,
  useFrameProcessor,
} from "react-native-vision-camera";
import { useResizePlugin } from "vision-camera-resize-plugin";
import { classes } from "./classes";

export default function CameraPage() {
  const camera = useRef<Camera>(null);

  const plugin = useTensorflowModel(require("../assets/model/mobilenet_v1_1.0_224_quant.tflite"));
  const model = plugin.state === "loaded" ? plugin.model : undefined;

  const { resize } = useResizePlugin();
  const frameProcessor = useFrameProcessor(
    (frame) => {
      "worklet";
      if (model == null) return;
      try {
        const resized = resize(frame, {
          scale: {
            width: 224,
            height: 224,
          },
          pixelFormat: "rgb",
          dataType: "uint8",
        });
        // 2. Run model with given input buffer synchronously
        const outputs = model.runSync([resized]);
        let maxValue = -Infinity;
        let maxKey = "";
        for (const key in outputs[0]) {
          if (outputs[0].hasOwnProperty(key)) {
            const value = parseInt(outputs[0][key]);
            if (value > maxValue) {
              maxValue = value;
              maxKey = key;
            }
          }
        }

        console.log("Max Key:", maxKey);
        console.log("class  : ", classes[maxValue]);
      } catch (e) {
        console.log(e);
      }
    },
    [model]
  );

  const device = useCameraDevice("back");

  const format = useCameraFormat(device, [
    {
      fps: 30,
    },
  ]);

  const isFocused = useIsFocused();
  const appState = useAppState();

  const isActive = isFocused && appState === "active";

  const { hasPermission, requestPermission } = useCameraPermission();

  useEffect(() => {
    const askPermission = async () => {
      if (!hasPermission) {
        return await requestPermission();
      }
    };

    askPermission();
  }, [hasPermission]);

  if (device == null)
    return (
      <View style={{ alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 20 }}>no camera device in this phone</Text>
      </View>
    );

  return (
    <>
      <Stack.Screen options={{ title: "Camera Page" }} />
      <SafeAreaView style={{ flex: 1 }}>
        <Camera
          frameProcessor={frameProcessor}
          ref={camera}
          format={format}
          focusable
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={isActive}
        />
      </SafeAreaView>
    </>
  );
}
