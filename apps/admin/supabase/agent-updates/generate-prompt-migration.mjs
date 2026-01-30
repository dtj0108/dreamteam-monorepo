#!/usr/bin/env node
/**
 * Script to generate SQL migration for updating agent system prompts
 * with full optimized versions from the Downloads folder.
 *
 * Run with: node generate-prompt-migration.mjs > 008_optimized_prompts_update.sql
 */

import { readdir, readFile } from 'fs/promises';
import { join, basename } from 'path';

const BASE_PATH = '/Users/drewbaskin/Downloads/local_eb88467b-05f6-46ef-a7e0-ae58461cccad/outputs';

// V2 agents (no suffix, product_line='v2')
const V2_PATH = join(BASE_PATH, 'production-v2');
// V3 agents (suffix -v3, product_line='v3')
const V3_PATH = join(BASE_PATH, 'dreamteam-v3');
// V4 agents (suffix -v4, product_line='v4')
const V4_PATH = join(BASE_PATH, 'dreamteam-v4');

// V2 slug mappings: filename -> database slug
// Some V2 filenames don't match database slugs
const V2_SLUG_MAPPINGS = {
  'co-founder-agent': 'founder-agent',
  // Add other mappings here if needed
};

// Map filename to slug
function filenameToSlug(filename, version) {
  const base = filename.replace('.md', '');
  if (version === 'v2') {
    // V2 agents: Check mapping table, otherwise use base name
    // Database uses product_line column, not slug suffix
    return V2_SLUG_MAPPINGS[base] || base;
  } else if (version === 'v3') {
    // V3 agents: No suffix - database uses product_line='v3' column
    // vision-agent -> vision-agent (NOT vision-agent-v3)
    return base;
  } else {
    // V4 agents: No suffix - database uses product_line='v4' column
    // ceo-agent -> ceo-agent (NOT ceo-agent-v4)
    return base;
  }
}

// Extract system prompt from markdown file content
function extractSystemPrompt(content) {
  // Find the SYSTEM PROMPT section
  const systemPromptMatch = content.match(/## SYSTEM PROMPT\s*\n\s*```\n([\s\S]*?)```/);
  if (!systemPromptMatch) {
    return null;
  }
  return systemPromptMatch[1].trim();
}

// Escape prompt content for PostgreSQL dollar-quoting
// We use $PROMPT$ as delimiter, so we need to handle if that appears in content
function escapeForDollarQuoting(prompt) {
  // Check if $PROMPT$ appears in the prompt (very unlikely but safe)
  if (prompt.includes('$PROMPT$')) {
    // Use a different delimiter
    return { delimiter: '$SYSTEMPROMPT$', content: prompt };
  }
  return { delimiter: '$PROMPT$', content: prompt };
}

// Generate UPDATE statement for an agent
function generateUpdateStatement(slug, prompt, productLine) {
  const { delimiter, content } = escapeForDollarQuoting(prompt);
  // Use WHERE clause with both name matching and product_line for safety
  return `UPDATE ai_agents SET system_prompt = ${delimiter}
${content}
${delimiter}
WHERE slug = '${slug}' AND product_line = '${productLine}';`;
}

async function getAgentFilesFromDir(dirPath, subdirs = false) {
  const files = [];

  if (subdirs) {
    // V3 and V4 have subdirectories by department
    const entries = await readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subPath = join(dirPath, entry.name);
        const subFiles = await readdir(subPath);
        for (const file of subFiles) {
          if (file.endsWith('.md') && !file.startsWith('DEPLOYMENT') && !file.startsWith('AGENT-OVERVIEW')) {
            files.push(join(subPath, file));
          }
        }
      }
    }
  } else {
    // V2 has flat structure
    const entries = await readdir(dirPath);
    for (const file of entries) {
      if (file.endsWith('.md') && !file.startsWith('DEPLOYMENT') && !file.startsWith('AGENT-OVERVIEW')) {
        files.push(join(dirPath, file));
      }
    }
  }

  return files;
}

