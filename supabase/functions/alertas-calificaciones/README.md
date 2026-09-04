# alertas-calificaciones

Edge Function que revisa la tabla `calificaciones` y manda un correo (vía Resend)
con las calificaciones vencidas y las próximas a vencer (30 días de aviso).

## Desplegar (requiere tu cuenta de Supabase, no lo puede hacer el asistente)

1. Crea una cuenta en https://resend.com y genera un API key (tier gratuito alcanza).
2. En la terminal, dentro de la carpeta del proyecto:
   ```
   npx supabase login
   npx supabase functions deploy alertas-calificaciones --project-ref cvkwmnirizycmciqnaok
   npx supabase secrets set RESEND_API_KEY=tu_api_key RESEND_TO=farroyo@amayacuriel.com --project-ref cvkwmnirizycmciqnaok
   ```
   (`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` los inyecta Supabase automáticamente, no hace falta configurarlos.)

   Alternativa sin CLI: copia el contenido de `index.ts` directo en el editor de
   Edge Functions del Dashboard de Supabase (Edge Functions → New Function) y
   configura los mismos secrets ahí (Settings → Edge Functions → Secrets).

3. Probar manualmente: botón "Invoke" en el Dashboard, o:
   ```
   curl -X POST https://cvkwmnirizycmciqnaok.supabase.co/functions/v1/alertas-calificaciones \
     -H "Authorization: Bearer TU_ANON_O_SERVICE_KEY"
   ```
   Debe llegar un correo a RESEND_TO si hay algo vencido o próximo a vencer.

4. Programar ejecución diaria: Dashboard → Database → Cron Jobs → New Cron Job,
   que haga un `net.http_post` a la URL de la función (ej. todos los días a las 8:00am).
