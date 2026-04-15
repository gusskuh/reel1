import { LoginForm } from "./LoginForm";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const err = typeof searchParams.error === "string" ? searchParams.error : undefined;
  const registered = searchParams.registered === "1";
  const next = typeof searchParams.next === "string" ? searchParams.next : undefined;

  return <LoginForm initialError={err} registered={registered} next={next} />;
}
