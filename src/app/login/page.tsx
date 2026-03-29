import LoginForm from "./LoginForm";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string | string[] | undefined;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const errorParam = Array.isArray(params.error) ? params.error[0] : params.error;

  const initialErrorMessage =
    errorParam === "auth_callback_failed"
      ? "Sign-in failed. Please request a new magic link."
      : null;

  return <LoginForm initialErrorMessage={initialErrorMessage} />;
}
