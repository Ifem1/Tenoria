export type ComplaintCategory =
  | "REPAIR_DELAY" | "UNSAFE_CONDITION" | "UNLAWFUL_ENTRY" | "DEPOSIT_RELATED"
  | "UTILITY_ISSUE" | "NOISE_OR_HARASSMENT" | "RENT_OR_FEE_DISPUTE"
  | "LEASE_POLICY_DISPUTE" | "RETALIATION_CONCERN" | "MAINTENANCE_QUALITY"
  | "PRIVACY_OR_ACCESS" | "OTHER";

export const COMPLAINT_CATEGORIES: ComplaintCategory[] = [
  "REPAIR_DELAY","UNSAFE_CONDITION","UNLAWFUL_ENTRY","DEPOSIT_RELATED",
  "UTILITY_ISSUE","NOISE_OR_HARASSMENT","RENT_OR_FEE_DISPUTE",
  "LEASE_POLICY_DISPUTE","RETALIATION_CONCERN","MAINTENANCE_QUALITY",
  "PRIVACY_OR_ACCESS","OTHER",
];

export type CaseStatus =
  | "OPENED" | "AWAITING_LANDLORD_RESPONSE" | "RESPONSE_SUBMITTED"
  | "NEEDS_MORE_EVIDENCE" | "READY_FOR_REVIEW" | "UNDER_REVIEW"
  | "REVIEWED" | "ACTIONABLE" | "PARTIALLY_ACTIONABLE" | "NOT_ACTIONABLE"
  | "ESCALATED" | "URGENT_ESCALATION" | "RECONSIDERATION_SUBMITTED"
  | "READY_FOR_RECONSIDERATION_REVIEW" | "RECONSIDERATION_REVIEWED"
  | "FINALIZED" | "CANCELLED";

export type VisibilityMode =
  | "PARTIES_KEEPER_ADMIN" | "PARTIES_AND_KEEPER"
  | "PRIVATE_PARTIES_ONLY" | "ESCALATED_PRIVATE";

export type Urgency = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ComplaintCase = {
  id: string;
  tenantWallet: string;
  landlordWallet: string;
  assignedKeeper?: string;
  category: ComplaintCategory;
  propertyLabel: string;
  leaseReference?: string;
  complaintNarrative: string;
  desiredRemedy: string;
  urgency: Urgency;
  visibilityMode: VisibilityMode;
  responseDeadline?: number;
  status: CaseStatus;
  createdAt: number;
  updatedAt: number;
  activeReconsiderationId?: string;
  lastReconsiderationId?: string;
};

export type LandlordResponseStatus =
  "NOT_SUBMITTED" | "SUBMITTED" | "LATE" | "INSUFFICIENT" | "UPDATED";

export type LandlordResponse = {
  id: string; caseId: string; landlordWallet: string;
  responseNarrative: string; leasePolicyPosition: string;
  repairActionHistory: string; proposedResolution: string;
  admissionOrDenialSummary?: string;
  missingInformationRequests?: string[];
  status: LandlordResponseStatus;
  createdAt: number; updatedAt: number;
};

export type EvidenceSide = "TENANT" | "LANDLORD" | "KEEPER" | "ADMIN" | "NEUTRAL";
export type EvidencePrivacy = "PUBLIC_TO_PARTIES" | "PRIVATE_HASH_ONLY" | "REDACTED" | "KEEPER_ONLY";
export type EvidenceType =
  | "PHOTO" | "VIDEO" | "MESSAGE_THREAD" | "EMAIL" | "LEASE_DOCUMENT"
  | "REPAIR_REQUEST" | "INSPECTION_NOTE" | "INVOICE" | "RECEIPT"
  | "UTILITY_RECORD" | "NOTICE_DOCUMENT" | "POLICY_DOCUMENT"
  | "WITNESS_STATEMENT" | "TIMESTAMPED_LOG" | "OTHER";

export const EVIDENCE_TYPES: EvidenceType[] = [
  "PHOTO","VIDEO","MESSAGE_THREAD","EMAIL","LEASE_DOCUMENT","REPAIR_REQUEST",
  "INSPECTION_NOTE","INVOICE","RECEIPT","UTILITY_RECORD","NOTICE_DOCUMENT",
  "POLICY_DOCUMENT","WITNESS_STATEMENT","TIMESTAMPED_LOG","OTHER",
];

export type CaseEvidence = {
  id: string; caseId: string; submittedBy: string;
  side: EvidenceSide; type: EvidenceType;
  title: string; description: string; uri: string;
  hash?: string; issuedAt?: string;
  linkedTimelineEventId?: string; privacy: EvidencePrivacy;
};

export type PolicyClauseType =
  | "REPAIRS" | "MAINTENANCE" | "HABITABILITY" | "ENTRY_NOTICE"
  | "TENANT_OBLIGATIONS" | "LANDLORD_OBLIGATIONS" | "PAYMENTS_AND_FEES"
  | "COMPLAINT_PROCEDURE" | "DEPOSIT" | "TERMINATION" | "OTHER";

export const POLICY_CLAUSE_TYPES: PolicyClauseType[] = [
  "REPAIRS","MAINTENANCE","HABITABILITY","ENTRY_NOTICE","TENANT_OBLIGATIONS",
  "LANDLORD_OBLIGATIONS","PAYMENTS_AND_FEES","COMPLAINT_PROCEDURE","DEPOSIT",
  "TERMINATION","OTHER",
];

