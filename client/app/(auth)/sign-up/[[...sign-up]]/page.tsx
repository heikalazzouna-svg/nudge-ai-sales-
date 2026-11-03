import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <SignUp 
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-xl border border-zinc-200 rounded-xl",
          }
        }}
        afterSignUpUrl="/campaigns"
        signInUrl="/sign-in"
      />
    </div>
  );
}
