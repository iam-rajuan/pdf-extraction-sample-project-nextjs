import type { DocumentType } from "@/types/extraction";
import {
  extractEmails,
  extractPhones,
  extractUrls,
  normalizeText,
  splitLines
} from "@/lib/pdf/extraction-helpers";

export interface DocumentTypeClassification {
  type: DocumentType;
  confidence: number;
  scores: Record<DocumentType, number>;
  reasons: string[];
}

type DetectionContext = {
  normalizedText: string;
  lines: string[];
  topLines: string[];
  topText: string;
};

type WeightedRule = {
  weight: number;
  reason: string;
  test: (context: DetectionContext) => boolean;
};

function countMatches(text: string, patterns: RegExp[]): number {
  return patterns.reduce((total, pattern) => total + (pattern.test(text) ? 1 : 0), 0);
}

function hasManyKeyValueLines(lines: string[]): boolean {
  return lines.filter((line) => /^[A-Za-z][A-Za-z0-9 /#&()._-]{1,40}\s*[:\-]\s*.+$/.test(line)).length >= 5;
}

const rules: Record<DocumentType, WeightedRule[]> = {
  resume: [
    {
      weight: 1.9,
      reason: "Resume section headings strongly detected",
      test: ({ normalizedText }) =>
        countMatches(normalizedText, [
          /\bexperience\b/i,
          /\beducation\b/i,
          /\bskills\b/i,
          /\bprojects\b/i,
          /\bcertifications?\b/i,
          /\bemployment history\b/i
        ]) >= 4
    },
    {
      weight: 1.0,
      reason: "Top-of-document contact profile matches resume layout",
      test: ({ topText }) =>
        extractEmails(topText).length > 0 &&
        (extractPhones(topText).length > 0 || extractUrls(topText).length > 0)
    },
    {
      weight: 0.7,
      reason: "Role and chronology patterns suggest a CV",
      test: ({ normalizedText }) =>
        /\b(software engineer|product manager|data analyst|consultant|designer|intern)\b/i.test(normalizedText) &&
        /\b(20\d{2}|19\d{2})\b/.test(normalizedText)
    },
    {
      weight: -1.8,
      reason: "Billing and legal signals reduce resume confidence",
      test: ({ normalizedText }) =>
        countMatches(normalizedText, [
          /\binvoice\b/i,
          /\bamount due\b/i,
          /\bagreement\b/i,
          /\bgoverning law\b/i,
          /\brecommendations?\b/i,
          /\broadmap\b/i
        ]) >= 2
    }
  ],
  invoice: [
    {
      weight: 2.6,
      reason: "Invoice billing vocabulary detected",
      test: ({ normalizedText }) =>
        countMatches(normalizedText, [
          /\binvoice\b/i,
          /\binvoice number\b/i,
          /\bbill to\b/i,
          /\bdue date\b/i,
          /\bsubtotal\b/i,
          /\bamount due\b/i
        ]) >= 3
    },
    {
      weight: 1.4,
      reason: "Totals and tax layout support invoice classification",
      test: ({ normalizedText }) =>
        /\btotal\b/i.test(normalizedText) &&
        /\btax\b/i.test(normalizedText) &&
        /(?:USD|EUR|GBP|BDT|\$|€|£|Tk\.?)\s?\d/i.test(normalizedText)
    }
  ],
  receipt: [
    {
      weight: 2.3,
      reason: "Receipt and payment markers detected",
      test: ({ normalizedText }) =>
        countMatches(normalizedText, [
          /\breceipt\b/i,
          /\bpayment method\b/i,
          /\btransaction(?: id)?\b/i,
          /\bthank you\b/i,
          /\btotal paid\b/i,
          /\bchange\b/i
        ]) >= 2
    },
    {
      weight: 1.0,
      reason: "Itemized money rows match receipt structure",
      test: ({ lines }) =>
        lines.filter((line) => /\d/.test(line) && /(?:USD|EUR|GBP|BDT|\$|€|£|Tk\.?)/i.test(line)).length >= 2
    }
  ],
  contract: [
    {
      weight: 2.5,
      reason: "Agreement and legal section markers detected",
      test: ({ normalizedText }) =>
        countMatches(normalizedText, [
          /\bagreement\b/i,
          /\bparties\b/i,
          /\beffective date\b/i,
          /\bgoverning law\b/i,
          /\bobligations?\b/i,
          /\bterm(?: and termination)?\b/i
        ]) >= 3
    },
    {
      weight: 1.1,
      reason: "Signature language supports contract classification",
      test: ({ normalizedText }) =>
        /\bsignature\b/i.test(normalizedText) || /\bin witness whereof\b/i.test(normalizedText)
    }
  ],
  report: [
    {
      weight: 2.2,
      reason: "Analytical report headings detected",
      test: ({ normalizedText }) =>
        countMatches(normalizedText, [
          /\bexecutive summary\b/i,
          /\bintroduction\b/i,
          /\bfindings\b/i,
          /\banalysis\b/i,
          /\bconclusion\b/i
        ]) >= 3
    },
    {
      weight: 1.0,
      reason: "Recommendations and findings fit report structure",
      test: ({ normalizedText }) =>
        /\brecommendations?\b/i.test(normalizedText) && /\bfindings?\b/i.test(normalizedText)
    }
  ],
  form: [
    {
      weight: 2.1,
      reason: "Repeated field-value patterns suggest a form",
      test: ({ lines, normalizedText }) =>
        hasManyKeyValueLines(lines) ||
        countMatches(normalizedText, [
          /\bapplication form\b/i,
          /\bsubmitted by\b/i,
          /\bdate of birth\b/i,
          /\bcheckbox\b/i
        ]) >= 2
    },
    {
      weight: 0.8,
      reason: "Prompt-response formatting supports form classification",
      test: ({ lines }) => lines.filter((line) => /[:_]{2,}/.test(line)).length >= 3
    }
  ],
  strategy: [
    {
      weight: 2.4,
      reason: "Strategy planning vocabulary detected",
      test: ({ normalizedText }) =>
        countMatches(normalizedText, [
          /\bstrategy\b/i,
          /\broadmap\b/i,
          /\bobjectives?\b/i,
          /\binitiatives?\b/i,
          /\bstakeholders?\b/i,
          /\bimplementation\b/i,
          /\bmilestones?\b/i,
          /\bvision\b/i
        ]) >= 3
    },
    {
      weight: 1.1,
      reason: "Goals and execution sections fit a strategy document",
      test: ({ normalizedText }) =>
        /\bgoals?\b/i.test(normalizedText) &&
        (/\broadmap\b/i.test(normalizedText) || /\bimplementation\b/i.test(normalizedText))
    }
  ],
  proposal: [
    {
      weight: 2.4,
      reason: "Proposal and scope vocabulary detected",
      test: ({ normalizedText }) =>
        countMatches(normalizedText, [
          /\bproposal\b/i,
          /\bscope\b/i,
          /\bdeliverables?\b/i,
          /\btimeline\b/i,
          /\bbudget\b/i,
          /\bstatement of work\b/i,
          /\bpricing\b/i
        ]) >= 3
    },
    {
      weight: 1.0,
      reason: "Milestones and deliverables support proposal classification",
      test: ({ normalizedText }) =>
        /\bdeliverables?\b/i.test(normalizedText) &&
        (/\btimeline\b/i.test(normalizedText) || /\bmilestones?\b/i.test(normalizedText))
    }
  ],
  unknown: []
};

export function classifyDocumentType(text: string): DocumentTypeClassification {
  const normalizedText = normalizeText(text);
  const lines = splitLines(normalizedText);
  const context: DetectionContext = {
    normalizedText,
    lines,
    topLines: lines.slice(0, 12),
    topText: lines.slice(0, 12).join("\n")
  };

  const scores: Record<DocumentType, number> = {
    resume: 0,
    invoice: 0,
    receipt: 0,
    contract: 0,
    report: 0,
    form: 0,
    strategy: 0,
    proposal: 0,
    unknown: 0
  };

  const reasonsByType: Partial<Record<DocumentType, string[]>> = {};

  for (const [type, typeRules] of Object.entries(rules) as Array<[DocumentType, WeightedRule[]]>) {
    for (const rule of typeRules) {
      if (rule.test(context)) {
        scores[type] += rule.weight;
        reasonsByType[type] = [...(reasonsByType[type] ?? []), rule.reason];
      }
    }
  }

  const ranked = (Object.entries(scores) as Array<[DocumentType, number]>)
    .filter(([type]) => type !== "unknown")
    .sort((left, right) => right[1] - left[1]);

  const [bestType, bestScore] = ranked[0] ?? ["unknown", 0];
  const secondScore = ranked[1]?.[1] ?? 0;
  const margin = bestScore - secondScore;

  if (bestScore < 1.55 || margin < 0.35) {
    return {
      type: "unknown",
      confidence: Math.max(0.22, Math.min(0.5, bestScore / 3.5)),
      scores,
      reasons: ["No document type cleared the confidence threshold cleanly."]
    };
  }

  return {
    type: bestType,
    confidence: Math.max(0.38, Math.min(0.97, 0.45 + bestScore * 0.12 + margin * 0.05)),
    scores,
    reasons: reasonsByType[bestType] ?? []
  };
}

export function detectDocumentType(text: string): DocumentType {
  return classifyDocumentType(text).type;
}
