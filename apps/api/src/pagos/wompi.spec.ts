import { createHash } from 'crypto';
import { EstadoPago } from '../database/enums';
import { estadoDesdeWompi, eventoValido, firmaIntegridad, urlApi, urlCheckout } from './wompi';

const sha = (t: string) => createHash('sha256').update(t).digest('hex');

describe('wompi', () => {
  it('firma de integridad = SHA256(referencia + centavos + moneda + secreto)', () => {
    // Ejemplo de la documentación de Wompi.
    expect(firmaIntegridad('sk8-438k4-xmxm392-sn2m', 2490000, 'COP', 'prod_integrity_Z5mMke9x0k8gpErbDqwrJXMqsI6SFli6')).toBe(
      sha('sk8-438k4-xmxm392-sn2m2490000COPprod_integrity_Z5mMke9x0k8gpErbDqwrJXMqsI6SFli6'),
    );
  });

  it('arma la URL del checkout con firma y regreso', () => {
    const url = new URL(
      urlCheckout(
        { llavePublica: 'pub_test_abc', secretoIntegridad: 'test_integrity_x', secretoEventos: 'e' },
        { referencia: 'VAO-1-AB', montoEnCentavos: 4_500_000, urlRegreso: 'http://localhost:3000/pagos/resultado?ref=VAO-1-AB', celular: '+573001234567' },
      ),
    );
    expect(url.origin + url.pathname).toBe('https://checkout.wompi.co/p/');
    expect(url.searchParams.get('amount-in-cents')).toBe('4500000');
    expect(url.searchParams.get('signature:integrity')).toBe(firmaIntegridad('VAO-1-AB', 4_500_000, 'COP', 'test_integrity_x'));
    expect(url.searchParams.get('redirect-url')).toBe('http://localhost:3000/pagos/resultado?ref=VAO-1-AB');
    expect(url.searchParams.get('customer-data:phone-number')).toBe('3001234567');
  });

  it('usa sandbox con llaves de prueba', () => {
    expect(urlApi('pub_test_x')).toContain('sandbox');
    expect(urlApi('pub_prod_x')).toContain('production');
  });

  describe('eventos', () => {
    const tx = { id: '1234-1610641025-49201', status: 'APPROVED', amount_in_cents: 4_490_000, reference: 'VAO-1-AB' };
    const evento = (checksum: string) => ({
      event: 'transaction.updated',
      data: { transaction: tx },
      signature: { properties: ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'], checksum },
      timestamp: 1530291411,
    });
    const correcto = sha(`${tx.id}${tx.status}${tx.amount_in_cents}1530291411secreto_eventos`);

    it('acepta un checksum correcto', () => {
      expect(eventoValido(evento(correcto), 'secreto_eventos')).toBe(true);
      expect(eventoValido(evento(''), 'secreto_eventos', correcto.toUpperCase())).toBe(true);
    });

    it('rechaza firmas alteradas o con otro secreto', () => {
      expect(eventoValido(evento(correcto), 'otro_secreto')).toBe(false);
      expect(eventoValido({ ...evento(correcto), timestamp: 1530291412 }, 'secreto_eventos')).toBe(false);
      expect(eventoValido(evento('abc'), 'secreto_eventos')).toBe(false);
      expect(eventoValido({}, 'secreto_eventos')).toBe(false);
    });
  });

  it('traduce estados', () => {
    expect(estadoDesdeWompi('APPROVED')).toBe(EstadoPago.APROBADO);
    expect(estadoDesdeWompi('DECLINED')).toBe(EstadoPago.RECHAZADO);
    expect(estadoDesdeWompi('VOIDED')).toBe(EstadoPago.ANULADO);
    expect(estadoDesdeWompi('ERROR')).toBe(EstadoPago.ERROR);
    expect(estadoDesdeWompi('PENDING')).toBe(EstadoPago.PENDIENTE);
  });
});
