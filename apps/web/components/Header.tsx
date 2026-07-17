const GITHUB_URL = "https://github.com/harrisonjansma/call-copilot";
const SITE_URL = "https://harrisonjansma.com";

export function Header() {
  return (
    <header className="flex flex-col gap-1 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Live Call Copilot</h1>
        <p className="text-sm text-slate-500">
          Real-time transcript, notes, doc retrieval &amp; sentiment — built by Harrison Jansma
        </p>
      </div>
      <nav className="flex gap-4 text-sm">
        <a className="text-blue-600 hover:underline" href={GITHUB_URL} target="_blank" rel="noreferrer">
          GitHub
        </a>
        <a className="text-blue-600 hover:underline" href={SITE_URL} target="_blank" rel="noreferrer">
          harrisonjansma.com
        </a>
      </nav>
    </header>
  );
}
