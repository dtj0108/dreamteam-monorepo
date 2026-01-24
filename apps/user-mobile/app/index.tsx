import { Redirect } from "expo-router";

import { useAuth } from "@/providers/auth-provider";

export default function Index() {
  const { session, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (session) {
    return <Redirect href="/(main)/hub" />;
  }

  return <Redirect href="/(auth)/welcome" />;
}
