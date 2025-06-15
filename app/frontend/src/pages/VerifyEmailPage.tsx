import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Box, Typography, CircularProgress, Button, Paper, Container } from '@mui/material';

const VerifyEmailPage: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const [message, setMessage] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [action, setAction] = useState<string | null>(null); // For actions like 'resend_verification'

    useEffect(() => {
        if (!token) {
            setError('No verification token provided.');
            setLoading(false);
            return;
        }

        const verifyEmail = async () => {
            setLoading(true);
            try {
                const response = await fetch(`/auth/verify-email/${token}`);
                const data = await response.json();

                if (response.ok) {
                    setMessage(data.message || 'Email verified successfully!');
                    setError('');
                } else {
                    setError(data.message || 'Failed to verify email. The link may be invalid or expired.');
                    if (data.action) {
                        setAction(data.action);
                    }
                    setMessage('');
                }
            } catch (err) {
                console.error('Verification API error:', err);
                setError('An unexpected error occurred. Please try again later.');
                setMessage('');
            }
            setLoading(false);
        };

        verifyEmail();
    }, [token]);

    return (
        <Container component={Paper} elevation={3} sx={{ mt: 8, p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="h4" component="h1" gutterBottom>
                Email Verification
            </Typography>
            {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
                    <CircularProgress />
                    <Typography sx={{ ml: 2 }}>Verifying your email...</Typography>
                </Box>
            )}
            {!loading && message && (
                <Typography color="success.main" sx={{ mt: 2 }}>{message}</Typography>
            )}
            {!loading && error && (
                <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>
            )}
            {!loading && (
                <Box sx={{ mt: 3 }}>
                    <Button component={Link} to="/login" variant="contained" color="primary">
                        Go to Login
                    </Button>
                    {action === 'resend_verification' && (
                        <Button component={Link} to="/resend-verification-request" variant="outlined" color="secondary" sx={{ ml: 2 }}>
                            Request New Link
                        </Button>
                    )}
                </Box>
            )}
        </Container>
    );
};

export default VerifyEmailPage; 