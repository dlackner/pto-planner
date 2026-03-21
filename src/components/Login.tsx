import React, { useState } from 'react';
import { User } from '../types';
import { api } from '../api';

interface Props {
  onLogin: (user: User) => void;
  onSkip: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export default function Login({ onLogin, onSkip, theme, onToggleTheme }: Props) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const { user } = await api.login(name.trim());
      onLogin(user);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <button className="theme-toggle-btn" onClick={onToggleTheme}>
        {theme === 'light' ? 'Dark' : 'Light'}
      </button>
      <h1>PTO Planner</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <button type="submit" disabled={loading}>
          {loading ? '...' : 'Go'}
        </button>
      </form>
      <button className="secondary skip-btn" onClick={onSkip}>
        Skip -- use without saving
      </button>
    </div>
  );
}
