# Senegalese Law MCP Server

**The Journal Officiel du Sénégal alternative for the AI age.**

[![npm version](https://badge.fury.io/js/@ansvar%2Fsenegalese-law-mcp.svg)](https://www.npmjs.com/package/@ansvar/senegalese-law-mcp)
[![MCP Registry](https://img.shields.io/badge/MCP-Registry-blue)](https://registry.modelcontextprotocol.io)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![GitHub stars](https://img.shields.io/github/stars/Ansvar-Systems/Senegalese-law-mcp?style=social)](https://github.com/Ansvar-Systems/Senegalese-law-mcp)
[![CI](https://github.com/Ansvar-Systems/Senegalese-law-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Ansvar-Systems/Senegalese-law-mcp/actions/workflows/ci.yml)
[![Database](https://img.shields.io/badge/database-pre--built-green)](docs/INTERNATIONAL_INTEGRATION_GUIDE.md)
[![Provisions](https://img.shields.io/badge/provisions-4%2C946-blue)](docs/INTERNATIONAL_INTEGRATION_GUIDE.md)

Interrogez **71 lois sénégalaises** -- de la Loi n° 2008-12 sur la protection des données personnelles au Code Pénal, au Code du Travail, et plus encore -- directement depuis Claude, Cursor, ou tout client compatible MCP.

If you're building legal tech, compliance tools, or doing Senegalese legal research, this is your verified reference database.

Built by [Ansvar Systems](https://ansvar.eu) -- Stockholm, Sweden

---

## Pourquoi cet outil existe

La recherche juridique sénégalaise est dispersée entre jo.gouv.sn, servicepublic.gouv.sn, senelex.com, et les publications de la Primature. Que vous soyez :
- Un **avocat** validant des citations dans un mémoire ou un contrat
- Un **juriste d'entreprise** vérifiant la conformité aux lois sénégalaises
- Un **développeur legaltech** construisant des outils sur le droit sénégalais
- Un **chercheur** analysant la législation sénégalaise dans un cadre régional (CEDEAO, OHADA)

...vous ne devriez pas avoir besoin de dizaines d'onglets de navigateur et de recherches manuelles en PDF. Posez la question à Claude. Obtenez la disposition exacte. Avec le contexte.

Ce serveur MCP rend le droit sénégalais **consultable, référençable et lisible par l'IA**.

---

## Quick Start

### Use Remotely (No Install Needed)

> Connect directly to the hosted version -- zero dependencies, nothing to install.

**Endpoint:** `https://mcp.ansvar.eu/law-sn/mcp`

| Client | How to Connect |
|--------|---------------|
| **Claude.ai** | Settings > Connectors > Add Integration > paste URL |
| **Claude Code** | `claude mcp add senegalese-law --transport http https://mcp.ansvar.eu/law-sn/mcp` |
| **Claude Desktop** | Add to config (see below) |
| **GitHub Copilot** | Add to VS Code settings (see below) |

**Claude Desktop** -- add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "senegalese-law": {
      "type": "url",
      "url": "https://mcp.ansvar.eu/law-sn/mcp"
    }
  }
}
```

**GitHub Copilot** -- add to VS Code `settings.json`:

```json
{
  "github.copilot.chat.mcp.servers": {
    "senegalese-law": {
      "type": "http",
      "url": "https://mcp.ansvar.eu/law-sn/mcp"
    }
  }
}
```

### Use Locally (npm)

```bash
npx @ansvar/senegalese-law-mcp
```

**Claude Desktop** -- add to `claude_desktop_config.json`:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "senegalese-law": {
      "command": "npx",
      "args": ["-y", "@ansvar/senegalese-law-mcp"]
    }
  }
}
```

**Cursor / VS Code:**

```json
{
  "mcp.servers": {
    "senegalese-law": {
      "command": "npx",
      "args": ["-y", "@ansvar/senegalese-law-mcp"]
    }
  }
}
```

---

## Exemples de requêtes

Une fois connecté, posez simplement vos questions naturellement :

- *"Rechercher les dispositions sur la 'protection des données personnelles' (Loi n° 2008-12)"*
- *"Que dit le Code Pénal sénégalais sur la cybercriminalité ?"*
- *"Trouver les articles du Code du Travail sur le licenciement abusif"*
- *"La Loi n° 2008-12 est-elle toujours en vigueur ?"*
- *"Quelles obligations impose la Loi sur les contrats de partenariat ?"*
- *"Rechercher 'liberté de la presse' dans la législation sénégalaise"*
- *"Quel cadre CEDEAO s'applique à la loi sénégalaise sur le commerce électronique ?"*
- *"Valider la citation : Loi n° 2008-12, article 45"*
- *"Construire une position juridique sur les obligations de confidentialité en droit sénégalais"*

---

## What's Included

| Category | Count | Details |
|----------|-------|---------|
| **Lois** | 71 lois | Législation sénégalaise officielle |
| **Dispositions** | 4,946 sections | Recherche plein texte avec FTS5 |
| **Database Size** | ~11 MB | Optimized SQLite, portable |
| **Language** | French | Langue officielle du droit sénégalais |
| **Freshness Checks** | Automated | Drift detection against official sources |

**Verified data only** -- every citation is validated against official sources (jo.gouv.sn, primature.sn). Zero LLM-generated content.

---

## Why This Works

**Verbatim Source Text (No LLM Processing):**
- All statute text is ingested from jo.gouv.sn, servicepublic.gouv.sn, and senelex.com official sources
- Provisions are returned **unchanged** from SQLite FTS5 database rows
- Zero LLM summarization or paraphrasing -- the database contains law text, not AI interpretations

**Smart Context Management:**
- Search returns ranked provisions with BM25 scoring (safe for context)
- Provision retrieval gives exact text by law identifier + article number
- Cross-references help navigate without loading everything at once

**Technical Architecture:**
```
Journal Officiel / Primature --> Parse --> SQLite --> FTS5 snippet() --> MCP response
                                    ^                        ^
                             Provision parser         Verbatim database query
```

### Traditional Research vs. This MCP

| Approche traditionnelle | Ce serveur MCP |
|------------------------|----------------|
| Rechercher sur jo.gouv.sn par numéro de loi | Rechercher en français : *"protection données personnelles"* |
| Naviguer dans les codes manuellement | Obtenir la disposition exacte avec son contexte |
| Références croisées manuelles entre lois | `build_legal_stance` agrège depuis plusieurs sources |
| "Cette loi est-elle toujours en vigueur ?" -- vérification manuelle | Outil `check_currency` -- réponse en secondes |
| Trouver le cadre CEDEAO -- fouiller les bases de données | `get_eu_basis` -- cadres internationaux liés instantanément |
| Pas d'API, pas d'intégration | Protocole MCP -- natif IA |

**Traditionnel :** Chercher sur jo.gouv.sn --> Télécharger PDF --> Ctrl+F --> Références croisées --> Vérifier sur OHADA.com --> Recommencer

**Ce MCP :** *"Quelles sont les obligations de notification de la Loi n° 2008-12 et comment s'alignent-elles avec les cadres CEDEAO ?"* --> Terminé.

---

## Available Tools (13)

### Core Legal Research Tools (8)

| Tool | Description |
|------|-------------|
| `search_legislation` | FTS5 full-text search across 4,946 provisions with BM25 ranking. Supports French full-text queries |
| `get_provision` | Retrieve specific provision by law identifier + article number |
| `check_currency` | Check if a law is in force, amended, or repealed |
| `validate_citation` | Validate citation against database -- zero-hallucination check |
| `build_legal_stance` | Aggregate citations from multiple laws for a legal topic |
| `format_citation` | Format citations per Senegalese conventions (full/short/pinpoint) |
| `list_sources` | List all available laws with metadata, coverage scope, and data provenance |
| `about` | Server info, capabilities, dataset statistics, and coverage summary |

### International Law Integration Tools (5)

| Tool | Description |
|------|-------------|
| `get_eu_basis` | Get international frameworks (ECOWAS/CEDEAO, AU, OHADA) that a Senegalese law aligns with |
| `get_senegalese_implementations` | Find Senegalese laws implementing a specific international instrument |
| `search_eu_implementations` | Search international documents with Senegalese implementation counts |
| `get_provision_eu_basis` | Get international law references for a specific provision |
| `validate_eu_compliance` | Check alignment status of Senegalese laws against international frameworks |

---

## International Law Alignment

Le Sénégal n'est pas membre de l'UE. Le droit sénégalais s'aligne avec les cadres internationaux à travers :

- **CEDEAO/ECOWAS** -- Le Sénégal est membre fondateur; les lois sur le commerce, le numérique et le travail s'alignent avec les directives de la CEDEAO
- **OHADA** -- Le Sénégal applique le droit OHADA pour le commerce et les affaires; le droit des sociétés suit l'Acte uniforme OHADA
- **Union Africaine (UA)** -- Alignement avec la Convention de l'UA sur la cybersécurité et la protection des données personnelles (Convention de Malabo)
- **Francophonie** -- Participation aux cadres juridiques francophones partagés
- **Ordre des Avocats du Sénégal** -- La pratique juridique professionnelle est réglementée par l'Ordre des Avocats du Sénégal

The international bridge tools allow you to explore these alignment relationships -- checking which Senegalese provisions correspond to ECOWAS or OHADA requirements, and vice versa.

> **Note:** Les références internationales reflètent des relations d'alignement et d'obligation conventionnelle, pas une transposition formelle. Le Sénégal adopte sa propre approche législative.

---

## Data Sources & Freshness

All content is sourced from authoritative Senegalese legal databases:

- **[Journal Officiel du Sénégal](https://jo.gouv.sn/)** -- Official gazette, primary source for enacted legislation
- **[Primature du Sénégal](https://primature.sn/publications/lois-et-reglements)** -- Prime Minister's Office law and regulation publications
- **[Service Public du Sénégal](https://servicepublic.gouv.sn/)** -- Administrative law and regulations
- **[Senelex](https://senelex.com/)** -- Consolidated Senegalese legal database

### Data Provenance

| Field | Value |
|-------|-------|
| **Authority** | Journal Officiel du Sénégal |
| **Language** | French (official language of Senegalese law) |
| **Coverage** | 71 laws across all legislative areas |
| **Last ingested** | 2026-02-28 |

### Automated Freshness Checks

A GitHub Actions workflow monitors all data sources:

| Check | Method |
|-------|--------|
| **Law amendments** | Drift detection against known provision anchors |
| **New laws** | Comparison against official gazette index |
| **Repealed laws** | Status change detection |

**Verified data only** -- every citation is validated against official sources. Zero LLM-generated content.

---

## Security

This project uses multiple layers of automated security scanning:

| Scanner | What It Does | Schedule |
|---------|-------------|----------|
| **CodeQL** | Static analysis for security vulnerabilities | Weekly + PRs |
| **Semgrep** | SAST scanning (OWASP top 10, secrets, TypeScript) | Every push |
| **Gitleaks** | Secret detection across git history | Every push |
| **Trivy** | CVE scanning on filesystem and npm dependencies | Daily |
| **Socket.dev** | Supply chain attack detection | PRs |
| **Dependabot** | Automated dependency updates | Weekly |

See [SECURITY.md](SECURITY.md) for the full policy and vulnerability reporting.

---

## Important Disclaimers

### Legal Advice

> **THIS TOOL IS NOT LEGAL ADVICE**
>
> Statute text is sourced from the Journal Officiel du Sénégal and associated official databases. However:
> - This is a **research tool**, not a substitute for professional legal counsel
> - **Court case coverage is not included** -- do not rely solely on this for case law research
> - **Verify critical citations** against primary sources (jo.gouv.sn) for official proceedings
> - **International cross-references** reflect alignment relationships, not formal transposition
> - For professional legal advice in Senegal, consult a member of the **Ordre des Avocats du Sénégal**

**Before using professionally, read:** [DISCLAIMER.md](DISCLAIMER.md) | [SECURITY.md](SECURITY.md)

### Client Confidentiality

Queries go through the Claude API. For privileged or confidential matters, use on-premise deployment.

---

## Development

### Setup

```bash
git clone https://github.com/Ansvar-Systems/Senegalese-law-mcp
cd Senegalese-law-mcp
npm install
npm run build
npm test
```

### Running Locally

```bash
npm run dev                                       # Start MCP server
npx @anthropic/mcp-inspector node dist/index.js   # Test with MCP Inspector
```

### Data Management

```bash
npm run ingest              # Ingest laws from official sources
npm run build:db            # Rebuild SQLite database
npm run check-updates       # Check for amendments and new laws
```

### Performance

- **Search Speed:** <100ms for most FTS5 queries
- **Database Size:** ~11 MB (efficient, portable)
- **Reliability:** 100% ingestion success rate

---

## Related Projects: Complete Compliance Suite

This server is part of **Ansvar's Compliance Suite** -- MCP servers that work together for end-to-end compliance coverage:

### [@ansvar/eu-regulations-mcp](https://github.com/Ansvar-Systems/EU_compliance_MCP)
**Query 49 EU regulations directly from Claude** -- GDPR, AI Act, DORA, NIS2, MiFID II, eIDAS, and more. Full regulatory text with article-level search. `npx @ansvar/eu-regulations-mcp`

### [@ansvar/security-controls-mcp](https://github.com/Ansvar-Systems/security-controls-mcp)
**Query 261 security frameworks** -- ISO 27001, NIST CSF, SOC 2, CIS Controls, SCF, and more. `npx @ansvar/security-controls-mcp`

### [@ansvar/sanctions-mcp](https://github.com/Ansvar-Systems/Sanctions-MCP)
**Offline-capable sanctions screening** -- OFAC, EU, UN sanctions lists. `pip install ansvar-sanctions-mcp`

**70+ national law MCPs** covering Australia, Brazil, Canada, China, Denmark, Finland, France, Germany, Ghana, Iceland, India, Ireland, Israel, Italy, Japan, Kenya, Netherlands, Nigeria, Norway, Singapore, Slovenia, South Korea, Sweden, Switzerland, Thailand, UAE, UK, and more.

---

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Priority areas:
- Expanded legislation coverage (decrees, regulations, sub-decrees)
- Court case law (Cour Suprême decisions)
- Historical law versions and amendment tracking
- OHADA uniform acts integration

---

## Roadmap

- [x] Core law database with FTS5 search
- [x] Full corpus ingestion (71 laws, 4,946 provisions)
- [x] International law alignment tools (CEDEAO, OHADA, UA)
- [x] Vercel Streamable HTTP deployment
- [x] npm package publication
- [ ] Court case law expansion
- [ ] Expanded decree and regulation coverage
- [ ] Historical law versions (amendment tracking)
- [ ] OHADA uniform acts direct integration

---

## Citation

If you use this MCP server in academic research:

```bibtex
@software{senegalese_law_mcp_2026,
  author = {Ansvar Systems AB},
  title = {Senegalese Law MCP Server: AI-Powered Legal Research Tool},
  year = {2026},
  url = {https://github.com/Ansvar-Systems/Senegalese-law-mcp},
  note = {71 Senegalese laws with 4,946 provisions in French}
}
```

---

## License

Apache License 2.0. See [LICENSE](./LICENSE) for details.

### Data Licenses

- **Statutes & Legislation:** Journal Officiel du Sénégal (public domain)
- **International References:** OHADA, ECOWAS (public domain)

---

## About Ansvar Systems

We build AI-accelerated compliance and legal research tools for the global market. This MCP server started as our internal reference tool -- turns out everyone building compliance tools has the same research frustrations.

So we're open-sourcing it. Navigating 71 Senegalese laws across the Journal Officiel and OHADA databases shouldn't take hours.

**[ansvar.eu](https://ansvar.eu)** -- Stockholm, Sweden

---

<p align="center">
  <sub>Built with care in Stockholm, Sweden</sub>
</p>
