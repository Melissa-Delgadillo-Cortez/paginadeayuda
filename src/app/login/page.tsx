import { Logo } from "@/components/logo";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <Logo size={72} />
          <h1 className="mt-4 text-xl font-bold text-slate-800">
            Página de Ayuda
          </h1>
          <p className="text-sm text-slate-500">
            Base de conocimiento interna — LBC Seguros
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <LoginForm />
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">
          Acceso restringido al personal autorizado de LBC.
        </p>
      </div>
    </main>
  );
}
