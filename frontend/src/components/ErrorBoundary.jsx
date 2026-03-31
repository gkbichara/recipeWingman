import React from 'react';

/**
 * ErrorBoundary
 * Catches any uncaught render errors and shows a friendly fallback
 * instead of a white screen. Especially useful during development
 * and live demos.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught error:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={styles.wrapper}>
        <div style={styles.card}>
          <div style={styles.icon}>🍳</div>
          <h2 style={styles.title}>Something went sideways</h2>
          <p style={styles.message}>
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </p>
          <div style={styles.actions}>
            <button style={styles.reloadBtn} onClick={() => window.location.reload()}>
              Reload page
            </button>
            <button style={styles.retryBtn} onClick={this.handleReset}>
              Try to recover
            </button>
          </div>
          <details style={styles.details}>
            <summary style={styles.summary}>Stack trace</summary>
            <pre style={styles.stack}>{this.state.error?.stack}</pre>
          </details>
        </div>
      </div>
    );
  }
}

// Inline styles so ErrorBoundary has zero CSS dependencies
const styles = {
  wrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: '#141210',
    padding: '1rem',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  card: {
    background: '#1e1b18',
    border: '1px solid rgba(240,232,216,0.1)',
    borderRadius: '16px',
    padding: '2rem',
    maxWidth: '480px',
    width: '100%',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  icon: { fontSize: '2.5rem' },
  title: {
    fontFamily: "'Playfair Display', Georgia, serif",
    fontSize: '1.3rem',
    color: '#f0e8d8',
    margin: 0,
  },
  message: {
    fontSize: '0.85rem',
    color: '#a89880',
    margin: 0,
    lineHeight: 1.5,
  },
  actions: {
    display: 'flex',
    gap: '0.5rem',
    justifyContent: 'center',
  },
  reloadBtn: {
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    background: '#e8a020',
    color: '#141210',
    fontWeight: 600,
    fontSize: '0.85rem',
    cursor: 'pointer',
    border: 'none',
  },
  retryBtn: {
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    background: 'rgba(240,232,216,0.06)',
    color: '#a89880',
    fontSize: '0.85rem',
    cursor: 'pointer',
    border: '1px solid rgba(240,232,216,0.1)',
  },
  details: {
    textAlign: 'left',
    marginTop: '0.5rem',
  },
  summary: {
    fontSize: '0.75rem',
    color: '#6b5e52',
    cursor: 'pointer',
  },
  stack: {
    marginTop: '0.5rem',
    fontSize: '0.65rem',
    color: '#6b5e52',
    overflowX: 'auto',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    lineHeight: 1.4,
  },
};
