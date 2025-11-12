import React from 'react';
import { Box, Paper, Typography, LinearProgress, Chip } from '@mui/material';
import { useCallController } from './CallControllerProvider';

function formatMs(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${s}s`;
}

export default function TerminationIndicators(): JSX.Element | null {
  const { isConnected, getTerminationUIState } = useCallController();
  const [ui, setUi] = React.useState(() => getTerminationUIState());

  React.useEffect(() => {
    if (!isConnected) return;
    // Refresh frequently for smooth countdowns without adding provider state
    const id = window.setInterval(() => setUi(getTerminationUIState()), 200);
    return () => window.clearInterval(id);
  }, [isConnected, getTerminationUIState]);

  if (!isConnected) return null;

  const now = Date.now();
  const confirmRemainingMs = ui.candidateFirstSeenAt
    ? Math.max(0, ui.confirmWindowMs - (now - ui.candidateFirstSeenAt))
    : 0;
  const confirmPct = ui.candidateFirstSeenAt
    ? Math.max(0, Math.min(100, (100 * (now - ui.candidateFirstSeenAt)) / ui.confirmWindowMs))
    : 0;

  const guardrailRemaining = Math.max(0, ui.minCallAgeMs - ui.callAgeMs);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
      {guardrailRemaining > 0 && ui.status === 'idle' && (
        <Paper elevation={1} sx={{ p: 1.5, borderRadius: 1, bgcolor: 'background.paper' }}>
          <Typography variant="caption" color="text.secondary">
            Auto-termination locked for first {Math.round(ui.minCallAgeMs / 1000)}s. Remaining: {formatMs(guardrailRemaining)}
          </Typography>
        </Paper>
      )}

      {ui.status === 'candidate' && (
        <Paper elevation={2} sx={{ p: 1.5, borderRadius: 1, bgcolor: 'warning.light' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Potential end-of-call detected
            </Typography>
            <Chip size="small" label={`Confirm within ${formatMs(confirmRemainingMs)}`} color="warning" />
          </Box>
          {ui.phrase && (
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
              Phrase: "{ui.phrase}"
            </Typography>
          )}
          <LinearProgress variant="determinate" value={confirmPct} sx={{ mt: 1 }} />
        </Paper>
      )}

      {ui.status === 'grace' && (
        <Paper elevation={2} sx={{ p: 1.5, borderRadius: 1, bgcolor: 'error.light' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              Ending call shortly
            </Typography>
            <Chip size="small" label={`Ending in ${formatMs(ui.graceRemainingMs)}`} color="error" />
          </Box>
          {ui.phrase && (
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
              Reason: "{ui.phrase}"
            </Typography>
          )}
          <LinearProgress
            variant="determinate"
            value={100 - Math.max(0, Math.min(100, (100 * ui.graceRemainingMs) / ui.graceMs))}
            sx={{ mt: 1 }}
          />
        </Paper>
      )}
    </Box>
  );
}
