import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="page">
      <h1>Arquivo não encontrado</h1>
      <p className="muted">Esta pasta não existe ou foi arquivada.</p>
      <Link className="btn" href="/">Voltar ao início</Link>
    </div>
  );
}
