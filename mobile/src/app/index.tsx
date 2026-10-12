import { Redirect } from "expo-router";

// Authenticated entry point — guards in _layout keep logged-out users on
// /login, so reaching here always means a session exists.
export default function Index() {
  return <Redirect href="/home" />;
}
