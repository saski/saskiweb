<p class="note-soundtrack">
  <a href="https://open.spotify.com/track/6HD1vJ5TDWnVmkreTQcv4v?utm_source=openai&amp;utm_medium=chatgpt&amp;go=1&amp;nap_web=1&amp;request_id=c8adc4db-2767-44a8-858b-af9f92f8d568">
    <img src="https://i.scdn.co/image/ab67616d00004851991b3e4cb280f498a57d88a1" width="32" height="32" alt="Portada de Lagos Shake: A Tony Allen Chop Up" decoding="async">
    <span><span class="soundtrack-label">Soundtrack · Spotify</span><span class="soundtrack-track">Moyege - Mark's Disco Dub · Mark Ernestus</span><span class="soundtrack-album">Lagos Shake: A Tony Allen Chop Up</span></span>
  </a>
</p>

Arnesto es el entorno que uso para trabajar con agentes. Ahí junto las reglas, los skills, el contexto y las herramientas, con unas cuantas decisiones sobre qué puede hacer cada una. Lo publico para quien quiera mirar dentro o construir su propio arnés. Incluye mis necesidades, mis manías y mis puñetas, así que no espero que alguien lo instale entero y le encaje tal cual.

Empezó en el Q3 de 2025 como un fork de la configuración de [Eduardo Ferro Aldama](https://github.com/eferro/augmentedcode-configuration). Durante bastante tiempo se llamó Augmented Code Configuration, hasta que aquello fue creciendo más allá de las reglas para una herramienta de coding y el nombre se quedó corto. *Arnesto* salió de juntar *arnés* con Ernesto.

Para explicar cómo lo organizo, voy a recorrer algunas de esas decisiones con enlaces a los archivos donde están recogidas. Los ejemplos corresponden a la versión pública del 6 de octubre de 2026.

## Qué cargo en cada tarea

Hay unas pocas instrucciones que quiero mantener presentes en cualquier tarea: entender el objetivo antes de tocar nada, hacer el cambio más pequeño que resuelva el problema, verificarlo y explicar lo que queda incierto. Están en [`.agents/rules/base.md`](https://github.com/saski/arnesto/blob/97c4a705f807365e2cd77d4f89a3eba052fbd38e/.agents/rules/base.md).

El detalle de Python, React o Makefile lo cargo cuando hace falta, y las convenciones de cada repositorio se quedan en ese repositorio. Así evito que una instrucción pensada para un proyecto condicione el trabajo en los demás. «No digas que una comprobación ha pasado si no la has ejecutado» me sirve siempre; las instrucciones de un pipeline de BigQuery, cuando estoy trabajando con BigQuery.

Con los skills sigo la misma idea. Un skill recoge un procedimiento que puedo reutilizar, por ejemplo para revisar un Dockerfile, preparar una entrevista o trabajar con un documento. Busco el que encaja con la tarea y abro su `SKILL.md`.

Para encontrarlo uso primero el catálogo del cliente con el que estoy trabajando. Si no tiene uno, consulto la sección correspondiente del [catálogo por dominio](https://github.com/saski/arnesto/blob/97c4a705f807365e2cd77d4f89a3eba052fbd38e/.agents/docs/skill-domain-routing.md). El inventario completo me sirve para mantener la biblioteca, pero cargarlo al principio de cada tarea añade información que no necesito en ese momento.

Que dos herramientas puedan leer el mismo procedimiento tampoco les da acceso a lo mismo. Compartir un skill no comparte la sesión del navegador, las credenciales ni los permisos de la otra herramienta.

## Cómo continúo una tarea entre sesiones

En una tarea larga necesito poder recuperar por qué tomé una decisión sin volver a reconstruir toda la conversación. Planning e *intentional compaction* me ayudaron a conservar lo importante; aquí debo mucho a HumanLayer y [Dexter Horthy](https://www.linkedin.com/in/dexterihorthy/). OpenSpec añadió una estructura para conectar requisitos, decisiones, ejecución y verificación, gracias también a [Alvaro Moya](https://www.linkedin.com/in/alvarormoya/).

En Arnesto guardo las especificaciones en [`docs/openspec/`](https://github.com/saski/arnesto/tree/97c4a705f807365e2cd77d4f89a3eba052fbd38e/docs/openspec), y la investigación y los planes en `thoughts/`. Son archivos a los que puedo volver cuando continúo el trabajo en otra sesión.

Las recetas y la evidencia de un experimento, en cambio, se quedan en el proyecto que lo realiza. Los logs completos y el estado temporal quedan fuera del historial publicado. En Arnesto conservo los mecanismos que puedo reutilizar para coordinar ese trabajo; la [guía de artefactos de coordinación](https://github.com/saski/arnesto/blob/97c4a705f807365e2cd77d4f89a3eba052fbd38e/docs/free-worker-coordination/README.md) explica qué va en cada sitio.

## Qué comparto entre herramientas

Trabajo con Codex, Cursor, Claude o Gemini en local; con Hermes a través de Telegram; y con OpenCode y OmniRoute en algunas rutas de ejecución. También voy evaluando otras herramientas. Quiero poder cambiar esas piezas y conservar las convenciones que ya me funcionan.

Para conectar las reglas y los skills con los clientes compatibles uso [`setup-symlinks.sh`](https://github.com/saski/arnesto/blob/97c4a705f807365e2cd77d4f89a3eba052fbd38e/setup-symlinks.sh). Algunas configuraciones se inicializan desde `templates/` y después se mantienen en el entorno de la propia herramienta. No todas las configuraciones son enlaces vivos al repositorio.

Las credenciales, las sesiones, las bases de datos locales y los permisos siguen siendo responsabilidad de cada herramienta. Por eso mantengo separados los directorios de Codex y Orca: contienen bastante más que una preferencia de modelo. Esa decisión está documentada en la [guía de límites entre runtimes](https://github.com/saski/arnesto/blob/97c4a705f807365e2cd77d4f89a3eba052fbd38e/docs/codex-orca-runtime-boundary.md).

## Cuando delego una tarea

El [adaptador de workers](https://github.com/saski/arnesto/blob/97c4a705f807365e2cd77d4f89a3eba052fbd38e/.agents/skills/free-agent-execution/SKILL.md) es un ejemplo de cómo acoto el trabajo que delego. Su contrato declara el directorio de trabajo, los archivos permitidos, la sensibilidad del material, el modelo y la validación. Este fragmento muestra parte de esa estructura:

```json
{
  "task_class": "bounded_code",
  "sensitivity": "non_sensitive",
  "allowed_files": ["README.md"],
  "validation": {
    "command": ["make", "test"]
  },
  "require_changes": true
}
```

El fragmento sirve para explicar el formato; no es un contrato completo con el que lanzar un worker. En este adaptador, `allowed_files` comprueba qué archivos han cambiado después de la ejecución. No impide que el proceso escriba en otros sitios. El adaptador tampoco aísla la red ni el sistema de archivos, así que esa lista en el JSON no permite afirmar que el proceso esté aislado.

Delegar deja en manos de quien coordina la preparación del alcance, la revisión del diff y la ejecución de las comprobaciones. Si alguna no se ha ejecutado, el resultado debe decirlo. Si el trabajo se envía a un proveedor externo, el material tiene que estar autorizado para ese destino.

## Por dónde empezaría

Para montar un entorno propio empezaría por una regla que evite un fallo recurrente, un skill para una tarea habitual y un lugar donde conservar requisitos y decisiones. Después probaría esas piezas con trabajo real. Copiar todos mis modelos, rutas y clientes de golpe haría difícil saber qué aporta cada uno.

La [guía de desarrollo](https://github.com/saski/arnesto/blob/97c4a705f807365e2cd77d4f89a3eba052fbd38e/docs/development-guide.md) y el `Makefile` permiten ver cómo compruebo la configuración del repositorio. Esas comprobaciones detectan incoherencias concretas. Que pasen no demuestra que cualquier agente vaya a comportarse bien en cualquier tarea.

Mientras sigo cambiando herramientas, quiero poder explicar las decisiones que he tomado, ver dónde están los límites y revisar lo que ha ocurrido con suficiente evidencia. Para explorar qué pasa cuando muchas tareas llegan a la revisión humana, estoy usando [Agent Systems Lab](/notes/agent-systems-lab/).
