import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export const addDocumentNonBlocking = async (collectionName: string, data: any) => {
  try {
    return await addDoc(collection(db, collectionName), data);
  } catch (error) {
    console.error(`Falha em addDocumentNonBlocking (${collectionName}):`, error);
    return null;
  }
};