async function processAgents(dirPath, version, hasSubdirs) {
  const files = await getAgentFilesFromDir(dirPath, hasSubdirs);
  const results = [];

  for (const filePath of files) {
    const filename = basename(filePath);

    // Skip non-agent files
    if (!filename.endsWith('-agent.md')) {
      continue;
    }

    const content = await readFile(filePath, 'utf-8');
    const prompt = extractSystemPrompt(content);

    if (!prompt) {
      console.error(`-- WARNING: Could not extract prompt from ${filename}`);
      continue;
    }

    const slug = filenameToSlug(filename, version);
    results.push({ slug, prompt, productLine: version, filename });
  }

  return results;
}

async function main() {
  console.log(`-- ============================================================================`);
  console.log(`-- Migration: Update AI Agents with Full Optimized System Prompts`);
  console.log(`-- Generated: ${new Date().toISOString()}`);
  console.log(`-- `);
  console.log(`-- This migration updates all agents with their comprehensive system prompts`);
  console.log(`-- from the optimized prompt files. The prompts include full context about:`);
  console.log(`-- - Agent philosophy and ownership areas`);
  console.log(`-- - Communication style and collaboration patterns`);
  console.log(`-- - Memory usage guidelines`);
  console.log(`-- - (V2 only) Detailed scheduled task prompts`);
  console.log(`-- ============================================================================`);
  console.log();

  // Process V2 agents
  console.log(`-- ============================================================================`);
  console.log(`-- V2 AGENTS (Production - Starter Tier)`);
  console.log(`-- ============================================================================`);
  console.log();

  const v2Agents = await processAgents(V2_PATH, 'v2', false);
  console.log(`-- Processing ${v2Agents.length} V2 agents...`);
  console.log();

  for (const agent of v2Agents) {
    console.log(`-- ${agent.filename} -> ${agent.slug}`);
    console.log(generateUpdateStatement(agent.slug, agent.prompt, agent.productLine));
    console.log();
  }

  // Process V3 agents
  console.log(`-- ============================================================================`);
  console.log(`-- V3 AGENTS (Teams Tier)`);
  console.log(`-- ============================================================================`);
  console.log();

  const v3Agents = await processAgents(V3_PATH, 'v3', true);
  console.log(`-- Processing ${v3Agents.length} V3 agents...`);
  console.log();

  for (const agent of v3Agents) {
    console.log(`-- ${agent.filename} -> ${agent.slug}`);
    console.log(generateUpdateStatement(agent.slug, agent.prompt, agent.productLine));
    console.log();
  }

  // Process V4 agents
  console.log(`-- ============================================================================`);
  console.log(`-- V4 AGENTS (Enterprise Tier)`);
  console.log(`-- ============================================================================`);
  console.log();

  const v4Agents = await processAgents(V4_PATH, 'v4', true);
  console.log(`-- Processing ${v4Agents.length} V4 agents...`);
  console.log();

  for (const agent of v4Agents) {
    console.log(`-- ${agent.filename} -> ${agent.slug}`);
    console.log(generateUpdateStatement(agent.slug, agent.prompt, agent.productLine));
    console.log();
  }

  // Fix naming mismatch: exit-m&a-agent should be exit-ma-agent (URL-safe)
  console.log(`-- ============================================================================`);
  console.log(`-- SLUG FIXES`);
  console.log(`-- ============================================================================`);
  console.log();
  console.log(`-- Fix: exit-m&a-agent -> exit-ma-agent (URL-safe slug)`);
  console.log(`UPDATE ai_agents SET slug = 'exit-ma-agent' WHERE slug = 'exit-m&a-agent' AND product_line = 'v4';`);
  console.log();

  // Summary
  console.log(`-- ============================================================================`);
  console.log(`-- SUMMARY`);
  console.log(`-- ============================================================================`);
  console.log(`-- V2 agents updated: ${v2Agents.length}`);
  console.log(`-- V3 agents updated: ${v3Agents.length}`);
  console.log(`-- V4 agents updated: ${v4Agents.length}`);
  console.log(`-- Total: ${v2Agents.length + v3Agents.length + v4Agents.length}`);
  console.log(`-- ============================================================================`);
}

main().catch(console.error);
