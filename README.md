# CERCA Reencuentro MVP v3

Next.js + Supabase + Resend para reunificación familiar tras emergencias, con contacto protegido, verificación, dashboard de reportante y sección de ayuda ciudadana.

## Novedades v3

- Login sin contraseñas mediante OTP por correo.
- Acceso solo para:
  - personas que reportaron desaparecidos usando ese correo;
  - admins definidos en `ADMIN_EMAILS`.
- Dashboard `/mi-cuenta` para reportantes:
  - casos reportados;
  - estado actual;
  - vistas;
  - compartidos;
  - avisos/evidencias recibidas;
  - fotos/evidencias privadas con URL firmada.
- Admin `/admin` también por OTP, sin contraseña.
- Evidencias/fotos de encontrados visibles para admins y para el dueño del caso, no para el público.
- Módulo público `/ayudar`:
  - centros de acopio;
  - solicitudes específicas;
  - información general / noticias;
  - números y contactos de emergencia;
  - tips.
- Panel admin para publicar/ocultar información de ayuda.
- Contadores de vistas y compartidos por caso.

## Stack

- Next.js App Router
- Server Actions
- Supabase Postgres + Storage
- Resend para emails/OTP
- Tailwind CSS v4
- Vercel

## Instalación

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Supabase

Ejecuta `supabase/schema.sql` en el SQL Editor. Si ya tenías v1/v2, el script intenta migrar sin borrar datos.

Crea/migra:

- `person_cases`
- `case_reports`
- `verification_logs`
- `otp_codes`
- `aid_resources`
- vistas públicas:
  - `public_person_cases`
  - `public_case_stats`
  - `public_aid_resources`
- buckets:
  - `case-photos`, público;
  - `private-evidence`, privado.

## Variables de entorno

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_PUBLIC_PHOTOS_BUCKET=case-photos
SUPABASE_PRIVATE_EVIDENCE_BUCKET=private-evidence
RESEND_API_KEY=
EMAIL_FROM="CERCA Reencuentro <alertas@tu-dominio.com>"
ADMIN_EMAILS="moderador1@correo.com,moderador2@correo.com"
SESSION_SECRET="genera-un-secreto-largo"
```

`ADMIN_PASSWORD` ya no se usa.

## Flujo de usuarios

### Público

Puede buscar casos, compartir fichas, reportar información, reportar personas encontradas, subir listados de encontrados y consultar `/ayudar`. No necesita login.

### Reportante de desaparecido

Debe indicar email al crear el caso. Luego puede entrar en `/mi-cuenta` con un código OTP y ver:

- estado de sus casos;
- vistas;
- veces compartido;
- evidencias y avisos recibidos;
- enlaces públicos.

### Admin

Entra por `/entrar` con un correo presente en `ADMIN_EMAILS`. Puede revisar casos, cambiar estados, ver evidencias privadas y publicar/ocultar información de ayuda.

## Formato CSV para encontrados

```csv
nombre,edad,ubicacion,notas
Ana Pérez,32,Refugio La Guaira,Está consciente
Luis Gómez,,Hospital X,Sin teléfono
```

## Recomendaciones production-ready antes de difusión masiva

- Activar Cloudflare Turnstile o reCAPTCHA en formularios públicos.
- Agregar rate limiting por IP en Server Actions/API routes, por ejemplo Upstash Redis o Vercel KV.
- Verificar dominio en Resend y configurar SPF/DKIM/DMARC.
- Agregar monitoreo de errores, por ejemplo Sentry.
- Definir protocolo humano de validación: quién puede marcar encontrado, reunificado, duplicado o descartado.
- Hacer backups/exportaciones periódicas de Supabase.
- Publicar una política breve de privacidad y eliminación de datos.
- Evitar publicar datos médicos, direcciones exactas o teléfonos de familiares.
