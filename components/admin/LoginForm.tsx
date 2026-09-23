"use client";

import { useActionState } from "react";

import { loginAdmin } from "@/lib/admin/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAdmin, undefined);

  return (
    <form action={action} className="mt-8 space-y-4">
      <div>
        <label htmlFor="secret" className="block text-sm text-steel">
          관리 비밀키
        </label>
        <input
          id="secret"
          name="secret"
          type="password"
          autoComplete="current-password"
          required
          className="mt-2 w-full border border-ink/30 bg-paper px-3 py-2 text-ink outline-none focus-visible:border-water"
        />
      </div>
      {state?.error ? (
        <p className="text-sm text-caution" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="border border-water bg-water px-4 py-2 text-sm font-medium text-paper disabled:opacity-60"
      >
        {pending ? "확인 중…" : "검수대 들어가기"}
      </button>
    </form>
  );
}
