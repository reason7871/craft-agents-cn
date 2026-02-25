/**
 * Builtin Skills Loader
 *
 * Load skills that are bundled with the application.
 * These skills have the lowest priority and can be overridden by user skills.
 */

import { readdirSync, existsSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';
import type { LoadedSkill, SkillMetadata, SkillSource } from './types.ts';
import { findIconFile } from '../utils/icon.ts';

// Cache for builtin skills directory
let _builtinSkillsDir: string | null = null;

/**
 * Normalize requiredSources frontmatter to a clean string array.
 */
function normalizeRequiredSources(value: unknown): string[] | undefined {
  const asArray = typeof value === 'string'
    ? [value]
    : Array.isArray(value)
      ? value
      : undefined;

  if (!asArray) return undefined;

  const normalized = Array.from(new Set(
    asArray
      .filter((entry): entry is string => typeof entry === 'string')
      .map(entry => entry.trim())
      .filter(Boolean)
  ));

  return normalized.length > 0 ? normalized : undefined;
}

/**
 * Parse SKILL.md content and extract frontmatter + body
 */
function parseSkillFile(content: string): { metadata: SkillMetadata; body: string } | null {
  try {
    const parsed = matter(content);

    if (!parsed.data.name || !parsed.data.description) {
      return null;
    }

    return {
      metadata: {
        name: parsed.data.name as string,
        description: parsed.data.description as string,
        globs: parsed.data.globs as string[] | undefined,
        alwaysAllow: parsed.data.alwaysAllow as string[] | undefined,
        icon: parsed.data.icon as string | undefined,
        requiredSources: normalizeRequiredSources(parsed.data.requiredSources),
      },
      body: parsed.content,
    };
  } catch {
    return null;
  }
}

/**
 * Get the builtin skills directory path.
 * Works in both ESM and bundled (CJS) contexts.
 */
function getBuiltinSkillsDir(): string {
  if (_builtinSkillsDir) {
    return _builtinSkillsDir;
  }

  // In bundled context, __dirname points to the dist directory
  // builtin folder should be at dist/skills/builtin
  // Try multiple possible locations
  const possiblePaths = [
    // Bundled Electron: dist/skills/builtin (relative to main.cjs)
    join(__dirname, 'skills', 'builtin'),
    // Bundled alternative: sibling to compiled JS
    join(__dirname, 'builtin'),
    // Development: src/skills/builtin (relative to compiled file in dist/)
    join(__dirname, '..', '..', 'src', 'skills', 'builtin'),
  ];

  for (const dir of possiblePaths) {
    if (existsSync(dir)) {
      _builtinSkillsDir = dir;
      return dir;
    }
  }

  // Fallback: return the first path even if it doesn't exist
  // This will result in empty skills list but won't crash
  _builtinSkillsDir = possiblePaths[0]!;
  return _builtinSkillsDir;
}

/**
 * Load a single builtin skill by slug.
 */
export function loadBuiltinSkill(slug: string): LoadedSkill | null {
  const builtinDir = getBuiltinSkillsDir();
  const skillDir = join(builtinDir, slug);
  const skillFile = join(skillDir, 'SKILL.md');

  if (!existsSync(skillDir) || !statSync(skillDir).isDirectory()) {
    return null;
  }

  if (!existsSync(skillFile)) {
    return null;
  }

  try {
    const content = readFileSync(skillFile, 'utf-8');
    const parsed = parseSkillFile(content);

    if (!parsed) {
      return null;
    }

    return {
      slug,
      metadata: parsed.metadata,
      content: parsed.body,
      iconPath: findIconFile(skillDir) || undefined,
      path: skillDir,
      source: 'builtin' as SkillSource,
    };
  } catch {
    return null;
  }
}

/**
 * Load all builtin skills.
 * Returns an array of LoadedSkill objects.
 */
export function loadBuiltinSkills(): LoadedSkill[] {
  const builtinDir = getBuiltinSkillsDir();

  if (!existsSync(builtinDir)) {
    return [];
  }

  const skills: LoadedSkill[] = [];

  try {
    const entries = readdirSync(builtinDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const skill = loadBuiltinSkill(entry.name);
      if (skill) {
        skills.push(skill);
      }
    }
  } catch {
    // Ignore errors reading builtin skills directory
  }

  return skills;
}

/**
 * Get list of builtin skill slugs.
 */
export function listBuiltinSkillSlugs(): string[] {
  const builtinDir = getBuiltinSkillsDir();

  if (!existsSync(builtinDir)) {
    return [];
  }

  try {
    return readdirSync(builtinDir, { withFileTypes: true })
      .filter((entry) => {
        if (!entry.isDirectory()) return false;
        const skillFile = join(builtinDir, entry.name, 'SKILL.md');
        return existsSync(skillFile);
      })
      .map((entry) => entry.name);
  } catch {
    return [];
  }
}

/**
 * Check if a skill slug is a builtin skill.
 */
export function isBuiltinSkill(slug: string): boolean {
  const builtinDir = getBuiltinSkillsDir();
  const skillFile = join(builtinDir, slug, 'SKILL.md');
  return existsSync(skillFile);
}
