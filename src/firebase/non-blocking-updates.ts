import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export const addDocumentNonBlocking = async (collectionName: string, data: any) => {
  return addDoc(collection(db, collectionName), data);
};
