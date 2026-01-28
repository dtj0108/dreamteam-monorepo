#!/usr/bin/env tsx
/**
 * Agent Swarm for Workspace Production Readiness Analysis
 * 
 * This script spawns parallel subagents to analyze each workspace in the monorepo
 * and grades features based on production readiness criteria.
 */

import { spawnSubagent } from './lib/spawn-agent';
import * as fs from 'fs';
import * as path from 'path';

// Define the workspaces to analyze
const WORKSPACES = [
  // Apps
  { name: 'admin', path: 'apps/admin', type: 'app' as const },
  { name: 'user-web', path: 'apps/user-web', type: 'app' as const },
  { name: 'user-mobile', path: 'apps/user-mobile', type: 'app' as const },
  { name: 'agent-server', path: 'apps/agent-server', type: 'app' as const },
  // Packages
  { name: 'ai-utils', path: 'packages/ai-utils', type: 'package' as const },
  { name: 'auth', path: 'packages/auth', type: 'package' as const },
  { name: 'config', path: 'packages/config', type: 'package' as const },
  { name: 'database', path: 'packages/database', type: 'package' as const },
  { name: 'mcp-server', path: 'packages/mcp-server', type: 'package' as const },
  { name: 'ui', path: 'packages/ui', type: 'package' as const },
];

// Production readiness grading criteria
const GRADING_CRITERIA = `
## Production Readiness Grading Criteria (A-F)

### A - Production Ready
- Complete feature implementation
- Comprehensive test coverage (>80%)
- Full error handling
- Performance optimized
- Security hardened
- Full documentation
- Monitoring/logging in place
- CI/CD pipeline configured

### B - Near Production Ready
- Core functionality complete
- Good test coverage (>60%)
- Basic error handling
- Some optimization done
- Basic security measures
- Partial documentation
- Minor issues to address

### C - Beta Quality
- Main features implemented
- Some test coverage (>40%)
- Basic error handling
- Needs optimization
- Security review needed
- Minimal documentation
- Known issues/limitations

### D - Development Quality
- Partial implementation
- Minimal/no tests
- Incomplete error handling
- Not optimized
- Security concerns
- Little documentation
- Significant work needed

### F - Not Production Ready
- Broken/incomplete
- No tests
- Critical issues
- Security vulnerabilities
- Not functional
`;

interface FeatureGrade {
  name: string;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  score: number; // 0-100
  status: 'production-ready' | 'beta' | 'development' | 'experimental' | 'deprecated';
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

interface WorkspaceReport {
  workspace: string;
  type: 'app' | 'package';
  overallGrade: string;
  overallScore: number;
  features: FeatureGrade[];
  summary: string;
  criticalIssues: string[];
  quickWins: string[];
}

function generateAnalysisPrompt(workspace: typeof WORKSPACES[0]): string {
  return `
You are a production readiness analyzer. Analyze the workspace "${workspace.name}" at path "${workspace.path}".

## Your Task
1. Explore the workspace structure and identify all major features/modules
2. For each feature, assess production readiness based on these criteria:

${GRADING_CRITERIA}

## Analysis Requirements
For each feature, provide:
- Feature name
- Grade (A, B, C, D, or F)
- Score (0-100)
- Status (production-ready, beta, development, experimental, deprecated)
- Strengths (bullet points)
- Weaknesses (bullet points)
- Recommendations (bullet points)

## Output Format
Return a JSON object matching this TypeScript interface:

\`\`\`typescript
interface FeatureGrade {
  name: string;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  score: number;
  status: 'production-ready' | 'beta' | 'development' | 'experimental' | 'deprecated';
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

interface WorkspaceReport {
  workspace: string;
  type: '${workspace.type}';
  overallGrade: string;  // Average of all feature grades
  overallScore: number;  // Average of all feature scores
  features: FeatureGrade[];
  summary: string;       // 2-3 sentence summary
  criticalIssues: string[];  // Any blockers for production
  quickWins: string[];   // Easy improvements with high impact
}
\`\`\`

## Workspace Context
This is a ${workspace.type} in a monorepo for "DreamTeam" - an AI-powered business management platform.
${workspace.type === 'app' ? 'Apps are deployable applications.' : 'Packages are shared libraries used by apps.'}

## Key things to check:
1. Test files and coverage
2. Error handling patterns
3. TypeScript strictness
4. Documentation (README, inline comments)
5. API routes/endpoints
6. Database schema usage
7. Authentication/authorization
8. Performance optimizations
9. Security measures
10. CI/CD configuration

Return ONLY the JSON object, no markdown formatting or additional text.
`;
}

async function analyzeWorkspace(workspace: typeof WORKSPACES[0]): Promise<WorkspaceReport> {
  console.log(`🤖 Spawning agent to analyze ${workspace.name}...`);
  
  const prompt = generateAnalysisPrompt(workspace);
  const result = await spawnSubagent({
    description: `Analyze ${workspace.name}`,
    prompt,
  });
  
  try {
    // Try to parse JSON from the result
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as WorkspaceReport;
    }
    throw new Error('No JSON found in response');
  } catch (error) {
    console.error(`Failed to parse analysis for ${workspace.name}:`, error);
    // Return a fallback report
    return {
      workspace: workspace.name,
      type: workspace.type,
      overallGrade: 'N/A',
      overallScore: 0,
      features: [],
      summary: 'Analysis failed - manual review required',
      criticalIssues: ['Failed to parse agent response'],
      quickWins: [],
    };
  }
}

