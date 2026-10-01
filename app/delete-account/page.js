import { redirect } from 'next/navigation';

// Short web link for Google Play's "account deletion URL": bfrenz.com/delete-account
export default function DeleteAccountShortcut() {
  redirect('/account/delete');
}
