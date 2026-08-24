# React + TypeScript + Vite

## Local environment

Copy `.env.example` to `.env`, then configure:

```dotenv
VITE_API_URL=http://localhost:8080/api
VITE_SUPABASE_URL=https://jchfppwirlvkimjrtqmk.supabase.co
VITE_SUPABASE_ANON_KEY=your_publishable_or_anon_key_here
```

Get the frontend API key from Supabase Dashboard under **Project Settings -> API Keys**. Prefer the `sb_publishable_...` key; the legacy `anon` key also works. Never put a `sb_secret_...`, `service_role`, or JWT signing secret in the frontend environment.

The real `.env` file is ignored by Git. Restart the Vite development server after changing it.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
