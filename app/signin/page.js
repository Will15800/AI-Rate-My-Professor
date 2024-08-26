'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Box, Button, Container, Typography, TextField, AppBar, Toolbar, CssBaseline } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { auth } from '../../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

const theme = createTheme({
  palette: {
    primary: {
      main: '#222222',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#222222',
    },
    background: {
      default: '#ffffff',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#222222',
      secondary: '#222222',
    },
  },
  typography: {
    fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h3: {
      fontWeight: 700,
      color: '#222222',
    },
    h4: {
      fontWeight: 600,
      color: '#222222',
    },
    h5: {
      fontWeight: 400,
      color: '#222222',
    },
  },
});

const SignInPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSignIn = async (event) => {
    event.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/Chatbox');
    } catch (error) {
      let errorMessage = 'An error occurred. Please try again.';
      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password.';
          break;
        case 'auth/user-not-found':
          errorMessage = 'No user found with this email.';
          break;
        default:
          errorMessage = 'Failed to sign in. Please check your credentials and try again.';
      }
      setError(errorMessage);
    }
  };

  const handleSignUp = () => {
    router.push('/signup');
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #F1F0EA 50%, #222222 100%)',
      }}>
      <AppBar position="static" color="transparent" elevation={1}>
        <Toolbar>
          <Typography variant="h6" color="inherit" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            RateMyProfAI
          </Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth="xs">
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="80vh"
          textAlign="center"
        >
          <Typography variant="h4" component="h1" gutterBottom>
            Sign In
          </Typography>
          <Box component="form" onSubmit={handleSignIn} noValidate sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              variant="outlined"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              InputLabelProps={{ style: { color: theme.palette.text.primary } }}
              InputProps={{
                style: { color: theme.palette.text.primary },
                sx: {
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: theme.palette.secondary.main,
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: theme.palette.text.primary,
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: theme.palette.text.primary,
                  },
                },
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              variant="outlined"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              InputLabelProps={{ style: { color: theme.palette.text.primary } }}
              InputProps={{
                style: { color: theme.palette.text.primary },
                sx: {
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: theme.palette.secondary.main,
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: theme.palette.text.primary,
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: theme.palette.text.primary,
                  },
                },
              }}
            />
            {error && <Typography color="error">{error}</Typography>}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="secondary"
              sx={{ mt: 3, mb: 2 }}
            >
              Sign In
            </Button>
            <Button
              fullWidth
              variant="text"
              color="secondary"
              onClick={handleSignUp}
            >
              Don&apos;t have an account? Sign Up
            </Button>
          </Box>
        </Box>
      </Container>
      </Box>
    </ThemeProvider>
  );
};

export default SignInPage;
