# Tenoria — GenLayer Tenant Complaint Arbitrator Contract
# Source of truth for cases, responses, evidence, lease policy notes,
# timelines, keeper assignments, consensus reviews, and reconsiderations.

from genlayer import *
import json

# Explicit import — `from genlayer import *` doesn't always re-export VmUserError
# (varies by SDK version). Without this, raising VmUserError inside an except
# clause crashes with NameError and the real error is masked.
try:
    from genlayer.errors import VmUserError  # newer SDKs
except Exception:
    try:
        from genlayer.vm import UserError as VmUserError  # older SDKs
    except Exception:
        try:
            from genlayer import VmUserError  # some builds expose it at top level
        except Exception:
            class VmUserError(Exception):  # last-resort fallback
                pass


def _safe_json_load(raw):
    """Parse JSON from an LLM-produced string, tolerating common envelope quirks
    (leading/trailing whitespace, ```json ... ``` fences, stray text before/after
    the object). Raises ValueError if no JSON object can be extracted."""
    if raw is None:
        raise ValueError("empty output")
    s = str(raw).strip()
    if not s:
        raise ValueError("empty output")
    if s.startswith("```"):
        # strip opening fence (```json or ```)
        nl = s.find("\n")
        if nl != -1:
            s = s[nl + 1:]
        if s.endswith("```"):
            s = s[:-3]
        s = s.strip()
    try:
        return json.loads(s)
    except Exception:
        # fall through to bracket-scan
        pass
    start = s.find("{")
    end = s.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("no JSON object found")
    return json.loads(s[start:end + 1])


ALLOWED_RULINGS = {
    "ACTIONABLE",
    "PARTIALLY_ACTIONABLE",
    "NEEDS_MORE_EVIDENCE",
    "NOT_ACTIONABLE",
    "LANDLORD_RESPONSE_REQUIRED",
    "ESCALATE_TO_MEDIATION",
    "URGENT_ESCALATION",
}
ALLOWED_URGENCY = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}
ALLOWED_LEASE = {"STRONG", "PARTIAL", "WEAK", "NONE", "UNCLEAR"}
ALLOWED_EVIDENCE = {"STRONG", "MODERATE", "WEAK", "INSUFFICIENT", "CONFLICTING"}
ALLOWED_LL_QUALITY = {"COMPLETE", "PARTIAL", "WEAK", "MISSING", "CONTRADICTORY"}
ALLOWED_RECONSIDERATION = {
    "ORIGINAL_RULING_UPHELD",
    "ORIGINAL_RULING_ADJUSTED",
    "MORE_EVIDENCE_REQUIRED",
    "ESCALATE_TO_HUMAN_MEDIATION",
    "RECONSIDERATION_REJECTED",
}

# Compact bounded-JSON enums for nondeterministic consensus output.
# No exact integer scores, no free-text prose, no open-ended arrays —
# everything is a small categorical so validators agree on validity,
# not on wording.
ALLOWED_BAND = {"LOW", "MEDIUM", "HIGH"}
ALLOWED_CREDIBILITY_BAND = {"WEAK", "MODERATE", "STRONG"}
ALLOWED_RISK = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}
ALLOWED_NEXT_ACTION = {
    "REQUEST_LANDLORD_REPAIR_SCHEDULE",
    "REQUEST_TENANT_ADDITIONAL_EVIDENCE",
    "REQUEST_BOTH_PARTIES_EVIDENCE",
    "SCHEDULE_PROPERTY_INSPECTION",
    "ESCALATE_TO_MEDIATION",
    "ESCALATE_URGENT_SAFETY_RISK",
    "DISMISS_INSUFFICIENT_EVIDENCE",
    "AWAIT_LANDLORD_RESPONSE",
    "APPLY_RENT_ABATEMENT",
    "ENFORCE_LEASE_TERM",
    "NO_ACTION_REQUIRED",
}
ALLOWED_REASON_CODES = {
    "REPAIR_DELAY",
    "HABITABILITY_ISSUE",
    "LEASE_BACKED",
    "LEASE_UNCLEAR",
    "LANDLORD_NONRESPONSIVE",
    "LANDLORD_PARTIAL_RESPONSE",
    "LANDLORD_ACKNOWLEDGED_OBLIGATION",
    "TENANT_NOTIFIED_LANDLORD",
    "EVIDENCE_INSUFFICIENT",
    "EVIDENCE_MODERATE",
    "EVIDENCE_STRONG",
    "TIMELINE_INCONSISTENT",
    "PRIOR_REQUESTS_DOCUMENTED",
    "URGENCY_SAFETY_RISK",
    "NOTIFICATION_DISPUTE",
    "CONFLICTING_PARTY_NARRATIVES",
    "RETALIATION_CONCERN",
    "DEPOSIT_DISPUTE",
    "ACCESS_DISPUTE",
    "OTHER",
}
ALLOWED_APPLICABILITY = {"STRONG", "PARTIAL", "WEAK", "NONE"}
ALLOWED_CONFLICT_SEVERITY = {"NONE", "LOW", "MEDIUM", "HIGH"}


