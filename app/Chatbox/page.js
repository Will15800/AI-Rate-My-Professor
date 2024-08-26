'use client';

import { Box, Button, Stack, TextField, Divider, Typography } from '@mui/material';
import { useState, useRef, useEffect, useCallback } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { FaComments, FaSignOutAlt } from 'react-icons/fa'; 
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

const theme = createTheme({
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920,
    },
  },
  palette: {
    primary: {
      main: '#606060',
    },
    secondary: {
      main: '#C0C0C0',
    },
  },
});

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hi! I'm the Rate My Professor support assistant. How can I help you today?`,
    },
  ]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  const sendMessage = useCallback(async () => {
    if (!message.trim()) return;

    setIsLoading(true);
    const newUserMessage = { role: 'user', content: message };

    setMessages((prevMessages) => [...prevMessages, newUserMessage]);
    setMessage('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([...messages, newUserMessage]),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      setMessages((prevMessages) => [...prevMessages, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        assistantMessage += chunk;

        setMessages((prevMessages) => {
          const newMessages = [...prevMessages];
          newMessages[newMessages.length - 1] = { role: 'assistant', content: assistantMessage.trim() };
          return newMessages;
        });
      }
    } catch (error) {
      console.error('Error in sendMessage:', error);
      setMessages((prevMessages) => [
        ...prevMessages,
        { role: 'assistant', content: 'Sorry, an error occurred. Please try again.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [message, messages]);

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !isLoading) {
      sendMessage();
    }
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleLogout = () => {
    if (isMounted && router) {
      router.push('/signin');
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #ffffff 50%, #222222 100%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Stack
          direction={'column'}
          width={{ xs: '100%', sm: '80%', md: '60%', lg: '40%' }}
          height="80vh"
          border="1px solid #ccc"
          borderRadius={4}
          p={2}
          boxShadow={3}
          spacing={3}
        >
          <motion.div
            className="chat-box"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Box
              className="chat-box-header"
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <motion.h1
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                style={{ color: 'black', textDecoration: 'none', marginRight: '8px' }}
              >
                RateMyProfAI
              </motion.h1>
              <Box display="flex" alignItems="center">
                <a
                  href="https://www.ratemyprofessors.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'black', textDecoration: 'none', marginRight: '10px' }}
                >
                  <FaComments size={30} style={{ color: 'black' }} />
                </a>
                <FaSignOutAlt
                  size={30}
                  style={{ color: 'black', cursor: 'pointer' }}
                  onClick={handleLogout}
                  title="Logout"
                />
              </Box>
            </Box>
          </motion.div>
          <Divider />
          <Stack direction={'column'} spacing={2} flexGrow={1} overflow="auto" maxHeight="100%">
            {messages.map((message, index) => (
              <Box
                key={index}
                display="flex"
                justifyContent={message.role === 'assistant' ? 'flex-start' : 'flex-end'}
                mb={2}
              >
                <Box
                  bgcolor={message.role === 'assistant' ? 'secondary.main' : 'primary.main'}
                  color={message.role === 'assistant' ? 'black' : 'white'}
                  borderRadius={4}
                  p={2}
                  maxWidth="75%"
                >
                  {message.role === 'assistant' ? (
                    <Typography component="div">
                      {message.content.split('\n').map((paragraph, i) => (
                        <Typography key={i} paragraph>
                          {paragraph.startsWith('Professor') ? (
                            <strong>{paragraph}</strong>
                          ) : (
                            paragraph
                          )}
                        </Typography>
                      ))}
                    </Typography>
                  ) : (
                    <Typography>{message.content}</Typography>
                  )}
                </Box>
              </Box>
            ))}
            <div ref={messagesEndRef} />
          </Stack>
          <Stack direction={'row'} spacing={2} mt={2}>
            <TextField
              label="Message"
              fullWidth
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              aria-label="Enter your message"
              variant="outlined"
              autoFocus
            />
            <Button
              variant="contained"
              onClick={sendMessage}
              disabled={isLoading}
              aria-label="Send message"
              size="large"
              style={{ backgroundColor: 'black', color: 'white' }}
            >
              {isLoading ? 'Sending...' : 'Send'}
            </Button>
          </Stack>
        </Stack>
        <Typography variant="caption" color="grey" fontStyle="italic" mt={2}>
          This AI helper is not a licensed academic advisor.
        </Typography>
      </Box>
    </ThemeProvider>
  );
}