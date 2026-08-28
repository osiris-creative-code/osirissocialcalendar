export function InvalidLink() {
  return (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
          Bu link artık geçerli değil
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-[14px] text-[var(--text-dim)]">
          Takvim kaldırılmış ya da bağlantı hatalı olabilir. Lütfen ekiple iletişime geçin.
        </p>
      </div>
    </main>
  );
}