export type PolicyNote = {
  id: string; caseId: string; clauseType: PolicyClauseType;
  clauseName: string; clauseSummary: string;
  clauseUri?: string; partyObligation: string;
  partyInterpretation: string; evidenceRef?: string;
};

export type TimelineEventType =
  | "LEASE_SIGNED" | "ISSUE_FIRST_NOTICED" | "TENANT_NOTIFIED_LANDLORD"
  | "LANDLORD_RESPONDED" | "REPAIR_SCHEDULED" | "REPAIR_COMPLETED"
  | "FOLLOW_UP_SENT" | "INSPECTION_COMPLETED" | "COMPLAINT_FILED"
  | "LANDLORD_RESPONSE_SUBMITTED" | "KEEPER_CHECKED" | "CONSENSUS_REVIEW_RUN"
  | "RULING_STORED" | "FOLLOW_UP_ADDED" | "RECONSIDERATION_REQUESTED";

export type TimelineEvent = {
  id: string; caseId: string; eventType: TimelineEventType;
  date: number; description: string; party: string; evidenceRefs?: string[];
};

export type ComplaintRuling =
  | "ACTIONABLE" | "PARTIALLY_ACTIONABLE" | "NEEDS_MORE_EVIDENCE"
  | "NOT_ACTIONABLE" | "LANDLORD_RESPONSE_REQUIRED"
  | "ESCALATE_TO_MEDIATION" | "URGENT_ESCALATION";

export type Band = "LOW" | "MEDIUM" | "HIGH";
export type CredibilityBand = "WEAK" | "MODERATE" | "STRONG";
export type RecommendedNextAction =
  | "REQUEST_LANDLORD_REPAIR_SCHEDULE" | "REQUEST_TENANT_ADDITIONAL_EVIDENCE"
  | "REQUEST_BOTH_PARTIES_EVIDENCE" | "SCHEDULE_PROPERTY_INSPECTION"
  | "ESCALATE_TO_MEDIATION" | "ESCALATE_URGENT_SAFETY_RISK"
  | "DISMISS_INSUFFICIENT_EVIDENCE" | "AWAIT_LANDLORD_RESPONSE"
  | "APPLY_RENT_ABATEMENT" | "ENFORCE_LEASE_TERM" | "NO_ACTION_REQUIRED";
export type ReasonCode =
  | "REPAIR_DELAY" | "HABITABILITY_ISSUE" | "LEASE_BACKED" | "LEASE_UNCLEAR"
  | "LANDLORD_NONRESPONSIVE" | "LANDLORD_PARTIAL_RESPONSE" | "LANDLORD_ACKNOWLEDGED_OBLIGATION"
  | "TENANT_NOTIFIED_LANDLORD" | "EVIDENCE_INSUFFICIENT" | "EVIDENCE_MODERATE" | "EVIDENCE_STRONG"
  | "TIMELINE_INCONSISTENT" | "PRIOR_REQUESTS_DOCUMENTED" | "URGENCY_SAFETY_RISK"
  | "NOTIFICATION_DISPUTE" | "CONFLICTING_PARTY_NARRATIVES" | "RETALIATION_CONCERN"
  | "DEPOSIT_DISPUTE" | "ACCESS_DISPUTE" | "OTHER";

export type ConsensusReview = {
  caseId: string;
  ruling: ComplaintRuling;
  credibility_band: CredibilityBand;
  actionability_band: Band;
  confidence_band: Band;
  risk_level: Urgency;
  urgency: Urgency;
  lease_support: "STRONG" | "PARTIAL" | "WEAK" | "NONE" | "UNCLEAR";
  evidence_strength: "STRONG" | "MODERATE" | "WEAK" | "INSUFFICIENT" | "CONFLICTING";
  landlord_response_quality: "COMPLETE" | "PARTIAL" | "WEAK" | "MISSING" | "CONTRADICTORY";
  reason_codes: ReasonCode[];
  recommended_next_action: RecommendedNextAction;
  reasoning?: string[];
  missing_records?: string[];
  required_next_steps?: string[];
  reviewedAt?: string;
  reviewFeeWei?: string;
};

export type ProtocolConfig = {
  owner: string;
  paused: boolean;
  review_fee_wei: string;
  keeper_required: boolean;
};

export type ReconsiderationReason =
  | "NEW_EVIDENCE_AVAILABLE" | "LEASE_POLICY_MISREAD"
  | "LANDLORD_RESPONSE_MISINTERPRETED" | "TENANT_NARRATIVE_MISINTERPRETED"
  | "URGENCY_MISJUDGED" | "EVIDENCE_NOT_CONSIDERED" | "OTHER";

export type Reconsideration = {
  id: string; caseId: string; requestedBy: string;
  reason: ReconsiderationReason; explanation: string;
  newEvidenceRefs?: string[]; status: "RECONSIDERATION_SUBMITTED" | "REVIEWED";
};

export type ReconsiderationReview = {
  reconsiderationId: string; caseId: string;
  reconsideration_decision:
    | "ORIGINAL_RULING_UPHELD" | "ORIGINAL_RULING_ADJUSTED"
    | "MORE_EVIDENCE_REQUIRED" | "ESCALATE_TO_HUMAN_MEDIATION"
    | "RECONSIDERATION_REJECTED";
  new_ruling: ComplaintRuling;
  new_credibility_band: CredibilityBand;
  new_actionability_band: Band;
  confidence_band: Band;
  reason_codes: ReasonCode[];
  final_recommendation: RecommendedNextAction;
};

export type Role = "tenant" | "landlord" | "keeper" | "admin" | "none";