function generateMarkdownReport(reports: WorkspaceReport[]): string {
  const gradeToColor: Record<string, string> = {
    'A': '🟢',
    'B': '🟡',
    'C': '🟠',
    'D': '🔴',
    'F': '⚫',
  };

  const statusToEmoji: Record<string, string> = {
    'production-ready': '✅',
    'beta': '🔄',
    'development': '🚧',
    'experimental': '🧪',
    'deprecated': '⚠️',
  };

  let md = `# DreamTeam Monorepo - Production Readiness Report\n\n`;
  md += `*Generated on ${new Date().toISOString()}*\n\n`;
  
  // Executive Summary
  md += `## 📊 Executive Summary\n\n`;
  const totalFeatures = reports.reduce((sum, r) => sum + r.features.length, 0);
  const avgScore = reports.reduce((sum, r) => sum + r.overallScore, 0) / reports.length;
  const productionReady = reports.reduce((sum, r) => 
    sum + r.features.filter(f => f.status === 'production-ready').length, 0);
  
  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| Total Workspaces | ${reports.length} |\n`;
  md += `| Total Features Analyzed | ${totalFeatures} |\n`;
  md += `| Average Score | ${avgScore.toFixed(1)}/100 |\n`;
  md += `| Production Ready Features | ${productionReady}/${totalFeatures} |\n\n`;
  
  // Workspaces Overview Table
  md += `## 📋 Workspaces Overview\n\n`;
  md += `| Workspace | Type | Grade | Score | Features | Status |\n`;
  md += `|-----------|------|-------|-------|----------|--------|\n`;
  
  for (const report of reports) {
    const color = gradeToColor[report.overallGrade] || '⚪';
    md += `| ${report.workspace} | ${report.type} | ${color} ${report.overallGrade} | ${report.overallScore.toFixed(0)}% | ${report.features.length} | ${report.summary.substring(0, 40)}... |\n`;
  }
  
  md += `\n`;
  
  // Detailed Reports
  md += `## 🔍 Detailed Analysis\n\n`;
  
  for (const report of reports) {
    const color = gradeToColor[report.overallGrade] || '⚪';
    md += `### ${color} ${report.workspace} (${report.type})\n\n`;
    md += `**Overall Grade:** ${report.overallGrade} | **Score:** ${report.overallScore.toFixed(1)}/100\n\n`;
    md += `> ${report.summary}\n\n`;
    
    if (report.features.length > 0) {
      md += `#### Features Breakdown\n\n`;
      md += `| Feature | Grade | Score | Status |\n`;
      md += `|---------|-------|-------|--------|\n`;
      
      for (const feature of report.features) {
        const emoji = statusToEmoji[feature.status] || '❓';
        const fColor = gradeToColor[feature.grade] || '⚪';
        md += `| ${feature.name} | ${fColor} ${feature.grade} | ${feature.score}% | ${emoji} ${feature.status} |\n`;
      }
      md += `\n`;
      
      // Feature Details
      for (const feature of report.features) {
        md += `<details>\n`;
        md += `<summary><strong>${feature.name}</strong> - Grade: ${feature.grade}, Score: ${feature.score}%</summary>\n\n`;
        
        if (feature.strengths.length > 0) {
          md += `**✅ Strengths:**\n`;
          feature.strengths.forEach(s => md += `- ${s}\n`);
          md += `\n`;
        }
        
        if (feature.weaknesses.length > 0) {
          md += `**⚠️ Weaknesses:**\n`;
          feature.weaknesses.forEach(w => md += `- ${w}\n`);
          md += `\n`;
        }
        
        if (feature.recommendations.length > 0) {
          md += `**💡 Recommendations:**\n`;
          feature.recommendations.forEach(r => md += `- ${r}\n`);
          md += `\n`;
        }
        
        md += `</details>\n\n`;
      }
    }
    
    if (report.criticalIssues.length > 0) {
      md += `#### 🚨 Critical Issues\n`;
      report.criticalIssues.forEach(i => md += `- ${i}\n`);
      md += `\n`;
    }
    
    if (report.quickWins.length > 0) {
      md += `#### ⚡ Quick Wins\n`;
      report.quickWins.forEach(w => md += `- ${w}\n`);
      md += `\n`;
    }
    
    md += `---\n\n`;
  }
  
  // Action Items
  md += `## 🎯 Priority Action Items\n\n`;
  
  const allCriticalIssues: string[] = [];
  const allQuickWins: string[] = [];
  
  for (const report of reports) {
    report.criticalIssues.forEach(i => allCriticalIssues.push(`[${report.workspace}] ${i}`));
    report.quickWins.forEach(w => allQuickWins.push(`[${report.workspace}] ${w}`));
  }
  
  if (allCriticalIssues.length > 0) {
    md += `### Critical (Must Fix Before Production)\n`;
    allCriticalIssues.forEach((i, idx) => md += `${idx + 1}. ${i}\n`);
    md += `\n`;
  }
  
  if (allQuickWins.length > 0) {
    md += `### Quick Wins (High Impact, Low Effort)\n`;
    allQuickWins.slice(0, 10).forEach((w, idx) => md += `${idx + 1}. ${w}\n`);
    md += `\n`;
  }
  
  // Legend
  md += `## 📖 Legend\n\n`;
  md += `### Grades\n`;
  md += `- 🟢 **A**: Production Ready\n`;
  md += `- 🟡 **B**: Near Production Ready\n`;
  md += `- 🟠 **C**: Beta Quality\n`;
  md += `- 🔴 **D**: Development Quality\n`;
  md += `- ⚫ **F**: Not Production Ready\n\n`;
  
  md += `### Status\n`;
  md += `- ✅ **production-ready**: Fully ready for production\n`;
  md += `- 🔄 **beta**: In beta testing, some issues remain\n`;
  md += `- 🚧 **development**: Actively being developed\n`;
  md += `- 🧪 **experimental**: New/experimental feature\n`;
  md += `- ⚠️ **deprecated**: Scheduled for removal\n`;
  
  return md;
}

