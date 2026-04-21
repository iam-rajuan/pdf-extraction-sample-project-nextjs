import { z } from "zod";

const nullableString = z.string().trim().min(1).nullable();

export const contactDetailSchema = z.object({
  name: nullableString,
  role: nullableString,
  email: nullableString,
  phone: nullableString,
  notes: nullableString
});

export const requirementDetailSchema = z.object({
  required: z.boolean(),
  details: nullableString
});

export const otherRequirementSchema = z.object({
  name: z.string().trim().min(1),
  required: z.boolean(),
  details: nullableString
});

export const sbdFormSchema = z.object({
  form: z.string().trim().min(1),
  mandatory: z.boolean().nullable(),
  details: nullableString
});

export const returnableDocumentSchema = z.object({
  name: z.string().trim().min(1),
  mandatory: z.boolean().nullable(),
  details: nullableString
});

export const tenderExtractionSchema = z.object({
  document_info: z.object({
    file_name: z.string(),
    page_count: z.number().int().nonnegative(),
    extraction_timestamp: z.string().datetime(),
    source_type: z.literal("pdf")
  }),
  tender_metadata: z.object({
    bid_number: nullableString,
    title: nullableString,
    description: nullableString,
    issuing_entity: nullableString,
    department: nullableString,
    municipality: nullableString,
    province: nullableString,
    issue_date: nullableString,
    closing_date: nullableString,
    closing_time: nullableString,
    validity_period: nullableString,
    submission_method: nullableString,
    submission_address: nullableString,
    submission_email: nullableString,
    submission_portal: nullableString,
    briefing_session: z.object({
      required: z.boolean().nullable(),
      type: nullableString,
      date: nullableString,
      time: nullableString,
      venue: nullableString,
      notes: nullableString
    })
  }),
  contact_details: z.object({
    bid_enquiries: z.array(contactDetailSchema),
    technical_enquiries: z.array(contactDetailSchema),
    other_contacts: z.array(contactDetailSchema)
  }),
  compliance_requirements: z.object({
    tax_compliance: requirementDetailSchema,
    csd_registration: requirementDetailSchema,
    bbbee: requirementDetailSchema,
    declaration_of_interest: requirementDetailSchema,
    cidb: requirementDetailSchema,
    psira: requirementDetailSchema,
    other_requirements: z.array(otherRequirementSchema)
  }),
  sbd_forms_detected: z.array(sbdFormSchema),
  returnable_documents: z.array(returnableDocumentSchema),
  technical_scope: z.object({
    summary: nullableString,
    requirements: z.array(z.string()),
    deliverables: z.array(z.string()),
    performance_expectations: z.array(z.string())
  }),
  evaluation_readiness: z.object({
    pricing_mentioned: z.boolean(),
    functionality_mentioned: z.boolean(),
    prequalification_mentioned: z.boolean(),
    preference_points_mentioned: z.boolean(),
    evaluation_summary: nullableString
  }),
  raw_supporting_sections: z.object({
    important_clauses: z.array(z.string()),
    unmapped_but_relevant_text: z.array(z.string())
  })
});

export const tenderExtractionErrorSchema = z.object({
  success: z.literal(false),
  message: z.string(),
  warnings: z.array(z.string()).default([])
});

export type ContactDetail = z.infer<typeof contactDetailSchema>;
export type RequirementDetail = z.infer<typeof requirementDetailSchema>;
export type OtherRequirement = z.infer<typeof otherRequirementSchema>;
export type SbdForm = z.infer<typeof sbdFormSchema>;
export type ReturnableDocument = z.infer<typeof returnableDocumentSchema>;
export type TenderExtraction = z.infer<typeof tenderExtractionSchema>;
export type TenderExtractionError = z.infer<typeof tenderExtractionErrorSchema>;
