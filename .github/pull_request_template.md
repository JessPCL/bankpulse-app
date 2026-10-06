## Resumen
<!-- Que cambia y por que (1 a 3 lineas). -->

## Trazabilidad
- Historias / tareas: <!-- por ejemplo HU-BP-01, HU-BP-02 o TEC-BP-01 -->
- Criterios de aceptacion cubiertos: <!-- por ejemplo CA-BP-01-1 a CA-BP-01-3 -->
- Componentes MVC: <!-- por ejemplo MVC-BP-01, MVC-BP-06, MVC-BP-11 -->
- Servicio Docker: <!-- SVC-BP-01 / SVC-BP-02 -->
- PR: <!-- PR-BP-0N -->

## Pruebas ejecutadas
<!-- Comando y resultado, por ejemplo: docker compose exec bankpulse-api node scripts/smoke.js hu01 -> PASS -->

## Lista de verificacion (Definition of Done)
- [ ] La rama sigue la convencion feature/<ID>-<descripcion>
- [ ] Los commits tienen mensajes descriptivos <tipo>(<ID>): <descripcion>
- [ ] Todos los criterios de aceptacion se verificaron con una prueba ejecutada
- [ ] `docker compose up --build` levanta y GET /health responde 200
- [ ] No hay secretos en el repositorio (solo .env.example)
- [ ] README actualizado si cambia como levantar o probar el entorno
- [ ] Un companero reviso este PR
