import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, QueryConstraint } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export function useCollection<T>(collectionName: string, queryConstraints: QueryConstraint[] = []) {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const q = query(collection(db, collectionName), ...queryConstraints);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as T[];
      setData(docs);
      setIsLoading(false);
      setError(null);
    }, (err) => {
      // Only log non-permission errors to console to avoid spamming during setup
      if (!err.message.includes('Missing or insufficient permissions')) {
        console.error(`Error fetching collection ${collectionName}:`, err);
      }
      setError(err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [collectionName, JSON.stringify(queryConstraints)]);

  return { data, isLoading, error };
}
