import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function AuthModal({ isOpen, onClose }) {
  const { login, register } = useAuth();
  const { C } = useTheme();

  const [isLoginBlock, setIsLoginBlock] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error: authError } = isLoginBlock 
        ? await login(email, password)
        : await register(email, password);

      if (authError) throw authError;
      
      onClose(); // Close modal on success
    } catch (err) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100000,
      padding: 20
    }}>
      <div style={{
        background: C.card,
        border: `1px solid ${C.borderHi}`,
        borderRadius: C.radius,
        width: '100%',
        maxWidth: 400,
        boxShadow: `0 20px 40px rgba(0,0,0,0.4), inset 0 1px 0 ${C.borderHi}`,
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{ 
          padding: '24px 30px', 
          borderBottom: `1px solid ${C.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: `linear-gradient(180deg, ${C.border}20 0%, transparent 100%)`
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, color: C.text, fontWeight: 600 }}>
              {isLoginBlock ? 'Terminal Access' : 'Create Account'}
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: C.dim }}>
              Secure authentication via Supabase
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', color: C.dim, cursor: 'pointer',
            fontSize: 20, padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '50%', width: 32, height: 32, transition: 'background 0.2s'
          }} onMouseOver={(e) => e.currentTarget.style.background = C.border} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
            ✕
          </button>
        </div>

        {/* Form Body */}
        <div style={{ padding: 30 }}>
          {error && (
            <div style={{
              background: `${C.red}15`,
              border: `1px solid ${C.red}40`,
              color: C.red,
              padding: '10px 14px',
              borderRadius: Math.max(0, C.radius - 2),
              fontSize: 13,
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, color: C.dim, textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5 }}>Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="analyst@haimcapital.com"
                style={{
                  background: C.bgSub,
                  border: `1px solid ${C.border}`,
                  color: C.text,
                  padding: '12px 14px',
                  borderRadius: Math.max(0, C.radius - 2),
                  fontSize: 14,
                  outline: 'none',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = C.accent}
                onBlur={(e) => e.target.style.borderColor = C.border}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, color: C.dim, textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5 }}>Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••••••"
                style={{
                  background: C.bgSub,
                  border: `1px solid ${C.border}`,
                  color: C.text,
                  padding: '12px 14px',
                  borderRadius: Math.max(0, C.radius - 2),
                  fontSize: 14,
                  outline: 'none',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = C.accent}
                onBlur={(e) => e.target.style.borderColor = C.border}
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              style={{
                background: C.text,
                color: C.bg,
                border: 'none',
                padding: '14px',
                borderRadius: Math.max(0, C.radius - 2),
                fontSize: 14,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: 10,
                opacity: loading ? 0.7 : 1,
                transition: 'transform 0.1s, opacity 0.2s',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 8
              }}
              onMouseDown={(e) => !loading && (e.currentTarget.style.transform = 'scale(0.98)')}
              onMouseUp={(e) => !loading && (e.currentTarget.style.transform = 'scale(1)')}
              onMouseLeave={(e) => !loading && (e.currentTarget.style.transform = 'scale(1)')}
            >
              {loading ? 'Authenticating...' : (isLoginBlock ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          {/* Footer toggle */}
          <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: C.dim }}>
            {isLoginBlock ? "Don't have access? " : "Already have an account? "}
            <button 
              onClick={() => {
                setIsLoginBlock(!isLoginBlock);
                setError(null);
              }}
              style={{
                background: 'none', border: 'none', color: C.accent, cursor: 'pointer',
                fontWeight: 600, padding: 0, textDecoration: 'none'
              }}
              onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
              onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}
            >
              {isLoginBlock ? 'Register here.' : 'Sign in here.'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
