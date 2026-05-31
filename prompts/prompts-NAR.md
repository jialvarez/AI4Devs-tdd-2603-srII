# prompt 1

Actúa como un Ingeniero Principal de QA y Arquitecto de Software experto en Node.js, Jest y refactorización de sistemas. 

Antes de escribir código de testing, necesito que realices un análisis técnico profundo de nuestro proyecto actual enfocado en dos flujos/familias principales:
1. Recepción y validación de los datos del formulario.
2. Lógica de persistencia/guardado de candidatos en la base de datos.

Por favor, examina el espacio de trabajo (analiza los archivos relevantes de rutas, controladores, servicios y modelos de candidatos) y devuélveme un informe detallado con los siguientes puntos:

1. **Dependencias y Acoplamiento:** Identifica qué librerías de base de datos (ej. Mongoose, Sequelize, pg, etc.) y frameworks (ej. Express, Fastify) se están usando en estos flujos. ¿Hay lógica de negocio mezclada con la infraestructura?
2. **Estrategia de Mocking:** ¿Qué elementos críticos necesitaremos mockear para aislar los tests unitarios? (Ej. llamadas a la base de datos, servicios externos de validación, requests/responses HTTP).
3. **Puntos Críticos y "Code Smells":** Detecta posibles problemas en el código que puedan dificultar el testeo (variables globales, falta de inyección de dependencias, funciones excesivamente largas) y cómo los abordaremos en los tests.
4. **Plan de Cobertura Inicial:** Propón una lista de los casos de prueba (de éxito y de error) mínimos que deberíamos implementar para ambas familias.

Detén tu ejecución aquí y muéstrame el análisis. No generes código de tests todavía; quiero validar tu estrategia primero.


# Orden de ejecución propuesto por la IA (Cursor en auto)

Prioridad	Qué testear	Por qué
P0 validator.ts Puro, sin mocks, alta densidad de reglas, desacoplado
P1 candidateService.ts Orquesta validación + persistencia; mock de Prisma
P2 candidateRoutes.ts Contrato HTTP real que consume el frontend
P3 fileUploadService.ts Flujo auxiliar del CV
P4 Frontend (AddCandidateForm) Validación UX y formato de payload


# prompt 2

Actúa como un experto en testing con Node.js y Jest. Con base en el análisis previo, tu misión ahora es crear la suite de tests unitarios para la funcionalidad de inserción de candidatos en la base de datos, asegurando que cubrimos tanto la recepción del formulario como la persistencia.

Por favor, genera el archivo de test en un fichero tests-NAR.test.ts en la carpeta backend/src/tests siguiendo estas directrices estrictas:

1. **Estructura Limpia:** Utiliza bloques `describe()` anidados para separar claramente las dos familias:
   - `describe('Candidate Form Reception', ...)`
   - `describe('Candidate Database Persistence', ...)`
2. **Casos Mínimos Requeridos:** Incluye, como mínimo, los siguientes casos de prueba (asegúrate de que al menos uno de cada familia sea completamente funcional):
   - **Formulario (Éxito):** Validación correcta de datos de entrada limpios.
   - **Formulario (Error):** Manejo de payloads vacíos, tipos de datos incorrectos o campos obligatorios ausentes.
   - **Persistencia (Éxito):** Inserción correcta en la base de datos devolviendo el objeto creado o ID.
   - **Persistencia (Error):** Manejo de errores de conexión o violaciones de restricciones de la base de datos (ej. email duplicado) sin tumbar el proceso.
3. **Aislamiento Total (Mocking):** Asegúrate de usar `jest.mock()` para la base de datos y los módulos de red. Limpia explícitamente los mocks antes o después de cada test usando `beforeEach` / `afterEach` con `jest.clearAllMocks()`.
4. **Estilo de Código:** Utiliza el patrón AAA (Arrange-Act-Assert). Usa aserciones semánticas de Jest (`toBe()`, `toEqual()`, `toThrow()`, `toHaveBeenCalledWith()`).

Si necesitas que cree un archivo de configuración o algún setup específico para el entorno, indícamelo antes de generar el código.
