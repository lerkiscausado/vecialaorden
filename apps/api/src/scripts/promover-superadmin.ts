/**
 * Convierte una cuenta existente en superadministrador.
 *
 * Uso (desde la raíz del repo):
 *   npm run superadmin -w apps/api -- 3001234567
 *
 * La persona debe haberse registrado antes en la web y debe volver a
 * iniciar sesión para que el cambio de rol tome efecto.
 */
import dataSource from '../database/data-source';
import { normalizarCelular } from '../common/telefono';
import { Usuario } from '../database/entities';
import { RolUsuario } from '../database/enums';

async function main() {
  const entrada = process.argv[2];
  const celular = normalizarCelular(entrada);
  if (!celular) {
    console.error('Uso: npm run superadmin -w apps/api -- <celular>   (ej. 3001234567)');
    process.exit(1);
  }

  await dataSource.initialize();
  try {
    const usuarios = dataSource.getRepository(Usuario);
    const usuario = await usuarios.findOne({ where: { celular } });
    if (!usuario) {
      console.error(`No existe una cuenta con el celular ${celular}. Regístrala primero en la web.`);
      process.exitCode = 1;
      return;
    }
    if (!usuario.celularVerificado) {
      console.error('Esa cuenta todavía no ha verificado su celular. Verifícalo primero en la web.');
      process.exitCode = 1;
      return;
    }
    await usuarios.update(usuario.id, { rol: RolUsuario.SUPERADMIN });
    console.log(`Listo: ${usuario.nombre} (${celular}) ahora es superadministrador.`);
    console.log('Debe cerrar sesión y volver a entrar para que el cambio aplique.');
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
