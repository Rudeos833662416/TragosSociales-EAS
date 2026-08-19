import { ScreenContainer } from "@/components/screen-container";
import { ActivityIndicator, Text, View } from "react-native";

export default function SupabaseAuthCallbackScreen() {
  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View className="flex-1 items-center justify-center gap-4 px-8">
        <ActivityIndicator size="large" />
        <Text className="text-center text-base text-foreground">Confirmando tu cuenta…</Text>
      </View>
    </ScreenContainer>
  );
}
