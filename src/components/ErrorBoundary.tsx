import { Component, type ReactNode } from 'react';
import { Box, Typography, Button, Alert } from '@mui/material';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Простой ErrorBoundary — ловит React-ошибки в дочерних компонентах,
 * показывает понятное сообщение вместо чёрного экрана.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    // Логируем в консоль чтобы было видно в DevTools.
    console.error('[ErrorBoundary] caught:', error, info);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Alert severity="error" sx={{ mb: 2, textAlign: 'left' }}>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
              Что-то пошло не так
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', color: '#94A3B8' }}>
              {this.state.error?.message || 'Неизвестная ошибка'}
            </Typography>
          </Alert>
          <Button variant="contained" startIcon={<RefreshRoundedIcon />} onClick={this.reset}>
            Попробовать снова
          </Button>
        </Box>
      );
    }
    return this.props.children;
  }
}
