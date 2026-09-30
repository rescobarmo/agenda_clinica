import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-3xl font-bold">Agenda Médica</h1>
      <p className="text-gray-600">
        Sistema de agendamiento de horas médicas multi-clínica, multi-sucursal
        y multi-médico (web + WhatsApp).
      </p>
      <div className="mt-4 flex gap-3">
        <Link
          href="/login"
          className="rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Iniciar sesión
        </Link>
        <Link
          href="/dashboard"
          className="rounded-md border border-gray-300 px-5 py-2 text-sm font-semibold hover:bg-gray-50"
        >
          Panel
        </Link>
      </div>
      <p className="mt-6 text-xs text-gray-400">
        Demo: admin@agenda.demo / Admin123!
      </p>
    </main>
  );
}