def _k(addr) -> str:
    """Canonical lowercase hex key for any Address-ish value.
    str(Address) is stable across SDK versions where .as_hex isn't, and
    lower() removes checksum-case drift between store and lookup."""
    return str(addr).lower()


class Tenoria(gl.Contract):
    owner: Address
    paused: bool
    case_count: u256
    evidence_count: u256
    review_count: u256
    reconsideration_count: u256

    cases: TreeMap[str, str]
    landlord_responses: TreeMap[str, str]
    case_evidence: TreeMap[str, str]
    lease_policy_notes: TreeMap[str, str]
    case_timelines: TreeMap[str, str]
    consensus_reviews: TreeMap[str, str]
    reconsiderations: TreeMap[str, str]
    reconsideration_reviews: TreeMap[str, str]
    keepers: TreeMap[str, str]
    case_assignments: TreeMap[str, str]
    user_cases: TreeMap[str, str]
    protocol_stats: TreeMap[str, str]

    def __init__(self):
        self.owner = gl.message.sender_address
        self.paused = False
        self.case_count = u256(0)
        self.evidence_count = u256(0)
        self.review_count = u256(0)
        self.reconsideration_count = u256(0)
        self.keepers[_k(self.owner)] = "OWNER"
        self.protocol_stats["created_at"] = str(gl.message.timestamp if hasattr(gl.message, "timestamp") else 0)

    # ---------- helpers ----------
    def _require_not_paused(self):
        if self.paused:
            raise VmUserError("Protocol is paused")

    def _require_owner(self):
        if _k(gl.message.sender_address) != _k(self.owner):
            raise VmUserError("Only owner")

    def _is_keeper(self, addr) -> bool:
        return self.keepers.get(_k(addr)) is not None

    def _require_keeper(self):
        if not self._is_keeper(gl.message.sender_address):
            raise VmUserError("Only keeper or admin")

    def _get_case(self, case_id: str) -> dict:
        raw = self.cases.get(case_id)
        if raw is None:
            raise VmUserError("Case not found")
        return json.loads(raw)

    def _save_case(self, case_id: str, c: dict):
        self.cases[case_id] = json.dumps(c)

    def _append_user_case(self, user_hex: str, case_id: str):
        existing = self.user_cases.get(user_hex)
        arr = json.loads(existing) if existing else []
        if case_id not in arr:
            arr.append(case_id)
        self.user_cases[user_hex] = json.dumps(arr)

    def _append_evidence_index(self, case_id: str, evidence_id: str):
        key = "list:" + case_id
        existing = self.case_evidence.get(key)
        arr = json.loads(existing) if existing else []
        arr.append(evidence_id)
        self.case_evidence[key] = json.dumps(arr)

    def _append_policy_index(self, case_id: str, note_id: str):
        key = "list:" + case_id
        existing = self.lease_policy_notes.get(key)
        arr = json.loads(existing) if existing else []
        arr.append(note_id)
        self.lease_policy_notes[key] = json.dumps(arr)

    # ---------- deterministic write ----------
    @gl.public.write
    def open_case(self, case_id: str, case_json: str) -> None:
        self._require_not_paused()
        if case_id in self.cases:
            raise VmUserError("Case already exists")
        try:
            data = json.loads(case_json)
        except Exception:
            raise VmUserError("Invalid case JSON")
        sender_hex = _k(gl.message.sender_address)
        data["id"] = case_id
        data["tenantWallet"] = sender_hex
        data["status"] = "AWAITING_LANDLORD_RESPONSE"
        if "landlordWallet" not in data or not data["landlordWallet"]:
            raise VmUserError("landlordWallet required")
        if "complaintNarrative" not in data or not data["complaintNarrative"]:
            raise VmUserError("complaintNarrative required")
        self._save_case(case_id, data)
        self.case_count = u256(int(self.case_count) + 1)
        self._append_user_case(sender_hex, case_id)
        self._append_user_case(str(data["landlordWallet"]).lower(), case_id)

    @gl.public.write
    def submit_landlord_response(self, case_id: str, response_json: str) -> None:
        self._require_not_paused()
        c = self._get_case(case_id)
        sender_hex = _k(gl.message.sender_address)
        if sender_hex.lower() != str(c.get("landlordWallet", "")).lower():
            raise VmUserError("Only named landlord may respond")
        try:
            resp = json.loads(response_json)
        except Exception:
            raise VmUserError("Invalid response JSON")
        resp["caseId"] = case_id
        resp["landlordWallet"] = sender_hex
        resp["status"] = "SUBMITTED"
        self.landlord_responses[case_id] = json.dumps(resp)
        c["status"] = "READY_FOR_KEEPER_CHECK"
        self._save_case(case_id, c)

    @gl.public.write
    def add_evidence(self, evidence_id: str, case_id: str, evidence_json: str) -> None:
        self._require_not_paused()
        c = self._get_case(case_id)
        sender_hex = _k(gl.message.sender_address)
        allowed = {
            str(c.get("tenantWallet", "")).lower(),
            str(c.get("landlordWallet", "")).lower(),
            str(c.get("assignedKeeper", "")).lower(),
        }
        if sender_hex not in allowed and not self._is_keeper(gl.message.sender_address) and _k(gl.message.sender_address) != _k(self.owner):
            raise VmUserError("Not authorised to add evidence")
        try:
            ev = json.loads(evidence_json)
        except Exception:
            raise VmUserError("Invalid evidence JSON")
        ev["id"] = evidence_id
        ev["caseId"] = case_id
        ev["submittedBy"] = sender_hex
        self.case_evidence[evidence_id] = json.dumps(ev)
        self._append_evidence_index(case_id, evidence_id)
        self.evidence_count = u256(int(self.evidence_count) + 1)

    @gl.public.write
    def add_policy_note(self, note_id: str, case_id: str, policy_json: str) -> None:
        self._require_not_paused()
        self._get_case(case_id)
        try:
            note = json.loads(policy_json)
        except Exception:
            raise VmUserError("Invalid policy JSON")
        note["id"] = note_id
        note["caseId"] = case_id
        self.lease_policy_notes[note_id] = json.dumps(note)
        self._append_policy_index(case_id, note_id)

    @gl.public.write
    def set_case_timeline(self, case_id: str, timeline_json: str) -> None:
        self._require_not_paused()
        self._get_case(case_id)
        try:
            json.loads(timeline_json)
        except Exception:
            raise VmUserError("Invalid timeline JSON")
        self.case_timelines[case_id] = timeline_json

    @gl.public.write
    def assign_keeper(self, case_id: str, keeper: Address) -> None:
        self._require_owner_or_admin()
        c = self._get_case(case_id)
        if not self._is_keeper(keeper):
            raise VmUserError("Address is not a keeper")
        c["assignedKeeper"] = _k(keeper)
        self._save_case(case_id, c)
        self.case_assignments[case_id] = _k(keeper)

    def _require_owner_or_admin(self):
        if _k(gl.message.sender_address) != _k(self.owner):
            raise VmUserError("Only owner/admin")

    @gl.public.write
    def mark_ready_for_review(self, case_id: str) -> None:
        self._require_not_paused()
        self._require_keeper()
        c = self._get_case(case_id)
        c["status"] = "READY_FOR_KEEPER_CHECK"
        self._save_case(case_id, c)

    @gl.public.write
    def request_more_information(self, case_id: str, request_json: str) -> None:
        self._require_not_paused()
        self._require_keeper()
        c = self._get_case(case_id)
        c["moreInfoRequest"] = request_json
        c["status"] = "NEEDS_MORE_EVIDENCE"
        self._save_case(case_id, c)

    @gl.public.write
    def open_reconsideration(self, reconsideration_id: str, case_id: str, reconsideration_json: str) -> None:
        self._require_not_paused()
        c = self._get_case(case_id)
        sender_hex = _k(gl.message.sender_address)
        if sender_hex.lower() not in (str(c.get("tenantWallet", "")).lower(), str(c.get("landlordWallet", "")).lower()):
            raise VmUserError("Only parties may request reconsideration")
        try:
            r = json.loads(reconsideration_json)
        except Exception:
            raise VmUserError("Invalid reconsideration JSON")
        r["id"] = reconsideration_id
        r["caseId"] = case_id
        r["requestedBy"] = sender_hex
        r["status"] = "RECONSIDERATION_SUBMITTED"
        self.reconsiderations[reconsideration_id] = json.dumps(r)
        self.reconsideration_count = u256(int(self.reconsideration_count) + 1)

    @gl.public.write
    def finalize_case(self, case_id: str) -> None:
        self._require_keeper()
        c = self._get_case(case_id)
        c["status"] = "FINALIZED"
        self._save_case(case_id, c)

    @gl.public.write
    def add_keeper(self, keeper: Address) -> None:
        self._require_owner_or_admin()
        self.keepers[_k(keeper)] = "KEEPER"

    @gl.public.write
    def remove_keeper(self, keeper: Address) -> None:
        self._require_owner_or_admin()
        key = _k(keeper)
        if self.keepers.get(key) is not None:
            del self.keepers[key]

    @gl.public.write
    def pause_protocol(self) -> None:
        self._require_owner_or_admin()
        self.paused = True

    @gl.public.write
    def unpause_protocol(self) -> None:
        self._require_owner_or_admin()
        self.paused = False

    # ---------- non-deterministic GenLayer review ----------
    # Compact bounded-JSON output: every field is a small categorical enum or
    # a bounded array of enums. No free-text prose, no exact scores. Validators
    # agree on enum *validity*, not on wording, so prompt_non_comparative
    # converges quickly.
    def _build_review_prompt(self, c: dict, resp: dict | None, evidence_arr: list, policy_arr: list, timeline: str) -> str:
        return f"""You are reviewing a tenant complaint case for housing mediation support.

Do not assume either party is truthful without evidence.
Do not invent missing facts.
Do not make legal claims or court orders.
Distinguish between weak evidence and bad faith.
If landlord response is missing, treat landlord_response_quality as MISSING.
If urgent safety risk appears, escalate.

CASE:
{json.dumps(c)}

LANDLORD_RESPONSE:
{json.dumps(resp) if resp else "MISSING"}

EVIDENCE:
{json.dumps(evidence_arr)}

LEASE_POLICY_NOTES:
{json.dumps(policy_arr)}

TIMELINE:
{timeline or "[]"}

Return STRICT JSON ONLY with EXACTLY these keys and values from these enums.
DO NOT include any other keys. DO NOT include any free-text prose, summaries,
or explanations. DO NOT include exact numeric scores. EVERY field is an enum.

{{
  "ruling": one of [ACTIONABLE, PARTIALLY_ACTIONABLE, NEEDS_MORE_EVIDENCE,
            NOT_ACTIONABLE, LANDLORD_RESPONSE_REQUIRED, ESCALATE_TO_MEDIATION,
            URGENT_ESCALATION],
  "credibility_band": one of [WEAK, MODERATE, STRONG],
  "actionability_band": one of [LOW, MEDIUM, HIGH],
  "confidence_band": one of [LOW, MEDIUM, HIGH],
  "risk_level": one of [LOW, MEDIUM, HIGH, CRITICAL],
  "urgency": one of [LOW, MEDIUM, HIGH, CRITICAL],
  "lease_support": one of [STRONG, PARTIAL, WEAK, NONE, UNCLEAR],
  "evidence_strength": one of [STRONG, MODERATE, WEAK, INSUFFICIENT, CONFLICTING],
  "landlord_response_quality": one of [COMPLETE, PARTIAL, WEAK, MISSING, CONTRADICTORY],
  "reason_codes": array of 1-5 codes from [REPAIR_DELAY, HABITABILITY_ISSUE,
            LEASE_BACKED, LEASE_UNCLEAR, LANDLORD_NONRESPONSIVE,
            LANDLORD_PARTIAL_RESPONSE, LANDLORD_ACKNOWLEDGED_OBLIGATION,
            TENANT_NOTIFIED_LANDLORD, EVIDENCE_INSUFFICIENT, EVIDENCE_MODERATE,
            EVIDENCE_STRONG, TIMELINE_INCONSISTENT, PRIOR_REQUESTS_DOCUMENTED,
            URGENCY_SAFETY_RISK, NOTIFICATION_DISPUTE,
            CONFLICTING_PARTY_NARRATIVES, RETALIATION_CONCERN, DEPOSIT_DISPUTE,
            ACCESS_DISPUTE, OTHER],
  "recommended_next_action": one of [REQUEST_LANDLORD_REPAIR_SCHEDULE,
            REQUEST_TENANT_ADDITIONAL_EVIDENCE, REQUEST_BOTH_PARTIES_EVIDENCE,
            SCHEDULE_PROPERTY_INSPECTION, ESCALATE_TO_MEDIATION,
            ESCALATE_URGENT_SAFETY_RISK, DISMISS_INSUFFICIENT_EVIDENCE,
            AWAIT_LANDLORD_RESPONSE, APPLY_RENT_ABATEMENT, ENFORCE_LEASE_TERM,
            NO_ACTION_REQUIRED]
}}

Output the JSON object and NOTHING ELSE. No markdown fences. No commentary.
"""

    def _validate_review(self, result: dict):
        required = ["ruling", "credibility_band", "actionability_band",
                    "confidence_band", "risk_level", "urgency", "lease_support",
                    "evidence_strength", "landlord_response_quality",
                    "reason_codes", "recommended_next_action"]
        for k in required:
            if k not in result:
                raise VmUserError(f"Missing field: {k}")
        if result["ruling"] not in ALLOWED_RULINGS: raise VmUserError("Invalid ruling")
        if result["credibility_band"] not in ALLOWED_CREDIBILITY_BAND: raise VmUserError("Invalid credibility_band")
        if result["actionability_band"] not in ALLOWED_BAND: raise VmUserError("Invalid actionability_band")
        if result["confidence_band"] not in ALLOWED_BAND: raise VmUserError("Invalid confidence_band")
        if result["risk_level"] not in ALLOWED_RISK: raise VmUserError("Invalid risk_level")
        if result["urgency"] not in ALLOWED_URGENCY: raise VmUserError("Invalid urgency")
        if result["lease_support"] not in ALLOWED_LEASE: raise VmUserError("Invalid lease_support")
        if result["evidence_strength"] not in ALLOWED_EVIDENCE: raise VmUserError("Invalid evidence_strength")
        if result["landlord_response_quality"] not in ALLOWED_LL_QUALITY: raise VmUserError("Invalid landlord_response_quality")
        if result["recommended_next_action"] not in ALLOWED_NEXT_ACTION: raise VmUserError("Invalid recommended_next_action")
        rc = result["reason_codes"]
        if not isinstance(rc, list) or len(rc) < 1 or len(rc) > 5:
            raise VmUserError("reason_codes must be array of 1..5")
        for code in rc:
            if code not in ALLOWED_REASON_CODES:
                raise VmUserError(f"Invalid reason_code: {code}")

    @gl.public.write
    def review_complaint(self, case_id: str) -> None:
        self._require_not_paused()
        self._require_keeper()
        c = self._get_case(case_id)
        if c.get("status") == "UNDER_CONSENSUS_REVIEW":
            raise VmUserError("Already under review")

        resp_raw = self.landlord_responses.get(case_id)
        resp = json.loads(resp_raw) if resp_raw else None

        ev_index = self.case_evidence.get("list:" + case_id)
        ev_ids = json.loads(ev_index) if ev_index else []
        evidence_arr = []
        for eid in ev_ids:
            raw = self.case_evidence.get(eid)
            if raw:
                evidence_arr.append(json.loads(raw))

        pn_index = self.lease_policy_notes.get("list:" + case_id)
        pn_ids = json.loads(pn_index) if pn_index else []
        policy_arr = []
        for pid in pn_ids:
            raw = self.lease_policy_notes.get(pid)
            if raw:
                policy_arr.append(json.loads(raw))

        timeline = self.case_timelines.get(case_id) or "[]"

        c["status"] = "UNDER_CONSENSUS_REVIEW"
        self._save_case(case_id, c)

        prompt = self._build_review_prompt(c, resp, evidence_arr, policy_arr, timeline)

        def _run() -> str:
            return gl.nondet.exec_prompt(prompt)

        raw_output = gl.eq_principle.prompt_non_comparative(
            _run,
            task=(
                "Review the tenant complaint case using the provided narrative, "
                "landlord response, lease policy notes, evidence, and timeline. "
                "Output a COMPACT BOUNDED enum-only JSON judgement. No prose. "
                "No exact numbers. Every field is a categorical enum."
            ),
            criteria=(
                "ACCEPTABILITY CHECK for a candidate output O. Accept O as VALID "
                "(return true) only if ALL of the following hold; otherwise reject:\n"
                "1. O parses as a single JSON object. No markdown fences, no prose "
                "outside the object.\n"
                "2. O contains EXACTLY these keys: ruling, credibility_band, "
                "actionability_band, confidence_band, risk_level, urgency, "
                "lease_support, evidence_strength, landlord_response_quality, "
                "reason_codes, recommended_next_action. No additional keys.\n"
                "3. O.ruling is one of: ACTIONABLE, PARTIALLY_ACTIONABLE, "
                "NEEDS_MORE_EVIDENCE, NOT_ACTIONABLE, LANDLORD_RESPONSE_REQUIRED, "
                "ESCALATE_TO_MEDIATION, URGENT_ESCALATION.\n"
                "4. O.credibility_band is one of: WEAK, MODERATE, STRONG.\n"
                "5. O.actionability_band, O.confidence_band each one of: LOW, MEDIUM, HIGH.\n"
                "6. O.risk_level, O.urgency each one of: LOW, MEDIUM, HIGH, CRITICAL.\n"
                "7. O.lease_support one of: STRONG, PARTIAL, WEAK, NONE, UNCLEAR.\n"
                "8. O.evidence_strength one of: STRONG, MODERATE, WEAK, INSUFFICIENT, CONFLICTING.\n"
                "9. O.landlord_response_quality one of: COMPLETE, PARTIAL, WEAK, MISSING, CONTRADICTORY.\n"
                "10. O.reason_codes is a JSON array of 1 to 5 entries; each entry is "
                "one of: REPAIR_DELAY, HABITABILITY_ISSUE, LEASE_BACKED, LEASE_UNCLEAR, "
                "LANDLORD_NONRESPONSIVE, LANDLORD_PARTIAL_RESPONSE, "
                "LANDLORD_ACKNOWLEDGED_OBLIGATION, TENANT_NOTIFIED_LANDLORD, "
                "EVIDENCE_INSUFFICIENT, EVIDENCE_MODERATE, EVIDENCE_STRONG, "
                "TIMELINE_INCONSISTENT, PRIOR_REQUESTS_DOCUMENTED, "
                "URGENCY_SAFETY_RISK, NOTIFICATION_DISPUTE, "
                "CONFLICTING_PARTY_NARRATIVES, RETALIATION_CONCERN, "
                "DEPOSIT_DISPUTE, ACCESS_DISPUTE, OTHER.\n"
                "11. O.recommended_next_action is one of: "
                "REQUEST_LANDLORD_REPAIR_SCHEDULE, REQUEST_TENANT_ADDITIONAL_EVIDENCE, "
                "REQUEST_BOTH_PARTIES_EVIDENCE, SCHEDULE_PROPERTY_INSPECTION, "
                "ESCALATE_TO_MEDIATION, ESCALATE_URGENT_SAFETY_RISK, "
                "DISMISS_INSUFFICIENT_EVIDENCE, AWAIT_LANDLORD_RESPONSE, "
                "APPLY_RENT_ABATEMENT, ENFORCE_LEASE_TERM, NO_ACTION_REQUIRED.\n"
                "12. O is not self-contradictory: e.g. ruling=URGENT_ESCALATION "
                "should not pair with risk_level=LOW; landlord_response_quality=MISSING "
                "should not pair with ruling=ACTIONABLE on landlord-action grounds alone.\n"
                "13. O is supported by the input facts (the case, landlord response, "
                "evidence, lease notes, and timeline) — not invented.\n"
                "ACCEPT validity. Do NOT require any specific enum value. Two valid "
                "judgements that differ in enum choice are BOTH acceptable as long as "
                "each individually satisfies rules 1-13."
            ),
        )

        try:
            result = _safe_json_load(raw_output)
        except Exception as e:
            raise VmUserError("Reviewer returned invalid JSON: " + str(e)[:120])

        self._validate_review(result)

        result["caseId"] = case_id
        self.consensus_reviews[case_id] = json.dumps(result)
        self.review_count = u256(int(self.review_count) + 1)

        ruling = result["ruling"]
        next_status_map = {
            "ACTIONABLE": "ACTIONABLE",
            "PARTIALLY_ACTIONABLE": "PARTIALLY_ACTIONABLE",
            "NEEDS_MORE_EVIDENCE": "NEEDS_MORE_EVIDENCE",
            "NOT_ACTIONABLE": "NOT_ACTIONABLE",
            "LANDLORD_RESPONSE_REQUIRED": "AWAITING_LANDLORD_RESPONSE",
            "ESCALATE_TO_MEDIATION": "ESCALATED",
            "URGENT_ESCALATION": "ESCALATED",
        }
        c2 = self._get_case(case_id)
        c2["status"] = next_status_map[ruling]
        self._save_case(case_id, c2)

    @gl.public.write
    def review_reconsideration(self, reconsideration_id: str) -> None:
        self._require_not_paused()
        self._require_keeper()
        rraw = self.reconsiderations.get(reconsideration_id)
        if rraw is None:
            raise VmUserError("Reconsideration not found")
        r = json.loads(rraw)
        case_id = r["caseId"]
        c = self._get_case(case_id)
        prev_raw = self.consensus_reviews.get(case_id)
        prev = json.loads(prev_raw) if prev_raw else {}

        prompt = f"""You are reviewing a reconsideration request for a tenant complaint case.

ORIGINAL_CASE: {json.dumps(c)}
ORIGINAL_REVIEW: {json.dumps(prev)}
RECONSIDERATION_REQUEST: {json.dumps(r)}

Return STRICT JSON ONLY with EXACTLY these keys, all enum-valued:

{{
  "reconsideration_decision": one of [ORIGINAL_RULING_UPHELD, ORIGINAL_RULING_ADJUSTED,
            MORE_EVIDENCE_REQUIRED, ESCALATE_TO_HUMAN_MEDIATION,
            RECONSIDERATION_REJECTED],
  "new_ruling": one of [ACTIONABLE, PARTIALLY_ACTIONABLE, NEEDS_MORE_EVIDENCE,
            NOT_ACTIONABLE, LANDLORD_RESPONSE_REQUIRED, ESCALATE_TO_MEDIATION,
            URGENT_ESCALATION],
  "new_credibility_band": one of [WEAK, MODERATE, STRONG],
  "new_actionability_band": one of [LOW, MEDIUM, HIGH],
  "confidence_band": one of [LOW, MEDIUM, HIGH],
  "reason_codes": array of 1-5 entries from the reason-codes enum,
  "final_recommendation": one of [REQUEST_LANDLORD_REPAIR_SCHEDULE,
            REQUEST_TENANT_ADDITIONAL_EVIDENCE, REQUEST_BOTH_PARTIES_EVIDENCE,
            SCHEDULE_PROPERTY_INSPECTION, ESCALATE_TO_MEDIATION,
            ESCALATE_URGENT_SAFETY_RISK, DISMISS_INSUFFICIENT_EVIDENCE,
            AWAIT_LANDLORD_RESPONSE, APPLY_RENT_ABATEMENT, ENFORCE_LEASE_TERM,
            NO_ACTION_REQUIRED]
}}

No prose. No numbers. No markdown fences. JSON object only.
"""

        def _run() -> str:
            return gl.nondet.exec_prompt(prompt)

        raw = gl.eq_principle.prompt_non_comparative(
            _run,
            task=(
                "Judge whether the reconsideration request materially changes the "
                "original ruling. Output a compact bounded enum-only JSON. No prose."
            ),
            criteria=(
                "ACCEPTABILITY CHECK. Accept candidate O as VALID only if:\n"
                "1. O is a single JSON object, no markdown, no prose around it.\n"
                "2. Keys EXACTLY: reconsideration_decision, new_ruling, "
                "new_credibility_band, new_actionability_band, confidence_band, "
                "reason_codes, final_recommendation.\n"
                "3. reconsideration_decision one of: ORIGINAL_RULING_UPHELD, "
                "ORIGINAL_RULING_ADJUSTED, MORE_EVIDENCE_REQUIRED, "
                "ESCALATE_TO_HUMAN_MEDIATION, RECONSIDERATION_REJECTED.\n"
                "4. new_ruling one of: ACTIONABLE, PARTIALLY_ACTIONABLE, "
                "NEEDS_MORE_EVIDENCE, NOT_ACTIONABLE, LANDLORD_RESPONSE_REQUIRED, "
                "ESCALATE_TO_MEDIATION, URGENT_ESCALATION.\n"
                "5. new_credibility_band one of: WEAK, MODERATE, STRONG.\n"
                "6. new_actionability_band, confidence_band each one of: LOW, MEDIUM, HIGH.\n"
                "7. reason_codes is a JSON array of 1 to 5 entries from the reason-codes enum.\n"
                "8. final_recommendation one of the next-action enum values.\n"
                "9. Self-consistent: e.g. ORIGINAL_RULING_UPHELD should not be paired "
                "with a new_ruling that differs materially from the original review's ruling.\n"
                "10. Supported by the input facts. ACCEPT validity. Do not require "
                "any specific enum value."
            ),
        )
        try:
            result = _safe_json_load(raw)
        except Exception as e:
            raise VmUserError("Reviewer returned invalid JSON: " + str(e)[:120])
        if result.get("reconsideration_decision") not in ALLOWED_RECONSIDERATION:
            raise VmUserError("Invalid reconsideration_decision")
        if result.get("new_ruling") not in ALLOWED_RULINGS:
            raise VmUserError("Invalid new_ruling")
        if result.get("new_credibility_band") not in ALLOWED_CREDIBILITY_BAND:
            raise VmUserError("Invalid new_credibility_band")
        if result.get("new_actionability_band") not in ALLOWED_BAND:
            raise VmUserError("Invalid new_actionability_band")
        if result.get("confidence_band") not in ALLOWED_BAND:
            raise VmUserError("Invalid confidence_band")
        if result.get("final_recommendation") not in ALLOWED_NEXT_ACTION:
            raise VmUserError("Invalid final_recommendation")
        rc = result.get("reason_codes")
        if not isinstance(rc, list) or len(rc) < 1 or len(rc) > 5:
            raise VmUserError("reason_codes must be array of 1..5")
        for code in rc:
            if code not in ALLOWED_REASON_CODES:
                raise VmUserError(f"Invalid reason_code: {code}")

        result["reconsiderationId"] = reconsideration_id
        result["caseId"] = case_id
        self.reconsideration_reviews[reconsideration_id] = json.dumps(result)

        r["status"] = "REVIEWED"
        self.reconsiderations[reconsideration_id] = json.dumps(r)

        if result["reconsideration_decision"] == "ORIGINAL_RULING_ADJUSTED":
            prev["ruling"] = result["new_ruling"]
            prev["credibility_band"] = result["new_credibility_band"]
            prev["actionability_band"] = result["new_actionability_band"]
            self.consensus_reviews[case_id] = json.dumps(prev)

    @gl.public.write
    def assess_lease_policy(self, case_id: str, clause_type: str) -> None:
        self._require_not_paused()
        self._require_keeper()
        c = self._get_case(case_id)
        prompt = f"""Assess how lease clause type '{clause_type}' applies to this tenant complaint.
Return STRICT JSON ONLY with EXACTLY these keys, all enum-valued:

{{
  "clause_type": "{clause_type}",
  "applicability": one of [STRONG, PARTIAL, WEAK, NONE],
  "confidence_band": one of [LOW, MEDIUM, HIGH]
}}

No prose. No markdown fences. JSON object only.

CASE: {json.dumps(c)}
"""
        def _run() -> str:
            return gl.nondet.exec_prompt(prompt)
        raw = gl.eq_principle.prompt_non_comparative(
            _run,
            task=f"Assess how lease clause type '{clause_type}' applies. Output compact bounded enum-only JSON. No prose.",
            criteria=(
                "ACCEPTABILITY CHECK. Accept candidate O as VALID only if:\n"
                "1. O is a single JSON object, no markdown, no prose.\n"
                "2. Keys EXACTLY: clause_type, applicability, confidence_band.\n"
                "3. applicability one of: STRONG, PARTIAL, WEAK, NONE.\n"
                "4. confidence_band one of: LOW, MEDIUM, HIGH.\n"
                "5. clause_type is a non-empty string.\n"
                "6. Judgement is supported by the case facts. ACCEPT validity. "
                "Do not require any specific enum value."
            ),
        )
        try:
            res = _safe_json_load(raw)
        except Exception as e:
            raise VmUserError("Reviewer returned invalid JSON: " + str(e)[:120])
        if res.get("applicability") not in ALLOWED_APPLICABILITY:
            raise VmUserError("Invalid applicability")
        if res.get("confidence_band") not in ALLOWED_BAND:
            raise VmUserError("Invalid confidence_band")
        key = f"policy_assess:{case_id}:{clause_type}"
        self.lease_policy_notes[key] = json.dumps(res)

    @gl.public.write
    def assess_evidence_conflicts(self, case_id: str) -> None:
        self._require_not_paused()
        self._require_keeper()
        c = self._get_case(case_id)
        ev_index = self.case_evidence.get("list:" + case_id)
        ev_ids = json.loads(ev_index) if ev_index else []
        evidence_arr = []
        for eid in ev_ids:
            raw = self.case_evidence.get(eid)
            if raw:
                evidence_arr.append(json.loads(raw))
        prompt = f"""Identify whether the listed evidence items contradict each other.

Return STRICT JSON ONLY with EXACTLY these keys, all enum-valued:

{{
  "conflicts_present": true | false,
  "conflict_severity": one of [NONE, LOW, MEDIUM, HIGH],
  "confidence_band": one of [LOW, MEDIUM, HIGH]
}}

No prose. No markdown fences. JSON object only.

CASE: {json.dumps(c)}
EVIDENCE: {json.dumps(evidence_arr)}
"""
        def _run() -> str:
            return gl.nondet.exec_prompt(prompt)
        raw = gl.eq_principle.prompt_non_comparative(
            _run,
            task="Decide whether evidence items conflict. Output compact bounded enum-only JSON. No prose.",
            criteria=(
                "ACCEPTABILITY CHECK. Accept candidate O as VALID only if:\n"
                "1. O is a single JSON object, no markdown, no prose.\n"
                "2. Keys EXACTLY: conflicts_present, conflict_severity, confidence_band.\n"
                "3. conflicts_present is a JSON boolean (true or false).\n"
                "4. conflict_severity one of: NONE, LOW, MEDIUM, HIGH.\n"
                "5. confidence_band one of: LOW, MEDIUM, HIGH.\n"
                "6. Self-consistent: conflicts_present=false implies "
                "conflict_severity=NONE; conflicts_present=true implies "
                "conflict_severity in [LOW, MEDIUM, HIGH].\n"
                "7. Supported by the listed evidence. ACCEPT validity. Do not "
                "require any specific enum value."
            ),
        )
        try:
            res = _safe_json_load(raw)
        except Exception as e:
            raise VmUserError("Reviewer returned invalid JSON: " + str(e)[:120])
        if not isinstance(res.get("conflicts_present"), bool):
            raise VmUserError("conflicts_present must be boolean")
        if res.get("conflict_severity") not in ALLOWED_CONFLICT_SEVERITY:
            raise VmUserError("Invalid conflict_severity")
        if res.get("confidence_band") not in ALLOWED_BAND:
            raise VmUserError("Invalid confidence_band")
        self.case_evidence[f"conflicts:{case_id}"] = json.dumps(res)

    # ---------- views ----------
    @gl.public.view
    def get_case(self, case_id: str) -> str:
        return self.cases.get(case_id) or ""

    @gl.public.view
    def get_landlord_response(self, case_id: str) -> str:
        return self.landlord_responses.get(case_id) or ""

    @gl.public.view
    def get_case_evidence(self, case_id: str) -> str:
        ids_raw = self.case_evidence.get("list:" + case_id)
        ids = json.loads(ids_raw) if ids_raw else []
        out = []
        for eid in ids:
            raw = self.case_evidence.get(eid)
            if raw:
                out.append(json.loads(raw))
        return json.dumps(out)

    @gl.public.view
    def get_policy_notes(self, case_id: str) -> str:
        ids_raw = self.lease_policy_notes.get("list:" + case_id)
        ids = json.loads(ids_raw) if ids_raw else []
        out = []
        for pid in ids:
            raw = self.lease_policy_notes.get(pid)
            if raw:
                out.append(json.loads(raw))
        return json.dumps(out)

    @gl.public.view
    def get_case_timeline(self, case_id: str) -> str:
        return self.case_timelines.get(case_id) or "[]"

    @gl.public.view
    def get_consensus_review(self, case_id: str) -> str:
        return self.consensus_reviews.get(case_id) or ""

    @gl.public.view
    def get_reconsideration(self, reconsideration_id: str) -> str:
        return self.reconsiderations.get(reconsideration_id) or ""

    @gl.public.view
    def get_reconsideration_review(self, reconsideration_id: str) -> str:
        return self.reconsideration_reviews.get(reconsideration_id) or ""

    @gl.public.view
    def get_user_cases(self, user: Address) -> str:
        return self.user_cases.get(_k(user)) or "[]"

    @gl.public.view
    def get_keeper_queue(self, keeper: Address) -> str:
        out = []
        for cid_key in self.cases:
            raw = self.cases.get(cid_key)
            if not raw: continue
            c = json.loads(raw)
            if str(c.get("assignedKeeper", "")).lower() == _k(keeper) or self._is_keeper(keeper):
                if c.get("status") in ("READY_FOR_KEEPER_CHECK", "AWAITING_LANDLORD_RESPONSE", "NEEDS_MORE_EVIDENCE"):
                    out.append(c)
        return json.dumps(out)

    @gl.public.view
    def get_protocol_stats(self) -> str:
        return json.dumps({
            "case_count": int(self.case_count),
            "evidence_count": int(self.evidence_count),
            "review_count": int(self.review_count),
            "reconsideration_count": int(self.reconsideration_count),
            "paused": self.paused,
        })

    @gl.public.view
    def is_keeper(self, addr: Address) -> bool:
        return self._is_keeper(addr)

    @gl.public.view
    def get_owner(self) -> str:
        return _k(self.owner)
