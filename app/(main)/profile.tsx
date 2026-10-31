import { Redirect } from 'expo-router';

/** The Profile tab became the dashboard's goal card; keeps old `check-calo://profile` links working. */
export default function ProfileRedirect() {
  return <Redirect href="/" />;
}
