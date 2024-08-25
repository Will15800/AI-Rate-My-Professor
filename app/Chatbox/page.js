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
      >
        <Stack
           direction={"column"}
           width={{ xs: "80%", sm: "50%", md: "500px" }}
           height={{ xs: "60vh", sm: "70%", md: "100px" }}
           border="1px solid black"
           p={2}
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
                <i className="bx bxs-chat" style={{ color: "black", fontSize: "24px" }}></i>
                <Typography variant="subtitle1" color="black">RMP</Typography>
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
      bgcolor={message.role === "assistant" ? "grey.300" : "#1976d2"}
      color={message.role === "assistant" ? "black" : "white"}
      borderRadius={4}
      p={2}
      maxWidth="80%"
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
          <Stack direction={"row"} spacing={2}>
            <TextField
              label="Message"
              fullWidth
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              aria-label="Enter your message"
            />
            <Button
              variant="contained"
              onClick={sendMessage}
              disabled={isLoading}
              aria-label="Send message"
            >
              {isLoading ? "Sending..." : "Send"}
            </Button>
          </Stack>
        </Stack>
        <Typography variant="caption" color="grey" fontStyle="italic">
          This AI assistant is NOT a certified academic advisor.
        </Typography>
      </Box>
    </ThemeProvider>
  );
}