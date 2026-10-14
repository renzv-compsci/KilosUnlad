import React, { useState } from 'react';
import { BrandLogo } from '../common/BrandLogo';
import { UserSession } from '../../types/contracts';
import { apiErrorMessage, login } from '../../services/api';
import { Eye, EyeOff, Lock, Mail, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import './Screen1Login.css';

interface Screen1LoginProps {
  onLoginSuccess: (session: UserSession) => void;
  showSpecAnnotations?: boolean;
}

export const Screen1Login: React.FC<Screen1LoginProps> = ({
  onLoginSuccess,
  showSpecAnnotations = false,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const session = await login(username, password);
      onLoginSuccess(session);
    } catch (error) {
      setErrorMessage(apiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="login-screen">
      <div className="login-civic-motto" aria-hidden="true">
        <span>PEOPLE &nbsp; &bull; &nbsp; SERVICE &nbsp; &bull; &nbsp; INTEGRITY</span>
        <span>A STRONGER, MORE INCLUSIVE PHILIPPINES</span>
      </div>
      <div className="login-civic-signature" aria-hidden="true">
        <span>SERBISYO</span><span>PARA SA</span><span>BAGONG PILIPINAS</span>
      </div>
      {/* Spec Annotation Badge */}
      {showSpecAnnotations && (
        <div className="max-w-md mx-auto w-full mb-3 bg-stone-100 border border-stone-300 rounded-lg p-2.5 text-[10px] font-mono text-stone-800 shadow-2xs">
          <div className="font-bold uppercase tracking-wider text-[#132e4f]">Screen 1 Spec & Contract Binding:</div>
          <div>Endpoint: <span className="font-bold">POST /api/v1/auth/login</span></div>
          <div>Contract: <span className="font-bold">/docs/contracts/auth/auth-session.json</span></div>
          <div>Fields: <code className="text-rose-700">username</code>, <code className="text-rose-700">password</code>, <code className="text-emerald-700">access_token</code></div>
        </div>
      )}

      {/* Main Login Card */}
      <section aria-labelledby="login-title" className="login-panel">
        
        {/* Card Header with Official Government Badges */}
        <div className="login-brand-header">
          <div className="login-seals">
            
            {/* Republic Seal */}
            <div className="login-seal login-republic-seal">
              <svg viewBox="0 0 100 100" width="72" height="72" aria-hidden="true">
                <circle cx="50" cy="50" r="46" fill="#0c2340" stroke="#b48c36" strokeWidth="2.5" />
                <circle cx="50" cy="50" r="42" fill="#ffffff" />
                <path d="M50 14 L50 86" stroke="#b48c36" strokeWidth="1" strokeDasharray="2 2" />
                <path d="M14 50 L86 50" stroke="#b48c36" strokeWidth="1" strokeDasharray="2 2" />
                <path d="M50 20 L60 42 L84 42 L64 56 L72 78 L50 64 L28 78 L36 56 L16 42 L40 42 Z" fill="#b48c36" />
                <circle cx="50" cy="50" r="10" fill="#0038a8" />
              </svg>
            </div>

            {/* DSWD Seal Badge */}
            <div className="login-seal login-dswd-seal">
              <span>DSWD</span>
              <small>4Ps</small>
            </div>

          </div>

          <div className="login-republic-label">
            Republic of the Philippines
          </div>
          <h1 id="login-title" className="login-title-logo">
            <BrandLogo size={44} tone="dark" />
          </h1>
          <p className="login-brand-description">
            Statutory Welfare Auditing & Beneficiary SWDI Verification System
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} aria-busy={isLoading} className="login-form">
          
          {/* Username Input */}
          <div>
            <label htmlFor="login-username-input">
              Government Work Email / Username
            </label>
            <div className="login-input-wrap">
              <Mail className="login-field-icon" aria-hidden="true" />
              <input
                id="login-username-input"
                type="text"
                autoComplete="username"
                disabled={isLoading}
                aria-describedby={errorMessage ? 'login-error-toast' : undefined}
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="name@dswd.gov.ph or coa.gov.ph"
                className="login-input"
              />
            </div>
            {showSpecAnnotations && (
              <span className="text-[10px] font-mono text-stone-500 mt-0.5 block">
                Binding: request.username (string)
              </span>
            )}
          </div>

          {/* Password Input with Toggle */}
          <div>
            <label htmlFor="login-password-input">
              Password
            </label>
            <div className="login-input-wrap">
              <Lock className="login-field-icon" aria-hidden="true" />
              <input
                id="login-password-input"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                disabled={isLoading}
                aria-describedby={errorMessage ? 'login-error-toast' : undefined}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="login-input login-password-input"
              />
              <button
                type="button"
                id="toggle-password-visibility-btn"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword(!showPassword)}
                className="login-password-toggle"
              >
                {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
              </button>
            </div>
            {showSpecAnnotations && (
              <span className="text-[10px] font-mono text-stone-500 mt-0.5 block">
                Binding: request.password (password toggle)
              </span>
            )}
          </div>

          {/* Submit Action */}
          <div className="pt-1">
            {errorMessage && (
              <div id="login-error-toast" role="alert" className="mb-4 flex items-start gap-2 rounded-md bg-rose-50 p-3 text-sm text-rose-800">
                <AlertCircle size={18} className="shrink-0 mt-0.5" aria-hidden="true" />
                <p>{errorMessage}</p>
              </div>
            )}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={isLoading}
              className="login-submit"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Verifying Agency Credentials...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span>Sign In to Audit MIS</span>
                  <ArrowRight size={24} aria-hidden="true" />
                </div>
              )}
            </button>
          </div>

        </form>

      </section>

      <footer className="login-privacy">
        <ShieldCheck size={22} aria-hidden="true" />
        <span>Protected under Republic Act 10173 (Data Privacy Act of 2012)</span>
      </footer>
    </main>
  );
};
