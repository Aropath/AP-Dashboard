import { type FormEvent, useState } from "react";
import "../../signin.css";
import { useAuth } from "../context/AuthContext";

interface SignUpPageProps {
  onSignUp: () => void;
  onGoToSignIn: () => void;
}

interface SignUpErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function SignUpPage({ onSignUp, onGoToSignIn }: SignUpPageProps) {
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<SignUpErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clearFieldError = (field: keyof SignUpErrors) => {
    if (errors[field]) setErrors((p) => ({ ...p, [field]: undefined }));
  };

  const validate = (): SignUpErrors => {
    const errs: SignUpErrors = {};
    if (!name.trim()) errs.name = "This field is required.";
    if (!email.trim()) errs.email = "This field is required.";
    else if (!validateEmail(email)) errs.email = "Please enter a valid email address.";
    if (!password) errs.password = "This field is required.";
    else if (password.length < 8) errs.password = "Password must be at least 8 characters.";
    if (!confirmPassword) errs.confirmPassword = "This field is required.";
    else if (confirmPassword !== password) errs.confirmPassword = "Passwords do not match.";
    return errs;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setErrors({});
    setIsSubmitting(true);

    try {
      await signUp(name.trim(), email.trim(), password);
      onSignUp();
    } catch (err: any) {
      setErrors({ general: err.message || "Sign up failed. Please try again." });
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

      <div className="auth-card animate-fade-in-up relative w-full max-w-md rounded-2xl p-8 sm:p-10">
        <div className="mb-7 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 mb-4">
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Start your free plan — no credit card required
          </p>
        </div>

        {errors.general && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1.5">Full name</label>
            <input
              type="text"
              className={`field-input${errors.name ? " error" : ""}`}
              placeholder="Jane Smith"
              value={name}
              onChange={(e) => { setName(e.target.value); clearFieldError("name"); }}
            />
            {errors.name && <p className="mt-1.5 text-xs font-medium text-red-500">{errors.name}</p>}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1.5">Email address</label>
            <input
              type="email"
              className={`field-input${errors.email ? " error" : ""}`}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); clearFieldError("email"); }}
            />
            {errors.email && <p className="mt-1.5 text-xs font-medium text-red-500">{errors.email}</p>}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1.5">Password</label>
            <input
              type="password"
              className={`field-input${errors.password ? " error" : ""}`}
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => { setPassword(e.target.value); clearFieldError("password"); }}
            />
            {errors.password && <p className="mt-1.5 text-xs font-medium text-red-500">{errors.password}</p>}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-1.5">Confirm password</label>
            <input
              type="password"
              className={`field-input${errors.confirmPassword ? " error" : ""}`}
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); clearFieldError("confirmPassword"); }}
            />
            {errors.confirmPassword && (
              <p className="mt-1.5 text-xs font-medium text-red-500">{errors.confirmPassword}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-aqua w-full py-2.5 px-4 rounded-xl font-semibold text-sm disabled:opacity-60"
          >
            {isSubmitting ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-3 text-center text-xs text-muted-foreground">
          By signing up you agree to our{" "}
          <span className="link-aqua cursor-pointer">Terms of Service</span> and{" "}
          <span className="link-aqua cursor-pointer">Privacy Policy</span>
        </p>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <button type="button" className="link-aqua font-medium" onClick={onGoToSignIn}>
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}