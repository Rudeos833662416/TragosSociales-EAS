import { Component, type ErrorInfo, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

type AppErrorBoundaryProps = { children: ReactNode };
type AppErrorBoundaryState = { error: Error | null };

/** Keeps a render-time error from leaving the native splash screen as the only visible UI. */
export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Application startup error:", error, info.componentStack);
  }

  private retry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <View className="flex-1 items-center justify-center bg-background px-8">
          <Text className="text-center text-2xl font-bold text-foreground">No pudimos abrir Tragos Sociales</Text>
          <Text className="mt-3 text-center text-base leading-6 text-muted">
            La aplicación se recuperó de un problema inesperado. Intenta abrirla nuevamente.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={this.retry}
            style={({ pressed }) => ({
              marginTop: 24,
              minHeight: 48,
              minWidth: 170,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 14,
              backgroundColor: "#9BC4E5",
              opacity: pressed ? 0.82 : 1,
            })}
          >
            <Text className="font-bold text-background">Reintentar</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}
