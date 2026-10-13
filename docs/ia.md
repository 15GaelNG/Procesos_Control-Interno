# Inteligencia artificial

## Decisión (13/10/2026)

**Proveedor inicial: API de Gemini (Google AI Studio), nivel gratuito.**

| Opción | Por qué sí / por qué no |
|---|---|
| **Gemini API, nivel gratuito** ✅ | No tiene costo ni pide tarjeta. Es de Google, como todo el sistema. Para redactar y revisar texto alcanza de sobra con su cuota. |
| ChatGPT Pro (la suscripción que ya tienes) | **No sirve para esto:** la suscripción de ChatGPT es para usar el chat. Conectar un sistema requiere la API de OpenAI, que se cobra aparte por consumo. |
| Claude API (Anthropic) | Muy buena para redacción, pero se paga por consumo. Queda como alternativa si más adelante se aprueba un presupuesto. |
| Gemini API, nivel de pago | Es el mismo servicio. Si un día se necesita más cuota o privacidad, solo se activa la facturación en la misma cuenta y el código no cambia. |

## Lo que hay que saber del nivel gratuito

- **Tiene límites, aunque holgados para este uso.** Google pone topes de solicitudes por minuto y
  por día que cambian según el modelo. En 2026 rondan **unas 10 por minuto y unos cientos por día**
  en los modelos «Flash». Un análisis completo de un documento usa entre 2 y 4 llamadas, así
  que alcanza para decenas de documentos diarios. Los límites exactos se confirman en la página
  oficial al crear la llave, porque Google los ajusta.
- **Los topes son por proyecto de Google Cloud, no por llave.** Si pruebas y producción usan llaves
  de proyectos distintos, cada ambiente tiene su propia cuota.
- **Privacidad:** en el nivel gratuito Google **puede usar lo que se le envía para mejorar sus
  productos**, incluida la revisión por personas. En el nivel de pago no. Por eso:
  - A la IA solo se le envía **el texto del proceso y los nombres de los puestos**, nunca nombres de
    personas, correos ni datos personales.
  - El área de Procesos debe estar de acuerdo con que la descripción de sus procesos internos pase por
    el nivel gratuito. Si algún proceso es confidencial, se activa la facturación (costo de centavos
    para texto) o se apaga la IA para ese caso.
- **Si la IA falla o se acaba la cuota, el sistema sigue funcionando.** La IA solo sugiere: sin ella
  el colaborador captura y confirma igual (`IA_ACTIVA = NO` en `Config`), y hay un tope diario
  propio (`IA_MAX_LLAMADAS_DIA`) para no llegar al límite de Google a media captura.

## Qué tiene que hacer Gael

1. Entrar a **Google AI Studio** (aistudio.google.com) con la cuenta del proyecto. Si es la cuenta
   corporativa y no deja entrar, el administrador de Workspace tiene que habilitar el servicio.
2. Crear una **llave de API** (de preferencia dos: una para pruebas y otra para producción, cada una
   en su propio proyecto).
3. Guardar cada llave en su Apps Script: *Configuración del proyecto → Propiedades del script →*
   `IA_LLAVE`. **Nunca** en el código, la hoja o un chat.

Ni Claude ni nadie más puede crear la cuenta o la llave por ti: queda a nombre de tu cuenta.

## Cómo se usa en el sistema

- **Una sola puerta:** todo pasa por `src/ia/ClienteIA.gs` (fase 3). Cambiar de proveedor es cambiar
  ese archivo, no el resto del sistema.
- **Respuestas con estructura fija (JSON).** Cada responsable o dato derivado trae el ID de la
  actividad y el fragmento de texto de donde salió. El servidor valida que exista; lo que no se
  pueda sustentar se vuelve **pregunta**, no dato (requerimiento §3.3: la IA nunca inventa).
- **Los puestos se cotejan contra el catálogo** `Puestos`. Si no hay coincidencia clara, se pregunta.
- **La IA propone, la persona decide.** Nada entra al documento sin aceptación; todo queda en
  `PropuestasIA`.
- **Nunca reordena actividades sola:** solo sugiere, con el porqué (§3.4).
- Cada llamada se registra en `UsoIA`.

| Función | Momento |
|---|---|
| Mejorar la redacción de una actividad | Al capturar o en el análisis |
| Identificar el responsable (puesto) de cada actividad | Análisis |
| Proponer objetivo, alcance, responsabilidades y definiciones | Análisis |
| Detectar lo que falta y formular preguntas | Análisis |
| Sugerir ajustes de orden, explicando por qué | Análisis |
| Sugerir pies de imagen | Opcional |
| Sugerir motivos del control de cambios | Actualizaciones |

## Pendiente (prueba de concepto, fase 0)

- Elegir el modelo (`IA_MODELO`) según calidad en español y la cuota disponible.
- Probar las instrucciones con ejemplos reales de documentos aprobados que entregue Procesos.
