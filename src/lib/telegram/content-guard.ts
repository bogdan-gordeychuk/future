/**
 * Application-level content guard — runs BEFORE any AI call.
 * Detects prompt injection, jailbreak attempts, code/SQL injection,
 * and system prompt exfiltration using regex patterns.
 *
 * Intentionally conservative: only blocks patterns with near-zero
 * false-positive risk in a Russian booking-assistant context.
 */

export type GuardCategory = 'injection' | 'code_injection' | 'exfiltration'

export interface GuardResult {
  safe: boolean
  category?: GuardCategory
}

// ── Prompt injection / jailbreak ──────────────────────────────────────────────
// Patterns designed to redirect or override the AI's instructions.
const INJECTION: RegExp[] = [
  // English classic injections
  /ignore\s+(all\s+|the\s+|any\s+|previous\s+|above\s+|prior\s+|your\s+)?instructions?/i,
  /forget\s+(everything|all|your\s+instructions|previous\s+instructions)/i,
  /you\s+are\s+now\s+(a\s+|an\s+|the\s+)?/i,
  /act\s+as\s+(if\s+you\s+are|a\s+|an\s+)/i,
  /pretend\s+(you\s+are|to\s+be)\s+/i,
  /from\s+now\s+on\s+(you\s+|,)/i,
  /new\s+(system\s+|core\s+|base\s+)?prompt[\s:]/i,
  /your\s+(new\s+|updated\s+|real\s+)?instructions?\s+(are|is)[\s:]/i,
  /override\s+(your\s+|all\s+|the\s+)?(previous\s+|safety\s+|current\s+)?/i,
  /you\s+must\s+now\s+(ignore|forget|pretend|act)/i,
  /respond\s+only\s+(in|as|like)\s+/i,
  /\bjailbreak\b/i,
  /\bDAN\b/,                  // "Do Anything Now"
  /do\s+anything\s+now/i,
  /\[SYSTEM\]/i,
  /\[INST\]/,
  /###\s*(SYSTEM|INSTRUCTION|PROMPT)/i,
  /<\/?system>/i,
  /<\/?prompt>/i,
  /IGNORE\s+ABOVE/i,
  /IGNORE\s+ALL\s+PREVIOUS/i,
  /disregard\s+(all\s+|previous\s+|your\s+)?instructions?/i,

  // Russian equivalents — use .{0,25} to tolerate word order variations
  /ты\s+теперь\s+(являешься|будешь|должен|обязан)/i,
  /забудь.{0,25}(инструкции|правила|задачи|промпт)/i,
  /игнорируй.{0,25}(инструкции|правила|задачи)/i,
  /притворись\s+(что|будто)\s+ты/i,
  /с\s+этого\s+момента\s+ты/i,
  /новые\s+инструкции/i,
  /твои\s+новые\s+(инструкции|правила|задачи)/i,
]

// ── Code / SQL injection ───────────────────────────────────────────────────────
// SQL DDL/DML and system command patterns. Very low false-positive risk in Russian chat.
const CODE_INJECTION: RegExp[] = [
  /\bDROP\s+(TABLE|DATABASE|SCHEMA)\b/i,
  /\bTRUNCATE\s+TABLE\b/i,
  /\bDELETE\s+FROM\b/i,
  /\bALTER\s+TABLE\b/i,
  /\bINSERT\s+INTO\b/i,
  /\bUPDATE\s+\w+\s+SET\b/i,
  /<script[\s/>]/i,
  /javascript\s*:/i,
  /\beval\s*\(/i,
  /\bexec\s*\(\s*["'`]/i,
  /\bos\.system\s*\(/i,
  /\bsubprocess\.(run|call|Popen)\s*\(/i,
  /rm\s+-[rf]+\s+[/~]/i,
  /\bsudo\s+(rm|chmod|passwd|dd|mkfs)\b/i,
]

// ── System prompt exfiltration ────────────────────────────────────────────────
// Attempts to extract the system prompt or internal instructions.
// Uses .{0,30} to tolerate varying word order (e.g. "show me your prompt" vs "show your prompt").
const EXFILTRATION: RegExp[] = [
  // English — flexible word order
  /\b(show|reveal|print|display|tell|share|give|output|repeat)\b.{0,30}\b(system\s+prompt|your\s+prompt|initial\s+prompt|original\s+prompt|hidden\s+prompt|secret\s+prompt)/i,
  /\b(show|reveal|print|tell|share)\b.{0,30}\b(system\s+instructions?|your\s+instructions?|hidden\s+instructions?)/i,
  /what\s+(are\s+your|are\s+the|is\s+your)\s+.{0,20}(instructions?|prompt)/i,
  /repeat\s+.{0,20}\b(everything|all)\s+.{0,20}\b(told|said|given)/i,
  /copy\s+.{0,15}\b(system\s+)?prompt/i,

  // Russian — flexible word order
  /\b(покажи|напиши|раскрой|выведи|перескажи|скопируй)\b.{0,30}(промпт|инструкции|системное\s+сообщение)/i,
  /что\s+.{0,20}(тебе|вам)\s+.{0,20}(написали|сказали|передали|приказали)/i,
  /какие\s+.{0,15}(инструкции|правила|задачи|приказы)\s+.{0,15}(у\s+тебя|тебе\s+дали|тебе\s+задали)/i,
  /системный\s+промпт/i,
]

export function guardContent(text: string): GuardResult {
  for (const re of INJECTION) {
    if (re.test(text)) return { safe: false, category: 'injection' }
  }
  for (const re of CODE_INJECTION) {
    if (re.test(text)) return { safe: false, category: 'code_injection' }
  }
  for (const re of EXFILTRATION) {
    if (re.test(text)) return { safe: false, category: 'exfiltration' }
  }
  return { safe: true }
}

export function guardCategoryLabel(category: GuardCategory): string {
  switch (category) {
    case 'injection':      return 'инъекция промпта / jailbreak'
    case 'code_injection': return 'SQL / code injection'
    case 'exfiltration':   return 'попытка извлечения промпта'
  }
}