async function main() {
  console.log('🚀 Starting Agent Swarm for Workspace Analysis...\n');
  console.log(`Target: ${WORKSPACES.length} workspaces`);
  console.log(`Mode: Parallel analysis\n`);
  
  // Run all analyses in parallel
  const startTime = Date.now();
  const reports = await Promise.all(WORKSPACES.map(analyzeWorkspace));
  const duration = (Date.now() - startTime) / 1000;
  
  console.log(`\n✅ All analyses completed in ${duration.toFixed(1)}s`);
  
  // Generate and save reports
  const outputDir = path.join(process.cwd(), 'docs', 'analysis');
  fs.mkdirSync(outputDir, { recursive: true });
  
  // Save JSON report
  const jsonPath = path.join(outputDir, 'workspace-analysis.json');
  fs.writeFileSync(jsonPath, JSON.stringify(reports, null, 2));
  console.log(`📄 JSON report saved: ${jsonPath}`);
  
  // Save Markdown report
  const mdPath = path.join(outputDir, 'PRODUCTION_READINESS_REPORT.md');
  const markdown = generateMarkdownReport(reports);
  fs.writeFileSync(mdPath, markdown);
  console.log(`📄 Markdown report saved: ${mdPath}`);
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 ANALYSIS SUMMARY');
  console.log('='.repeat(60));
  
  for (const report of reports) {
    const icon = report.overallScore >= 80 ? '✅' : report.overallScore >= 60 ? '🔄' : '🚧';
    console.log(`${icon} ${report.workspace.padEnd(20)} | Grade: ${report.overallGrade} | Score: ${report.overallScore.toFixed(1)}%`);
  }
  
  console.log('='.repeat(60));
  console.log(`\n📁 Reports saved to: ${outputDir}/`);
}

main().catch(console.error);
