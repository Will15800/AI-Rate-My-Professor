import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

const withAuth = (Component) => {
  const AuthHOC = (props) => {
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (!user) {
          router.push('/signin'); // Redirect to sign-in page if not authenticated
        } else {
          setLoading(false);
        }
      });

      return () => unsubscribe();
    }, [router]);

    if (loading) {
      return <div>Loading...</div>; // Show a loading state while checking authentication
    }

    return <Component {...props} />;
  };

  // Add a display name for the higher-order component
  AuthHOC.displayName = `withAuth(${Component.displayName || Component.name || 'Component'})`;

  return AuthHOC;
};

export default withAuth;