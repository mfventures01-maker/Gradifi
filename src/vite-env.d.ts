/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_CORE_API_KEY: string;
  readonly VITE_CROSSREF_EMAIL: string;
  readonly VITE_OPENALEX_EMAIL: string;
  readonly VITE_UNPAYWALL_EMAIL: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
