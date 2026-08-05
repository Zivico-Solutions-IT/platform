import { Redirect } from 'expo-router';
import AdminScreen from './admin';
import { isCrmHost } from '../src/utils/appHost';

export default function ManagerScreen() {
  return isCrmHost() ? <AdminScreen /> : <Redirect href="/trading" />;
}
