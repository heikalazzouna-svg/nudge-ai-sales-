import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <SignIn 
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-xl border border-zinc-200 rounded-xl",
          }
        }}
        afterSignInUrl="/campaigns"
        signUpUrl="/sign-up"
      />
    </div>
  );
}
