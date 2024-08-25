'use client';

import LandingPage from './landing/page';
import SignInPage from './signin/page';
import ChatboxPage from './Chatbox/page';
import SignUpPage from './signup/page';
import { usePathname } from 'next/navigation';

const Page = () => {
  const pathname = usePathname();

  if (pathname === '/signin') {
    return <SignInPage />;
  }

  if (pathname === '/signup') {
    return <SignUpPage />;
  }

  if (pathname === '/Chatbox') {
    return <ChatboxPage />;
  }

  return <LandingPage />;
};

export default Page;