import type { TenderExtraction } from "@/lib/tender/schema";

export function createEmptyTenderExtraction(input: {
  fileName: string;
  pageCount: number;
  timestamp?: string;
}): TenderExtraction {
  return {
    document_info: {
      file_name: input.fileName,
      page_count: input.pageCount,
      extraction_timestamp: input.timestamp ?? new Date().toISOString(),
      source_type: "pdf"
    },
    tender_metadata: {
      bid_number: null,
      title: null,
      description: null,
      issuing_entity: null,
      department: null,
      municipality: null,
      province: null,
      issue_date: null,
      closing_date: null,
      closing_time: null,
      validity_period: null,
      submission_method: null,
      submission_address: null,
      submission_email: null,
      submission_portal: null,
      briefing_session: {
        required: null,
        type: null,
        date: null,
        time: null,
        venue: null,
        notes: null
      }
    },
    contact_details: {
      bid_enquiries: [],
      technical_enquiries: [],
      other_contacts: []
    },
    compliance_requirements: {
      tax_compliance: {
        required: false,
        details: null
      },
      csd_registration: {
        required: false,
        details: null
      },
      bbbee: {
        required: false,
        details: null
      },
      declaration_of_interest: {
        required: false,
        details: null
      },
      cidb: {
        required: false,
        details: null
      },
      psira: {
        required: false,
        details: null
      },
      other_requirements: []
    },
    sbd_forms_detected: [],
    returnable_documents: [],
    technical_scope: {
      summary: null,
      requirements: [],
      deliverables: [],
      performance_expectations: []
    },
    evaluation_readiness: {
      pricing_mentioned: false,
      functionality_mentioned: false,
      prequalification_mentioned: false,
      preference_points_mentioned: false,
      evaluation_summary: null
    },
    raw_supporting_sections: {
      important_clauses: [],
      unmapped_but_relevant_text: []
    }
  };
}
