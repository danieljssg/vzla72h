const groqBody = (model) => (systemPrompt, userPrompt) => ({
  model,
  max_tokens: 3072,
  // temperature: 0.8,
  // top_p: 1,
  // presence_penalty: 0.7,
  // frequency_penalty: 0.4,
  response_format: { type: 'json_object' },
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ],
});

const openRouterBody = (model) => (systemPrompt, userPrompt) => ({
  model,
  temperature: 0.2,
  messages: [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `${userPrompt}\n\nIMPORTANTE: Responde ÚNICAMENTE con el JSON solicitado, sin texto adicional ni bloques de código markdown.`,
    },
  ],
});

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const OR_URL = 'https://openrouter.ai/api/v1/chat/completions';

export const buildStrategies = () => [
  {
    name: 'Groq_K1_Llama70B',
    url: GROQ_URL,
    key: process.env.GROQ_KEY,
    getBody: groqBody('llama-3.3-70b-versatile'),
  },
  {
    name: 'Groq_K2_Llama70B',
    url: GROQ_URL,
    key: process.env.GROQ_KEY2,
    getBody: groqBody('llama-3.3-70b-versatile'),
  },
  {
    name: 'Groq_K3_Llama70B',
    url: GROQ_URL,
    key: process.env.GROQ_KEY3,
    getBody: groqBody('llama-3.3-70b-versatile'),
  },

  {
    name: 'Groq_K1_Llama4Scout',
    url: GROQ_URL,
    key: process.env.GROQ_KEY,
    getBody: groqBody('meta-llama/llama-4-scout-17b-16e-instruct'),
  },
  {
    name: 'Groq_K2_Llama4Scout',
    url: GROQ_URL,
    key: process.env.GROQ_KEY2,
    getBody: groqBody('meta-llama/llama-4-scout-17b-16e-instruct'),
  },
  {
    name: 'Groq_K3_Llama4Scout',
    url: GROQ_URL,
    key: process.env.GROQ_KEY3,
    getBody: groqBody('meta-llama/llama-4-scout-17b-16e-instruct'),
  },

  {
    name: 'Groq_K1_Llama3_1_8B',
    url: GROQ_URL,
    key: process.env.GROQ_KEY,
    getBody: groqBody('llama-3.1-8b-instant'),
  },
  {
    name: 'Groq_K2_Llama3_1_8B',
    url: GROQ_URL,
    key: process.env.GROQ_KEY2,
    getBody: groqBody('llama-3.1-8b-instant'),
  },
  {
    name: 'Groq_K3_Llama3_1_8B',
    url: GROQ_URL,
    key: process.env.GROQ_KEY3,
    getBody: groqBody('llama-3.1-8b-instant'),
  },

  {
    name: 'OR_K1_Free',
    url: OR_URL,
    key: process.env.OPENROUTER_KEY,
    getBody: openRouterBody('openrouter/free'),
  },
  {
    name: 'OR_K2_Free',
    url: OR_URL,
    key: process.env.OPENROUTER_KEY2,
    getBody: openRouterBody('openrouter/free'),
  },
];
