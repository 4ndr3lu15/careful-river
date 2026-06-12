/**
 * Provider registry shared by the dev-only override UI (src/app/CodePanel.tsx)
 * and the server resolver (server/compose-handler.ts).
 *
 * Every preset here is an OpenAI-compatible endpoint, so a single
 * `createOpenAICompatible({ baseURL, apiKey })` adapter (Vercel AI SDK) can
 * reach all of them. This table only drives the *dev testing* path — the
 * production build ignores client-supplied keys entirely (see
 * compose-handler.ts → resolveModel()).
 */

export interface ProviderPreset {
  /** Stable id; matches DevOverride.provider. */
  id: string;
  /** Human label for the dropdown. */
  label: string;
  /** OpenAI-compatible base URL. Empty for 'custom' — the user supplies one. */
  baseURL: string;
  /** Pre-filled model id when the preset is picked. */
  defaultModel: string;
  /** Placeholder shown in the API-key field. */
  keyHint?: string;
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: 'openrouter',
    label: 'OpenRouter',
    baseURL: 'https://openrouter.ai/api/v1',
    defaultModel: 'anthropic/claude-sonnet-4.6',
    keyHint: 'sk-or-v1-…',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    baseURL: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    keyHint: 'sk-…',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
    keyHint: 'sk-…',
  },
  {
    id: 'custom',
    label: 'Custom (OpenAI-compatible)',
    baseURL: '',
    defaultModel: '',
    keyHint: 'provider key',
  },
];

export function findPreset(id: string): ProviderPreset | undefined {
  return PROVIDER_PRESETS.find((preset) => preset.id === id);
}

/**
 * A per-request, dev-only provider selection. Sent from the browser to
 * /api/compose and honored only when NODE_ENV !== 'production'.
 */
export interface DevOverride {
  /** Preset id (or 'custom'). */
  provider: string;
  apiKey: string;
  model: string;
  /** Required when provider === 'custom'; otherwise resolved from the preset. */
  baseURL?: string;
}
