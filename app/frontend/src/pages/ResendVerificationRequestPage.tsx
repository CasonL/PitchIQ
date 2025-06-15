import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Box, Typography, Button, CircularProgress, Paper, Container, Alert } from '@mui/material';
import { useAuthContext } from '../context/AuthContext'; // Adjusted path

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const ResendVerificationRequestPage: React.FC = () => {
    const { user, isAuthenticated, isLoading: authLoading, checkAuthStatus } = useAuthContext();
    const navigate = useNavigate();

    const [csrfToken, setCsrfToken] = useState<string | null>(null);
    const [apiMessage, setApiMessage] = useState<string>('');
    const [apiError, setApiError] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [csrfError, setCsrfError] = useState<string>('');

    useEffect(() => {
        const fetchCsrfToken = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/auth/api/csrf-token`);
                if (!response.ok) {
                    throw new Error('Failed to fetch CSRF token');
                }
                const data = await response.json();
                setCsrfToken(data.csrfToken);
                setCsrfError('');
            } catch (error) {
                console.error('CSRF token fetch error:', error);
                setCsrfError('Could not initialize the request. Please try again later.');
            }
        };

        if (isAuthenticated) { // Only fetch CSRF if authenticated, as endpoint requires login
            fetchCsrfToken();
        }
    }, [isAuthenticated]);

    useEffect(() => {
        // If user becomes unauthenticated or auth is still loading, 
        // no action needed here as primary checks are in render.
        // If user is authenticated and verified, redirect or message.
        if (isAuthenticated && user?.is_email_verified) {
            setApiMessage('Your email is already verified.');
            // Optional: redirect after a delay
            // setTimeout(() => navigate('/dashboard'), 3000);
        }
    }, [user, isAuthenticated, navigate]);

    const handleResendEmail = async () => {
        if (!csrfToken) {
            setApiError('Cannot process request: security token missing. Please refresh.');
            return;
        }
        if (!isAuthenticated || user?.is_email_verified) {
            setApiError('This action is not applicable to your account status.');
            return;
        }

        setIsSubmitting(true);
        setApiMessage('');
        setApiError('');

        try {
            const response = await fetch(`${API_BASE_URL}/auth/resend-verification-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken,
                },
                credentials: 'include',
            });
            const data = await response.json();
            if (response.ok) {
                setApiMessage(data.message || 'A new verification email has been sent.');
                if (data.status === 'info') { // e.g. already verified but somehow got here
                    setApiError(''); // Clear error if it was info
                }
            } else {
                setApiError(data.message || 'Failed to resend verification email.');
            }
        } catch (error) {
            console.error('Resend email API error:', error);
            setApiError('An unexpected error occurred. Please try again.');
        }
        setIsSubmitting(false);
    };

    if (authLoading) {
        return (
            <Container sx={{ mt: 8, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress />
            </Container>
        );
    }

    if (!isAuthenticated) {
        return (
            <Container component={Paper} elevation={3} sx={{ mt: 8, p: 4, textAlign: 'center' }}>
                <Typography variant="h5" gutterBottom>Access Denied</Typography>
                <Typography sx={{ mb: 2 }}>You need to be logged in to request a new verification email.</Typography>
                <Button component={Link} to="/login" variant="contained">Go to Login</Button>
            </Container>
        );
    }

    if (user?.is_email_verified) {
        return (
            <Container component={Paper} elevation={3} sx={{ mt: 8, p: 4, textAlign: 'center' }}>
                <Typography variant="h5" gutterBottom>Email Already Verified</Typography>
                <Typography sx={{ mb: 2 }}>Your email address ({user.email}) has already been verified.</Typography>
                <Button component={Link} to="/dashboard" variant="contained">Go to Dashboard</Button>
            </Container>
        );
    }
    
    if (csrfError) {
         return (
            <Container component={Paper} elevation={3} sx={{ mt: 8, p: 4, textAlign: 'center' }}>
                <Typography variant="h5" color="error" gutterBottom>Initialization Error</Typography>
                <Alert severity="error">{csrfError}</Alert>
                <Button component={Link} to="/dashboard" variant="contained" sx={{mt: 2}}>Go to Dashboard</Button>
            </Container>
        );
    }

    return (
        <Container component={Paper} elevation={3} sx={{ mt: 8, p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="h4" component="h1" gutterBottom>
                Resend Verification Email
            </Typography>
            <Typography sx={{ mb: 2 }}>
                If you haven't received your verification email or the link has expired, you can request a new one.
            </Typography>
            
            {apiMessage && <Alert severity="success" sx={{ mb: 2, width: '100%' }}>{apiMessage}</Alert>}
            {apiError && <Alert severity="error" sx={{ mb: 2, width: '100%' }}>{apiError}</Alert>}

            <Button 
                variant="contained" 
                color="primary" 
                onClick={handleResendEmail} 
                disabled={isSubmitting || !csrfToken || !isAuthenticated || user?.is_email_verified}
                sx={{ mt: 2 }}
            >
                {isSubmitting ? <CircularProgress size={24} /> : 'Send New Verification Email'}
            </Button>
            <Button component={Link} to="/dashboard" variant="text" sx={{ mt: 2 }}>
                Back to Dashboard
            </Button>
        </Container>
    );
};

export default ResendVerificationRequestPage; 