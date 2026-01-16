import { Link, Stack } from "expo-router";

export default function NotFound() {
  return (
    <>
    <Stack.Screen options={{ title: "Page inconnue", headerLeft: () => <></> }} />
    <Link href={"/index"}>Retour à l'accueil</Link>
    </>
  );
}