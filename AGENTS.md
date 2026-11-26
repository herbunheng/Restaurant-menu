# Agent Rules & Guidelines (គោលការណ៍ណែនាំសម្រាប់ Agent)

## Language Preference / ការកំណត់ភាសា
- **រាល់ការឆ្លើយតបទាំងអស់ (Every response) ត្រូវតែឆ្លើយតបជាភាសាខ្មែរ (Khmer Language) ជានិច្ច។**
- ត្រូវប្រើប្រាស់ភាសាខ្មែរដែលច្បាស់លាស់ ងាយយល់ និងមានភាពសមរម្យ។

## 1. Full-Stack Nuxt 4 Architecture Standard
- គម្រោងនេះជាស្ថាបត្យកម្ម **Full-Stack Nuxt 4 (Single Project)** ដោយគ្មានការបំបែកជា Monorepo ឡើយ។
- Frontend ស្ថិតនៅក្នុង `app/` (Pages, Components, Composables, Layouts)។
- Backend API & Server Logic ស្ថិតនៅក្នុង `server/` (API routes ក្នុង `server/api/`, Database ក្នុង `server/backend/db/`)។

## 2. Shared Types & API Schema Standard (shared/)
- រាល់ពេលបង្កើត ឬធ្វើបច្ចុប្បន្នភាព API/Data Types ត្រូវតែបង្កើត/កែប្រែ Type ទាំងនោះនៅក្នុង `shared/` (ឧទាហរណ៍ `shared/types.ts` ឬ `shared/api.ts`)។
- Frontend និង Server ត្រូវតែ Import Type យកទៅប្រើប្រាស់ចេញពី `@restaurant-menu/shared` (alias ទៅ `./shared`)។
- **ហាមដាច់ខាត:** Frontend មិនត្រូវបង្កើត ឬ Duplicate Types ថ្មីដោយខ្លួនឯងឡើយ។

## 3. Nullish Coalescing & Fallback Values Standard
- ពេលប្រើ Nullish Coalescing Operator (`??`) សម្រាប់ String ត្រូវប្រើ String ទទេ `""` ជា Default Value។
- **ហាមប្រើ String សន្មត (Hardcoded Value)** ដូចជា `"user"` ឬ Value ផ្សេងទៀត។
- ❌ **ខុស (Wrong):** `user.name ?? "user"`
- ✅ **ត្រូវ (Correct):** `user.name ?? ""`

## 4. Shared Input Validation with Zod
- ត្រូវបង្កើត Zod Schemas នៅក្នុង `shared/` ដើម្បីប្រើប្រាស់បានទាំងនៅ Server (Request body validation) និង Frontend (Form validation)។

## 5. Nuxt 4 Frontend Best Practices
- ត្រូវប្រើ `<script setup lang="ts">` និង Vue 3 Composition API ជានិច្ច។
- ពេលហៅ API តាម `useFetch` ឬ `$fetch` ត្រូវតែចង Type ដែល Import មកពី `@restaurant-menu/shared` ជានិច្ច។

## 6. Drizzle ORM & Database Migration Guidelines
- ពេលកែប្រែ Database Schema នៅ `server/backend/db/schema` ត្រូវប្តូរតាមបែបបទ Drizzle Schema និង generate migration script តាមវិធីសាស្ត្រ `pnpm db:generate`។ មិនត្រូវកែប្រែ SQL file ដោយផ្ទាល់ឡើយ។

## 7. Code Quality & Standards
- សរសេរកូដឱ្យមាន Clean Code, Type Safety ខ្ពស់ និងរចនាសម្ព័ន្ធច្បាស់លាស់។
