import Link from 'next/link';

export function Encabezado({ enlaces = true }: { enlaces?: boolean }) {
  return (
    <header className="encabezado">
      <div className="contenedor">
        <Link href="/" className="marca" aria-label="Veci a la Orden, inicio">
          <span className="marca-icono" aria-hidden="true">V</span>
          <span style={{ color: '#fff' }}>
            Veci <span>a la Orden</span>
          </span>
        </Link>
        {enlaces && (
          <nav className="nav" aria-label="Cuenta">
            <Link href="/ingresar">Ingresar</Link>
            <Link href="/registro">Regístrate</Link>
          </nav>
        )}
      </div>
    </header>
  );
}

export function Pie() {
  return (
    <footer className="pie">
      <div className="contenedor">
        <span>© {new Date().getFullYear()} Veci a la Orden · Colombia</span>
        <span>Términos y condiciones · Política de datos</span>
      </div>
    </footer>
  );
}
