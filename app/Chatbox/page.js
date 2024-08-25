'use client'

import { Box, Button, Stack, TextField, Divider, Typography } from '@mui/material'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createTheme, ThemeProvider } from '@mui/material/styles';
import Link from 'next/link';

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
      main: '#1976d2',
    },
    secondary: {
      main: '#9e9e9e',
    },
  },
});

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hi! I'm the Rate My Professor support assistant. How can I help you today?`,
    },
  ])
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null);

  const sendMessage = useCallback(async () => {
    if (!message.trim()) return;
  
    setIsLoading(true);
    const newUserMessage = { role: 'user', content: message };
    
    // Immediately update messages with the user's message
    setMessages(prevMessages => [...prevMessages, newUserMessage]);
    
    // Clear the input field
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

      // Add a placeholder for the assistant's message
      setMessages(prevMessages => [...prevMessages, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        assistantMessage += chunk;
        
        // Update the assistant's message as it comes in
        setMessages(prevMessages => {
          const newMessages = [...prevMessages];
          newMessages[newMessages.length - 1] = { role: 'assistant', content: assistantMessage.trim() };
          return newMessages;
        });
      }
    } catch (error) {
      console.error('Error in sendMessage:', error);
      setMessages(prevMessages => [
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
  }

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <ThemeProvider theme={theme}>
      <Box
        width="100vw"
        height="100vh"
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        bgcolor="#f5f5f5"
        p={2}
      >
        <Stack
           direction={"column"}
           width={{ xs: "100%", sm: "80%", md: "60%", lg: "40%" }}
           height="80vh"
           border="1px solid #ccc"
           borderRadius={4}
           bgcolor="white"
           p={2}
           boxShadow={3}
           spacing={3}
        >
          <Box
            display="flex"
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
          >
            <Link href="https://www.ratemyprofessors.com/" passHref>
              <Box display="flex" flexDirection="column" alignItems="center">
                <i className="bx bxs-chat" style={{ color: "#1976d2", fontSize: "36px" }}></i>
                <Typography variant="h6" color="primary">Rate My Professor</Typography>
              </Box>
            </Link>
          </Box>
          <Divider />
          <Stack
            direction={"column"}
            spacing={2}
            flexGrow={1}
            overflow="auto"
            maxHeight="100%"
          >
            {messages.map((message, index) => (
              <Box
                key={index}
                display="flex"
                justifyContent={message.role === "assistant" ? "flex-start" : "flex-end"}
                mb={2}
              >
                <Box
                  bgcolor={message.role === "assistant" ? "secondary.main" : "primary.main"}
                  color={message.role === "assistant" ? "black" : "white"}
                  borderRadius={4}
                  p={2}
                  maxWidth="75%"
                >
                  {message.role === "assistant" ? (
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
          <Stack direction={"row"} spacing={2} mt={2}>
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
            >
              {isLoading ? "Sending..." : "Send"}
            </Button>
          </Stack>
        </Stack>
        <Typography variant="caption" color="grey" fontStyle="italic" mt={2}>
          This AI assistant is NOT a certified academic advisor.
        </Typography>
      </Box>
    </ThemeProvider>
  );
}
