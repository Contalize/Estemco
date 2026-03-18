import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, QueryConstraint } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

import { handleFirestoreError, OperationType } from './error-handler';

export function useCollection<T>(collectionName: string, queryConstraints: QueryConstraint[] = []) {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Stabilize constraints to avoid unnecessary re-subscribes
  // We use a string key. Note: QueryConstraint objects don't stringify well, 
  // so this is a heart-beat check. Better to pass stable constraints.
  const constraintsKey = queryConstraints.length > 0
    ? queryConstraints.length.toString()
    : 'none';

  useEffect(() => {
    if (!collectionName) return;

    setIsLoading(true);
    const q = query(collection(db, collectionName), ...queryConstraints);

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as T[];
        setData(docs);
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        console.error(`Erro em useCollection(${collectionName}):`, err.code, err.message);
        setError(err);
        setIsLoading(false);
        handleFirestoreError(err, OperationType.LIST, collectionName);
      }
    );

    return () => unsubscribe();
  }, [collectionName, constraintsKey]);

  return { data, isLoading, error };
}
