import { Redirect } from 'expo-router';

/** The Profile tab became the Goal screen; keeps old `check-calo://profile` links working. */
export default function ProfileRedirect() {
  return <Redirect href="/goal" />;
}
