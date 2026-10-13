type CheckoutAuthPromptProps = {
  title: string;
  subtitle: string;
  onLogin: () => void;
  onSignup: () => void;
  onContinueGuest: () => void;
};

export default function CheckoutAuthPrompt({
  title,
  subtitle,
  onLogin,
  onSignup,
  onContinueGuest,
}: CheckoutAuthPromptProps) {
  return (
    <div className="panel p-6 md:p-8 space-y-4 text-center">
      <h2 className="font-heading text-2xl md:text-3xl font-semibold text-foreground">{title}</h2>
      <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">{subtitle}</p>

      <div className="pt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={onLogin}
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={onSignup}
          className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary"
        >
          Create account
        </button>
        <button
          type="button"
          onClick={onContinueGuest}
          className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary"
        >
          Continue as guest
        </button>
      </div>
    </div>
  );
}
