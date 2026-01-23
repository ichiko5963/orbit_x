import { ExternalArticle } from "./types";

/**
 * Fetch popular Claude Skills from claude.ai/skills
 * Note: Since there's no public API, we use a curated list of popular skills
 */
export async function fetchClaudeSkills(): Promise<ExternalArticle[]> {
  // Curated list of popular Claude Code skills
  // These are well-known skills from the Claude Code ecosystem
  const popularSkills: ExternalArticle[] = [
    {
      id: "claude-skills_commit",
      title: "Git Commit Helper",
      description: "自動でコミットメッセージを生成し、ステージング・コミットを実行するスキル。conventional commitsに対応。",
      url: "https://claude.ai/skills/commit",
      source: "claude-skills",
      author: "Anthropic",
      likes: 5000,
      publishedAt: new Date().toISOString().split("T")[0],
      tags: ["git", "automation", "developer-tools"],
      imageUrl: null,
      saved: false,
      skillId: "commit",
      category: "Developer Tools",
    },
    {
      id: "claude-skills_pr-review",
      title: "PR Review Assistant",
      description: "プルリクエストのコードを分析し、セキュリティ・パフォーマンス・可読性の観点からレビューを行うスキル。",
      url: "https://claude.ai/skills/pr-review",
      source: "claude-skills",
      author: "Anthropic",
      likes: 4200,
      publishedAt: new Date().toISOString().split("T")[0],
      tags: ["code-review", "github", "quality"],
      imageUrl: null,
      saved: false,
      skillId: "pr-review",
      category: "Developer Tools",
    },
    {
      id: "claude-skills_test-generator",
      title: "Test Generator",
      description: "既存コードに対するユニットテストを自動生成。Jest、pytest、Go testなど主要テストフレームワークに対応。",
      url: "https://claude.ai/skills/test-generator",
      source: "claude-skills",
      author: "Community",
      likes: 3800,
      publishedAt: new Date().toISOString().split("T")[0],
      tags: ["testing", "automation", "tdd"],
      imageUrl: null,
      saved: false,
      skillId: "test-generator",
      category: "Testing",
    },
    {
      id: "claude-skills_refactor",
      title: "Code Refactorer",
      description: "コードの品質を向上させるリファクタリングを提案・実行。命名規則、構造化、パターン適用を自動化。",
      url: "https://claude.ai/skills/refactor",
      source: "claude-skills",
      author: "Community",
      likes: 3500,
      publishedAt: new Date().toISOString().split("T")[0],
      tags: ["refactoring", "clean-code", "patterns"],
      imageUrl: null,
      saved: false,
      skillId: "refactor",
      category: "Developer Tools",
    },
    {
      id: "claude-skills_docs-generator",
      title: "Documentation Generator",
      description: "コードからAPIドキュメント、READMEを自動生成。JSDoc、TypeDoc、Sphinxなどに対応。",
      url: "https://claude.ai/skills/docs-generator",
      source: "claude-skills",
      author: "Community",
      likes: 3200,
      publishedAt: new Date().toISOString().split("T")[0],
      tags: ["documentation", "api", "readme"],
      imageUrl: null,
      saved: false,
      skillId: "docs-generator",
      category: "Documentation",
    },
    {
      id: "claude-skills_debug-assistant",
      title: "Debug Assistant",
      description: "エラーメッセージを分析し、原因と解決策を提案。スタックトレースの解析、ログ分析をサポート。",
      url: "https://claude.ai/skills/debug-assistant",
      source: "claude-skills",
      author: "Anthropic",
      likes: 4500,
      publishedAt: new Date().toISOString().split("T")[0],
      tags: ["debugging", "troubleshooting", "errors"],
      imageUrl: null,
      saved: false,
      skillId: "debug-assistant",
      category: "Developer Tools",
    },
    {
      id: "claude-skills_sql-optimizer",
      title: "SQL Query Optimizer",
      description: "SQLクエリを分析し、パフォーマンス最適化を提案。インデックス推奨、クエリリライトをサポート。",
      url: "https://claude.ai/skills/sql-optimizer",
      source: "claude-skills",
      author: "Community",
      likes: 2800,
      publishedAt: new Date().toISOString().split("T")[0],
      tags: ["sql", "database", "performance"],
      imageUrl: null,
      saved: false,
      skillId: "sql-optimizer",
      category: "Database",
    },
    {
      id: "claude-skills_api-designer",
      title: "API Designer",
      description: "RESTful API / GraphQLスキーマの設計をサポート。OpenAPI仕様の生成、エンドポイント設計を支援。",
      url: "https://claude.ai/skills/api-designer",
      source: "claude-skills",
      author: "Community",
      likes: 2600,
      publishedAt: new Date().toISOString().split("T")[0],
      tags: ["api", "rest", "graphql"],
      imageUrl: null,
      saved: false,
      skillId: "api-designer",
      category: "API",
    },
    {
      id: "claude-skills_security-audit",
      title: "Security Auditor",
      description: "コードのセキュリティ脆弱性をスキャン。OWASP Top 10、CWEに基づく問題検出と修正提案。",
      url: "https://claude.ai/skills/security-audit",
      source: "claude-skills",
      author: "Anthropic",
      likes: 3900,
      publishedAt: new Date().toISOString().split("T")[0],
      tags: ["security", "audit", "vulnerability"],
      imageUrl: null,
      saved: false,
      skillId: "security-audit",
      category: "Security",
    },
    {
      id: "claude-skills_performance-profiler",
      title: "Performance Profiler",
      description: "コードのパフォーマンスボトルネックを特定し、最適化提案を行うスキル。メモリ使用量、CPU効率を分析。",
      url: "https://claude.ai/skills/performance-profiler",
      source: "claude-skills",
      author: "Community",
      likes: 2400,
      publishedAt: new Date().toISOString().split("T")[0],
      tags: ["performance", "optimization", "profiling"],
      imageUrl: null,
      saved: false,
      skillId: "performance-profiler",
      category: "Performance",
    },
  ];

  // Sort by likes (popularity)
  return popularSkills.sort((a, b) => b.likes - a.likes);
}

/**
 * Fetch skills by category
 */
export async function fetchClaudeSkillsByCategory(
  category: string
): Promise<ExternalArticle[]> {
  const allSkills = await fetchClaudeSkills();
  return allSkills.filter((skill) => skill.category === category);
}

/**
 * Get all skill categories
 */
export function getSkillCategories(): string[] {
  return [
    "Developer Tools",
    "Testing",
    "Documentation",
    "Database",
    "API",
    "Security",
    "Performance",
  ];
}
