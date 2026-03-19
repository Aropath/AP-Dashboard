import { type FormEvent, useState } from "react";
import "../../signin.css";
import { useAuth } from "../context/AuthContext";

interface SignInPageProps {
  onSignIn: () => void;
  onGoToSignUp: () => void;
}

interface SignInErrors {
  email?: string;
  password?: string;
  general?: string;
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function SignInPage({ onSignIn, onGoToSignUp }: SignInPageProps) {
  const { signIn, googleAuth } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<SignInErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): SignInErrors => {
    const errs: SignInErrors = {};
    if (!email.trim()) errs.email = "This field is required.";
    else if (!validateEmail(email)) errs.email = "Please enter a valid email address.";
    if (!password) errs.password = "This field is required.";
    return errs;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setErrors({});
    setIsSubmitting(true);

    try {
      await signIn(email, password);
      onSignIn();
    } catch (err: any) {
      setErrors({ general: err.message || "Sign in failed. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-bg flex items-center justify-center min-h-screen px-4 py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-0 right-0 w-96 h-96 rounded-full opacity-20"
        style={{
          background: "radial-gradient(circle, oklch(0.72 0.14 195), transparent 70%)",
          transform: "translate(30%, -30%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed bottom-0 left-0 w-80 h-80 rounded-full opacity-15"
        style={{
          background: "radial-gradient(circle, oklch(0.65 0.12 205), transparent 70%)",
          transform: "translate(-30%, 30%)",
        }}
      />

      <div className="auth-card animate-fade-in-up relative w-full max-w-md rounded-2xl p-8 sm:p-10">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 mb-4">
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Sign in to your GrowthAdvisor account</p>
        </div>

        {errors.general && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-5">
            <label className="block text-sm font-medium mb-1.5">Email address</label>
            <input
              type="email"
              className={`field-input${errors.email ? " error" : ""}`}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
              }}
            />
            {errors.email && <p className="mt-1.5 text-xs font-medium text-red-500">{errors.email}</p>}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-1.5">Password</label>
            <input
              type="password"
              className={`field-input${errors.password ? " error" : ""}`}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
              }}
            />
            {errors.password && <p className="mt-1.5 text-xs font-medium text-red-500">{errors.password}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-aqua w-full py-2.5 px-4 rounded-xl font-semibold text-sm disabled:opacity-60"
          >
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs text-muted-foreground">
            <span className="bg-white px-3">or continue with</span>
          </div>
        </div>

        <button
          type="button"
          onClick={async () => {
            // Google OAuth handled via existing googleLoginButton flow
            // If you use Google One Tap, pass idToken to googleAuth()
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <button type="button" className="link-aqua font-medium" onClick={onGoToSignUp}>
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
}