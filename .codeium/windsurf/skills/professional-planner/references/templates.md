# Plantillas de Salida Profesional

## 📝 Formato de PRD (Product Requirement Document)
- **Objetivo:** ¿Qué problema resolvemos?
- **User Stories:** Historias de usuario claras.
- **Criterios de Aceptación:** ¿Cómo sabemos que funciona?
- **Casos Borde:** Escenarios negativos y errores previstos.

## 🏗️ Formato de Lista de Tareas (SPEC-Compliant)
| Tarea | Descripción Técnica | Archivos Afectados | Prueba de Verificación |
| :--- | :--- | :--- | :--- |
| T1 | Definir interfaz `IUserAuth` | `src/types/auth.ts` | `npm run lint` |
| T2 | Implementar validación JWT | `src/middleware/auth.ts` | Test unitario con token expirado |

## 📐 Estándar de Tipos
- Todas las entradas y salidas deben ser interfaces TypeScript o modelos Pydantic.
- Prohibido el uso de `any` o tipos implícitos vagos.
