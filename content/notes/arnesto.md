Arnesto es mi entorno real de trabajo con agentes: reglas, skills, contexto, herramientas y unas cuantas decisiones sobre qué puede hacer cada una. Lo publico como referencia para quien quiera mirar dentro o construir su propio arnés. Incluye mis necesidades, mis manías y mis puñetas; no espero que alguien lo instale entero y le encaje tal cual.

Empezó en el Q3 de 2025 como un fork de la configuración de [Eduardo Ferro Aldama](https://github.com/eferro/augmentedcode-configuration). Durante bastante tiempo se llamó Augmented Code Configuration. El nombre dejó de servir cuando aquello creció más allá de las reglas de una herramienta de coding. *Arnesto* salió de juntar *arnés* con Ernesto.

La parte útil de esa evolución son las decisiones que puedo enseñar con archivos concretos. Esta es una fotografía de la versión pública del 6 de octubre de 2026.

## Pocas reglas siempre presentes

Las instrucciones universales viven en [`.agents/rules/base.md`](https://github.com/saski/arnesto/blob/97c4a705f807365e2cd77d4f89a3eba052fbd38e/.agents/rules/base.md). Ahí están los hábitos que quiero en cualquier tarea: entender el objetivo antes de tocar nada, hacer el cambio más pequeño que resuelva el problema, verificarlo y explicar lo que queda incierto.

El detalle de Python, React o Makefile se carga cuando la tarea lo necesita. Las convenciones de un repositorio pertenecen a ese repositorio. Esta separación evita que una instrucción para un proyecto acabe condicionando todos los demás.

Por ejemplo, «no digas que una comprobación ha pasado si no la has ejecutado» merece estar siempre presente. Las instrucciones de un pipeline de BigQuery sólo aportan algo cuando estoy trabajando con BigQuery.

## Los skills se buscan; no se vuelcan todos al contexto

Un skill contiene un procedimiento reutilizable. Puede ayudar a revisar un Dockerfile, preparar una entrevista o trabajar con un documento. El [catálogo por dominio](https://github.com/saski/arnesto/blob/97c4a705f807365e2cd77d4f89a3eba052fbd38e/.agents/docs/skill-domain-routing.md) permite encontrar los que encajan sin leer toda la biblioteca.

La regla práctica es usar primero el catálogo que ofrece el cliente activo y abrir el `SKILL.md` elegido. Si el cliente no tiene catálogo, se consulta la sección relevante del índice por dominio. El inventario completo sirve para mantener la biblioteca; cargarlo como prólogo de cada tarea no ayuda.

También distingo conocer un procedimiento de poder ejecutarlo. Compartir un skill entre herramientas no comparte una sesión de navegador, una credencial ni los permisos de otra herramienta.

## La intención duradera vive fuera del chat

Planning e *intentional compaction* me ayudaron a conservar lo importante durante tareas largas; aquí debo mucho a HumanLayer y [Dexter Horthy](https://www.linkedin.com/in/dexterihorthy/). OpenSpec añadió una estructura para conectar requisitos, decisiones, ejecución y verificación, gracias también a [Alvaro Moya](https://www.linkedin.com/in/alvarormoya/).

En Arnesto, [`docs/openspec/`](https://github.com/saski/arnesto/tree/97c4a705f807365e2cd77d4f89a3eba052fbd38e/docs/openspec) contiene esas especificaciones; `thoughts/` guarda investigación y planes. Cuando una tarea cambia de sesión, debería ser posible recuperar por qué se tomó una decisión sin reconstruir toda la conversación.

No todo pertenece a Arnesto. Las recetas y la evidencia de un experimento pertenecen al proyecto que lo realiza. Los logs completos y el estado temporal quedan fuera del historial publicado. Arnesto conserva los mecanismos reutilizables. Esta [guía de artefactos de coordinación](https://github.com/saski/arnesto/blob/97c4a705f807365e2cd77d4f89a3eba052fbd38e/docs/free-worker-coordination/README.md) explica la frontera.

## Compartir convenciones no implica compartir el estado de cada herramienta

Trabajo con distintas superficies: Codex, Cursor, Claude o Gemini en local; Hermes con Telegram; OpenCode y OmniRoute en algunas rutas de ejecución. También evalúo otras herramientas. El objetivo es poder cambiar piezas sin perder las convenciones que ya funcionan.

[`setup-symlinks.sh`](https://github.com/saski/arnesto/blob/97c4a705f807365e2cd77d4f89a3eba052fbd38e/setup-symlinks.sh) conecta reglas y skills con los clientes compatibles. Algunas configuraciones se inicializan desde `templates/` y después se mantienen en su runtime. No son todas enlaces vivos al repositorio.

Las credenciales, sesiones, bases de datos locales y permisos siguen siendo responsabilidad de cada herramienta. En particular, Codex y Orca conservan directorios separados: contienen bastante más que una preferencia de modelo. La [guía de límites entre runtimes](https://github.com/saski/arnesto/blob/97c4a705f807365e2cd77d4f89a3eba052fbd38e/docs/codex-orca-runtime-boundary.md) documenta esa decisión.

## Delegar exige acotar la tarea y revisar lo que vuelve

Un ejemplo concreto es el [adaptador de workers](https://github.com/saski/arnesto/blob/97c4a705f807365e2cd77d4f89a3eba052fbd38e/.agents/skills/free-agent-execution/SKILL.md). Su contrato declara el directorio de trabajo, los archivos permitidos, la sensibilidad, el modelo y la validación. Un fragmento de su estructura es:

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

Es un fragmento explicativo, no un contrato completo para lanzar un worker. Los límites también importan: `allowed_files` comprueba cambios después de la ejecución; no es un sandbox de escritura. El adaptador tampoco aporta aislamiento de red o de sistema de archivos. Una lista de permisos en un JSON no basta para afirmar que un proceso está aislado.

Quien coordina sigue siendo responsable de preparar el alcance, revisar el diff y ejecutar la validación. Si una comprobación no corre, el resultado debe decirlo. Y si una tarea se envía a un proveedor externo, el material debe estar autorizado para ese destino.

## Qué reutilizaría primero

Empezaría por una regla que evite un fallo recurrente, un skill que resuelva una tarea habitual y un lugar donde conservar requisitos y decisiones. Después comprobaría esas piezas con trabajo real. Copiar todos mis modelos, rutas y clientes de golpe haría difícil saber qué está aportando valor.

La [guía de desarrollo](https://github.com/saski/arnesto/blob/97c4a705f807365e2cd77d4f89a3eba052fbd38e/docs/development-guide.md) y el `Makefile` permiten inspeccionar cómo se valida el repositorio. Esas comprobaciones detectan incoherencias concretas de la configuración; no demuestran que cualquier agente vaya a comportarse bien en cualquier tarea.

Eso es lo que quiero conservar de Arnesto mientras el ecosistema sigue moviéndose: decisiones que puedo explicar, límites visibles y evidencia suficiente para revisar lo que ha ocurrido. Para explorar qué pasa cuando muchas tareas llegan a la revisión humana, estoy usando [Agent Systems Lab](/notes/agent-systems-lab/).
