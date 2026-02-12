const content = `# dreamteam.ai

> AI-powered business OS with up to 38 autonomous agents for finance, sales, team management, knowledge, and projects.

## Docs

- [Detailed AI Info](https://dreamteam.ai/ai-info.md): Full product description, features, pricing, and company details
- [About](https://dreamteam.ai/about): Company background and mission
- [Pricing](https://dreamteam.ai/pricing): Workspace plans and agent tier pricing

## Products

- [Finance](https://dreamteam.ai/finance): AI agents for bookkeeping, invoicing, expenses, reporting, and tax prep
- [Sales](https://dreamteam.ai/sales): AI agents for lead generation, outreach, CRM, follow-ups, and analytics
- [Team](https://dreamteam.ai/team): AI agents for hiring, onboarding, scheduling, HR, and performance
- [Knowledge](https://dreamteam.ai/knowledge): AI agents for documents, search, wiki, and training
- [Projects](https://dreamteam.ai/projects): AI agents for project management, tasks, status updates, and resources

## Contact

- Email: hello@dreamteam.ai
- Website: https://dreamteam.ai
`;

export function GET() {
  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
