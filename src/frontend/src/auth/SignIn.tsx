import { type FormEvent, useState } from "react";
import "../../signin.css";
import { useAuth } from "../context/AuthContext";
import GoogleLoginButton from "../components/ui/googleLoginButton";

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
  const { signIn } = useAuth();
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
          <p className="mt-1.5 text-sm text-muted-foreground">Sign in to your AroPath account</p>
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

        {/* ✅ Real Google button — replaces the empty placeholder */}
        <GoogleLoginButton onSuccess={() => onSignIn()} />

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