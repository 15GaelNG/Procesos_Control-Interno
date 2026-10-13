# Respuestas del área de Procesos (13/10/2026)

> Respuestas de **Marco** (área de Procesos) a las preguntas abiertas del análisis, capturadas en la
> [página del análisis](https://claude.ai/artifact/BFrZTwBaocLt7c6o5kTcLP) el 13/10/2026 entre las
> 4:42 y las 4:45 p. m. Se transcriben **tal cual**, sin editar. Lo que se decidió a partir de ellas
> está en [analisis-inicial.md](../analisis-inicial.md#respuestas-de-procesos-13102026).

---

## 1. ¿Qué es el «sistema CH» y qué hace en el flujo?
*Flujo*

El **sistema de Capital Humano (CH)** es una plataforma independiente que cuenta con un módulo de Procesos, utilizado para gestionar la revisión y autorización formal de los documentos.

Actualmente, el flujo funciona de la siguiente manera:

1. **Carga del documento:** Se registra el proceso en formato editable, junto con sus datos generales, como nombre, código, objetivo, departamentos relacionados y responsable (colaborador con quien se realizó el levantamiento y seguimiento).
2. **Revisión por Procesos:** Una vez cargado, el documento se asigna a un colaborador del área de Procesos, quien realiza la revisión correspondiente y, en caso de ser necesario, registra sus comentarios u observaciones.
3. **Carga del documento en PDF:** Después de atender la revisión, se carga el documento en formato PDF para continuar con el flujo de autorizaciones.
4. **Autorización del responsable:** El sistema envía una notificación por correo electrónico al responsable del proceso para que revise el documento y otorgue su Vo. Bo.
5. **Autorización de Dirección:** Una vez autorizado por el responsable, el documento pasa al director correspondiente para obtener su Vo. Bo. final.
6. **Autorización formal:** Al concluir ambas aprobaciones, el documento adquiere el estatus de **“Autorizado”**, lo que indica que ha sido formalmente aprobado.

Por lo tanto, **CH no interviene como un área que autoriza el contenido**, sino que su sistema funciona como la plataforma en la que se administran las revisiones, notificaciones y autorizaciones de los documentos.

**Respecto al nuevo sistema de documentación de procesos**, la intención es que las actividades de elaboración, revisión y atención de observaciones se realicen en la nueva plataforma. Una vez que Procesos otorgue su Vo. Bo., el documento deberá enviarse al sistema de CH para continuar con las autorizaciones del responsable y del director correspondiente.

Cabe señalar que actualmente no todos los procesos se encuentran registrados en el sistema de CH por diversos motivos, situación que también deberá considerarse para la integración entre ambas plataformas.

---

## 2. ¿La cadena es siempre Responsable del área → Dirección? ¿Quién es el responsable de cada área?
*Autorizaciones*

No todos los documentos siguen necesariamente el mismo flujo de autorización, ya que este puede variar según el tipo de documento, el departamento y su estructura organizacional.

Actualmente, el área de Procesos realiza el levantamiento de información y elabora el documento. Posteriormente, este se comparte con el responsable del proceso, es decir, el colaborador que proporcionó la información, para su revisión y Vo. Bo. Una vez aprobado, continúa con la autorización del director correspondiente.

Con el nuevo sistema buscamos modificar principalmente la etapa de elaboración y revisión documental. La intención es que el propio colaborador registre la información y documente sus actividades directamente en la plataforma, con apoyo de herramientas de inteligencia artificial.

En este nuevo esquema, el área de Procesos será responsable de revisar y validar que el documento contenga información completa, que las actividades mantengan una secuencia lógica, que la redacción sea clara y que se cumplan los lineamientos establecidos.

Una vez que Procesos otorgue su Vo. Bo., el documento deberá enviarse al sistema de Capital Humano (CH), donde continuará con el esquema de autorizaciones que corresponda, de acuerdo con las reglas vigentes.

Es importante aclarar que no buscamos modificar ni duplicar las autorizaciones que actualmente se gestionan en CH. El nuevo sistema estará enfocado en la elaboración y validación documental, mientras que CH conservará la gestión de las autorizaciones formales.

Por lo tanto, el Vo. Bo. de Procesos no representa la autorización oficial del documento; esta se obtiene únicamente cuando concluye el flujo de autorizaciones correspondiente en CH.

---

## 3. Si autorizan dos personas, ¿qué nombre o nombres van en «Autorizado por»?
*Plantilla*

En el apartado **“Autorizado por”** deberá colocarse únicamente el nombre y cargo de la persona que otorgue la autorización final del documento, que generalmente corresponde al director del área.

Aunque el documento pase por diferentes niveles de revisión y autorización, no será necesario agregar un recuadro por cada participante, ya que la intención es conservar la estructura de la plantilla.

Las autorizaciones previas, incluyendo el Vo. Bo. del responsable del proceso, deberán quedar registradas dentro del sistema de CH, permitiendo identificar quién realizó cada autorización y en qué fecha.

De esta manera, **la plantilla mostrará únicamente al autorizador final**, mientras que el sistema de CH conservará la trazabilidad completa de las autorizaciones realizadas.

Por lo tanto, no será necesario modificar la estructura del apartado “Autorizado por” ni agregar recuadros adicionales.

---

## 4. ¿Cómo se forma el código documental?
*Códigos*

**¿Cómo se forma el código documental?**

La codificación documental se integra por tres bloques, conforme a la estructura **XX-XY-YYY**, donde cada elemento tiene una función específica:

1. **Tipo de documento (XX):** Prefijo que identifica la clasificación del documento, por ejemplo:
   - M: Manual.
   - P: Procedimiento.
   - PRO: Protocolo.
   - PL: Política.
   - F: Formato.
   - DP: Diagrama de Proceso.

2. **Departamento (X):** Clave asignada al departamento responsable del documento.

3. **Área (Y):** Identificador del área específica a la que pertenece el proceso, dentro del departamento correspondiente.

4. **Número consecutivo (YYY):** Numeración que permite identificar y diferenciar cada documento dentro de la clasificación correspondiente.

**Ejemplo: PRO-CM01-001**

- PRO: Tipo de documento (Protocolo).
- CM01: Clave integrada por departamento y área.
- 001: Número consecutivo del documento.

**Consideraciones para el nuevo sistema:**

La intención es que el sistema permita seleccionar el tipo de documento, departamento y área mediante catálogos previamente establecidos, con la finalidad de mantener una codificación uniforme y evitar errores de captura.

El número consecutivo deberá asignarse conforme a las reglas de codificación institucional vigentes, considerando los documentos existentes para evitar duplicidades.

Asimismo, es importante que el sistema conserve los códigos de los documentos previamente autorizados y que, cuando se trate de una actualización, se mantenga el código original, modificando únicamente la versión correspondiente.

**Queda pendiente confirmar** si el consecutivo se administra por combinación de tipo de documento, departamento y área, o si existe algún criterio adicional establecido en el control documental actual.

---

## 5. ¿Cuál es la regla de versiones?
*Versiones*

La versión del documento permite identificar las actualizaciones realizadas y mantener un control de los cambios a lo largo de su vigencia.

Para el nuevo sistema, se propone manejar el siguiente criterio:

Versión 0.0: Corresponde a la versión inicial del documento, desde su elaboración hasta su primera autorización oficial.

Versiones 1.0, 2.0, 3.0, etc.: Corresponden a actualizaciones mayores que implican cambios relevantes en las actividades, responsables, controles, reglas de operación o estructura del proceso.

Versiones 0.1, 0.2, 1.1, 1.2, etc.: Corresponden a actualizaciones menores que no modifican significativamente el desarrollo del proceso, como ajustes de redacción, aclaraciones o correcciones puntuales.

Consideraciones para el nuevo sistema:

La versión deberá actualizarse únicamente cuando los cambios hayan concluido su revisión y autorización correspondiente.

Durante la elaboración y revisión, el sistema deberá conservar un historial de modificaciones sin alterar la versión oficial del documento.

Cuando se trate de una actualización, el colaborador deberá indicar el motivo y describir los cambios realizados. Con esta información, el área de Procesos determinará si corresponde una actualización mayor o menor.

Asimismo, el sistema deberá conservar el historial de versiones anteriores, incluyendo fechas, responsables y motivos de modificación, para garantizar la trazabilidad documental.

Este esquema se plantea como una propuesta de control de versiones y deberá validarse antes de establecerlo como regla institucional definitiva.

---

## 6. ¿Manual, Protocolo y Política usan esta misma plantilla o cada uno tiene la suya?
*Plantilla*

Actualmente, la plantilla compartida corresponde a la documentación de **Procesos / Procedimientos**. Sin embargo, los Manuales, Protocolos y Políticas pueden contar con estructuras diferentes, dependiendo de su finalidad y del contenido que se requiera documentar.

Para el nuevo sistema, la intención es que **cada tipo de documento conserve su estructura correspondiente**, pero que todos compartan criterios generales de presentación y control documental, como:

- Encabezado institucional.
- Nombre y código del documento.
- Número de versión.
- Objetivo y alcance, cuando corresponda.
- Responsables de elaboración, revisión y autorización.
- Control de cambios.
- Formato y estilo institucional.

Las diferencias estarán principalmente en el desarrollo del contenido. Por ejemplo, un Procedimiento describe una secuencia de actividades, mientras que una Política establece lineamientos y reglas de cumplimiento.

Por lo tanto, **no se pretende utilizar una única plantilla para todos los tipos de documentos**, sino configurar plantillas específicas según su clasificación, manteniendo criterios generales homologados.

Por el momento, únicamente se ha proporcionado la plantilla de Procesos / Procedimientos. Las plantillas correspondientes a Manuales, Protocolos y Políticas deberán compartirse y validarse antes de incorporarlas al sistema.

Esto permitirá que, al seleccionar el tipo de documento, el sistema utilice automáticamente la plantilla que corresponda.

---

## 7. ¿Dónde van Responsabilidades, Definiciones y Control de cambios? ¿Se agregan las fechas de las firmas?
*Plantilla*

Actualmente, la plantilla de Procesos / Procedimientos no contempla todos los apartados mencionados. Sin embargo, para el desarrollo del nuevo sistema se propone considerar lo siguiente:

- **Responsabilidades:** Se podrá incorporar un apartado específico cuando sea necesario definir las funciones y obligaciones de los participantes del proceso. Esta información también podrá identificarse dentro de las actividades documentadas.
- **Definiciones:** Se incluirá como un apartado opcional, destinado a explicar términos técnicos, abreviaturas o conceptos relevantes para la comprensión del documento.
- **Control de cambios:** Deberá incorporarse a la plantilla para registrar las modificaciones realizadas al documento, considerando número de versión, fecha, descripción del cambio y responsable de la modificación.
- **Fechas de elaboración, revisión y autorización:** Se propone que el sistema registre automáticamente las fechas correspondientes a cada etapa, junto con el nombre del colaborador que realizó la acción.

**Respecto a las firmas y autorizaciones**, es importante considerar que la autorización formal continuará gestionándose mediante el sistema de Capital Humano (CH). Por lo tanto, las fechas de autorización deberán corresponder a las registradas en dicho sistema y no únicamente al Vo. Bo. otorgado por Procesos.

**Para el nuevo sistema**, se propone actualizar la plantilla de manera que contemple estos apartados, procurando mantener su estructura y presentación institucional. Las secciones que no sean aplicables a determinados documentos podrán configurarse como opcionales.

Finalmente, será necesario validar los ajustes a la plantilla antes de establecerla como formato definitivo para la generación automática de documentos.

---

## 8. ¿Cómo debe verse cada actividad en «04. Desarrollo»?
*Plantilla*

Para el apartado **04. Desarrollo**, la intención es que las actividades se presenten de manera ordenada, clara y con una estructura uniforme, tomando como referencia la plantilla institucional de Procesos / Procedimientos.

Cada actividad deberá contener los siguientes elementos:

- **Número de actividad:** Numeración consecutiva que permita identificar la secuencia del proceso.
- **Responsable:** Puesto o departamento encargado de ejecutar la actividad.
- **Descripción:** Explicación clara de la actividad que debe realizarse, indicando qué se hace, cómo se realiza y, cuando corresponda, las condiciones o validaciones aplicables.
- **Imágenes o evidencias:** Cuando sea necesario, podrán incorporarse capturas de pantalla, diagramas o imágenes que faciliten la comprensión de la actividad.
- **Pie de imagen:** Cada imagen deberá contar con una breve descripción que permita identificar su contenido.

Las imágenes deberán colocarse debajo de la descripción de la actividad correspondiente, procurando mantener un tamaño uniforme y evitando alterar la estructura del documento.

**Consideraciones para el nuevo sistema:**

La intención es que el colaborador capture cada actividad de manera individual mediante el formulario del sistema, indicando el responsable, la descripción y, cuando aplique, adjuntando imágenes.

Con esta información, el sistema deberá generar automáticamente el apartado 04. Desarrollo, respetando la estructura y el formato institucional de la plantilla.

La numeración de las actividades deberá generarse automáticamente y ajustarse cuando se agreguen, eliminen o reordenen actividades.

Asimismo, el área de Procesos deberá poder revisar y solicitar correcciones antes de que se genere la versión destinada a autorización.

**Como referencia**, se utilizará la plantilla de Procesos / Procedimientos previamente compartida. Adicionalmente, se podrá proporcionar un documento aprobado que sirva como ejemplo de la presentación final de las actividades, incluyendo descripciones e imágenes.

---

## 9. ¿Quieren aviso por correo en cada cambio de estado? ¿A quién?
*Avisos*

Para el nuevo sistema de documentación de procesos, se propone implementar notificaciones automáticas por correo electrónico, principalmente cuando exista una actividad pendiente de revisión, corrección o autorización.

Las notificaciones deberán enviarse de acuerdo con el estado del documento y el responsable de la siguiente actividad.

**Se propone el siguiente esquema:**

1. **Documento enviado a revisión:** Cuando el colaborador termine de documentar su proceso y lo envíe a revisión, el sistema deberá notificar al colaborador de Procesos que tenga asignado el documento.

2. **Documento con observaciones:** Cuando Procesos identifique información incompleta, errores o aspectos que deban corregirse, el sistema notificará al colaborador que elaboró el documento, incluyendo las observaciones correspondientes.

3. **Documento corregido:** Cuando el colaborador atienda las observaciones y vuelva a enviar el documento, se notificará nuevamente al revisor de Procesos.

4. **Vo. Bo. de Procesos:** Una vez que Procesos concluya la revisión y valide el documento, se notificará al colaborador que su documentación fue aprobada en esta etapa y que continuará con el proceso de autorización formal en CH.

5. **Autorizaciones en CH:** Las notificaciones dirigidas al responsable del proceso y al director correspondiente deberán continuar gestionándose desde el sistema de Capital Humano, conforme a su flujo de autorizaciones.

6. **Documento autorizado o rechazado:** Una vez concluido el flujo en CH, se propone que el nuevo sistema reciba la actualización del estatus y notifique al colaborador y al área de Procesos sobre el resultado.

**Consideraciones adicionales:**

- Las notificaciones deberán incluir el nombre del documento, código (cuando ya esté asignado), estado, responsable y un enlace directo para consultar o atender la actividad.
- Los comentarios u observaciones deberán quedar registrados dentro del sistema.
- Se deberá conservar una bitácora de los cambios de estado, identificando al usuario, fecha y acción realizada.
- Se podrán considerar recordatorios automáticos para documentos que permanezcan pendientes de atención durante un periodo determinado.

**La intención no es enviar un correo por cada modificación realizada**, sino únicamente cuando exista un cambio de estado relevante o una acción pendiente por parte de otro participante.

Asimismo, se busca evitar duplicar las notificaciones que actualmente genera el sistema de CH, manteniendo una separación clara entre la revisión documental y las autorizaciones formales.

---

## 10. ¿Están de acuerdo con que el texto de los procesos pase por el nivel gratuito de Gemini? ¿Hay procesos confidenciales?
*IA*

Sí, estamos de acuerdo con integrar Gemini como herramienta de inteligencia artificial, ya que es una de las funcionalidades principales que buscamos implementar en el nuevo sistema de documentación de procesos.

La intención es que la IA apoye al colaborador y al área de Procesos en las siguientes actividades:

Mejorar la redacción, ortografía y claridad de las actividades documentadas.

Analizar la secuencia lógica de las actividades e identificar posibles inconsistencias.

Detectar información incompleta, actividades duplicadas o pasos que requieran mayor explicación.

Proponer mejoras en la estructura y organización del proceso.

Apoyar en la elaboración del objetivo, alcance, responsabilidades y demás apartados del documento.

Formular preguntas al colaborador cuando la información proporcionada sea insuficiente.

Respecto a la confidencialidad, reconocemos que algunos procesos pueden contener información interna o sensible. Sin embargo, consideramos viable evaluar el uso de Gemini, siempre que se establezcan controles sobre la información que se comparte.

En este sentido, proponemos que la información enviada a la IA se limite a las descripciones de las actividades y los puestos involucrados, excluyendo nombres, datos personales, contraseñas, información financiera específica y otros datos confidenciales.

Adicionalmente, sería conveniente que TI valide las condiciones de uso del nivel gratuito y determine si los controles propuestos son suficientes o si se requiere una modalidad con mayores garantías de privacidad.

Lo que buscamos es que la IA sea una herramienta activa durante la elaboración y revisión de los documentos, y no únicamente un corrector de texto.

Las recomendaciones generadas por la IA deberán ser revisadas y aceptadas por el colaborador o por el área de Procesos antes de incorporarse al documento, evitando modificaciones automáticas sin validación.

Por lo tanto, estamos de acuerdo con utilizar Gemini como parte del desarrollo, considerando las medidas necesarias para proteger la información institucional.

---

## 11. ¿En qué formato está hoy el inventario documental? ¿Los documentos vigentes están en Word editable?
*Inventario*

Actualmente, contamos con un inventario documental que permite identificar los procesos existentes mediante información como el nombre del documento, código, versión y departamento al que pertenece.

La mayoría de los documentos se encuentran en formato Word editable; sin embargo, también existen documentos en PDF, por lo que no podemos garantizar que todos estén disponibles en formato editable.

Respecto a la actualización de documentos existentes, estamos de acuerdo con que la inteligencia artificial apoye en la identificación y separación de las actividades, especialmente cuando se trate de documentos que fueron elaborados fuera del nuevo sistema.

Para ello, proponemos el siguiente funcionamiento:

Carga del documento existente: El colaborador podrá adjuntar un archivo Word o PDF correspondiente al proceso que desea actualizar.

Análisis mediante IA: El sistema analizará el contenido e identificará las actividades, responsables, secuencia del proceso y demás información relevante.

Separación de actividades: La IA propondrá la distribución del contenido en actividades individuales, conforme a la estructura requerida por el nuevo sistema.

Validación del colaborador: Antes de continuar, el colaborador deberá revisar la información extraída y podrá corregir, agregar, eliminar o reorganizar las actividades propuestas.

Actualización del proceso: Una vez validada la estructura, el colaborador podrá realizar las modificaciones necesarias y enviar el documento a revisión del área de Procesos.
