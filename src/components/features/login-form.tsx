"use client";

export const dynamic = "force-dynamic";

import { useActionState, useRef, useCallback } from "react";
import { forwardRef } from "react";
import Link from "next/link";
import { Shield, LogIn, AlertCircle, Loader2 } from "lucide-react";
import { loginAction } from "@/app/login/actions";
import { type LoginState, INITIAL_LOGIN_STATE } from "@/app/login/state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    loginAction,
    INITIAL_LOGIN_STATE
  );
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const wrappedAction = useCallback(
    (formData: FormData) => {
      if (emailRef.current) formData.set("email", emailRef.current.value);
      if (passwordRef.current) formData.set("password", passwordRef.current.value);
      return formAction(formData);
    },
    [formAction]
  );

  return (
    <main className="bg-background min-h-svh">
      <div className="mx-auto flex min-h-svh w-full max-w-sm flex-col justify-center gap-6 px-4 py-10">
        <header className="flex flex-col items-center gap-3 text-center">
          <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-xl">
            <Shield className="size-6" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              Antojos
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Ingresá con tu cuenta para administrar tu negocio
            </p>
          </div>
        </header>

        <form action={wrappedAction} className="flex flex-col gap-4" noValidate>
          <Field
            ref={emailRef}
            id="email"
            name="email"
            label="Email"
            type="email"
            placeholder="tu@email.com"
            autoComplete="email"
            autoFocus
            required
            error={state?.fieldErrors?.email}
          />
          <Field
            ref={passwordRef}
            id="password"
            name="password"
            label="Contraseña"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            required
            error={state?.fieldErrors?.password}
          />

          {state?.error ? (
            <div
              role="alert"
              className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border p-3 text-sm"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{state.error}</span>
            </div>
          ) : null}

          <Button
            type="submit"
            disabled={pending}
            className="h-11 w-full text-sm font-semibold"
          >
            {pending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Ingresando…
              </>
            ) : (
              <>
                <LogIn className="mr-2 size-4" />
                Iniciar sesión
              </>
            )}
          </Button>
        </form>

        <p className="text-muted-foreground text-center text-xs">
          ¿Sos super admin?{" "}
          <Link href="/admin/login" className="hover:text-foreground underline">
            Ingresá acá
          </Link>
        </p>
      </div>
    </main>
  );
}

const Field = forwardRef<HTMLInputElement, {
  id: string;
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  required?: boolean;
  error?: string;
}>(function Field(
  { id, name, label, type = "text", placeholder, autoComplete, autoFocus, required, error },
  ref,
) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-foreground/70 text-[11px] font-semibold uppercase tracking-wider"
      >
        {label}
      </label>
      <Input
        ref={ref}
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        required={required}
        aria-invalid={Boolean(error)}
        className="h-11 rounded-lg"
      />
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
});

