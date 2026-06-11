# Tenoria — GenLayer Tenant Complaint Arbitrator Contract
# Source of truth for cases, responses, evidence, lease policy notes,
# timelines, keeper assignments, consensus reviews, and reconsiderations.

from genlayer import *
import json


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
        self.keepers[self.owner.as_hex] = "OWNER"
        self.protocol_stats["created_at"] = str(gl.message.timestamp if hasattr(gl.message, "timestamp") else 0)

    # ---------- helpers ----------
    def _require_not_paused(self):
        if self.paused:
            raise VmUserError("Protocol is paused")

    def _require_owner(self):
        if gl.message.sender_address != self.owner:
            raise VmUserError("Only owner")

    def _is_keeper(self, addr: Address) -> bool:
        return addr.as_hex in self.keepers

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
        sender_hex = gl.message.sender_address.as_hex
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
        sender_hex = gl.message.sender_address.as_hex
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
        sender_hex = gl.message.sender_address.as_hex
        allowed = {
            str(c.get("tenantWallet", "")).lower(),
            str(c.get("landlordWallet", "")).lower(),
            str(c.get("assignedKeeper", "")).lower(),
        }
        if sender_hex.lower() not in allowed and not self._is_keeper(gl.message.sender_address) and gl.message.sender_address != self.owner:
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
        c["assignedKeeper"] = keeper.as_hex
        self._save_case(case_id, c)
        self.case_assignments[case_id] = keeper.as_hex

    def _require_owner_or_admin(self):
        if gl.message.sender_address != self.owner:
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
        sender_hex = gl.message.sender_address.as_hex
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
        self.keepers[keeper.as_hex] = "KEEPER"

    @gl.public.write
    def remove_keeper(self, keeper: Address) -> None:
        self._require_owner_or_admin()
        if keeper.as_hex in self.keepers:
            del self.keepers[keeper.as_hex]

    @gl.public.write
    def pause_protocol(self) -> None:
        self._require_owner_or_admin()
        self.paused = True

    @gl.public.write
    def unpause_protocol(self) -> None:
        self._require_owner_or_admin()
        self.paused = False

    # ---------- non-deterministic GenLayer review ----------
    def _build_review_prompt(self, c: dict, resp: dict | None, evidence_arr: list, policy_arr: list, timeline: str) -> str:
        return f"""You are reviewing a tenant complaint case for housing mediation support.

Do not simply summarise the complaint.
Do not assume either party is truthful without evidence.
Assess the tenant complaint narrative, landlord response, lease policy notes, evidence, and timeline.
Judge whether the complaint is credible, actionable, supported by lease policy, urgent, and what should happen next.
Do not make legal claims or court orders.
Return strict JSON only.

Do not invent missing facts.
If information is missing, list it as missing.
Distinguish between weak evidence and bad faith.
If landlord response is missing, explicitly account for that.
If urgent safety risk appears, recommend escalation.

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

Return JSON with keys: ruling, credibility_score, actionability_score, confidence,
urgency, lease_support, evidence_strength, landlord_response_quality,
recommended_next_action, required_actions, findings, red_flags,
missing_information, reasoning_summary.

Allowed ruling: ACTIONABLE | PARTIALLY_ACTIONABLE | NEEDS_MORE_EVIDENCE |
NOT_ACTIONABLE | LANDLORD_RESPONSE_REQUIRED | ESCALATE_TO_MEDIATION | URGENT_ESCALATION.
Allowed urgency: LOW | MEDIUM | HIGH | CRITICAL.
Allowed lease_support: STRONG | PARTIAL | WEAK | NONE | UNCLEAR.
Allowed evidence_strength: STRONG | MODERATE | WEAK | INSUFFICIENT | CONFLICTING.
Allowed landlord_response_quality: COMPLETE | PARTIAL | WEAK | MISSING | CONTRADICTORY.
"""

    def _validate_review(self, result: dict):
        for k in ["ruling", "credibility_score", "actionability_score", "confidence",
                  "urgency", "lease_support", "evidence_strength",
                  "landlord_response_quality", "recommended_next_action",
                  "required_actions", "findings", "red_flags",
                  "missing_information", "reasoning_summary"]:
            if k not in result:
                raise VmUserError(f"Missing field: {k}")
        if result["ruling"] not in ALLOWED_RULINGS:
            raise VmUserError("Invalid ruling")
        if result["urgency"] not in ALLOWED_URGENCY:
            raise VmUserError("Invalid urgency")
        if result["lease_support"] not in ALLOWED_LEASE:
            raise VmUserError("Invalid lease_support")
        if result["evidence_strength"] not in ALLOWED_EVIDENCE:
            raise VmUserError("Invalid evidence_strength")
        if result["landlord_response_quality"] not in ALLOWED_LL_QUALITY:
            raise VmUserError("Invalid landlord_response_quality")
        for sk in ["credibility_score", "actionability_score", "confidence"]:
            v = int(result[sk])
            if v < 0 or v > 100:
                raise VmUserError(f"{sk} must be 0..100")
        if not isinstance(result["required_actions"], list): raise VmUserError("required_actions must be array")
        if not isinstance(result["findings"], list): raise VmUserError("findings must be array")
        if not isinstance(result["red_flags"], list): raise VmUserError("red_flags must be array")
        if not isinstance(result["missing_information"], list): raise VmUserError("missing_information must be array")
        if not str(result["reasoning_summary"]).strip():
            raise VmUserError("reasoning_summary empty")

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
            res = gl.nondet.exec_prompt(prompt)
            return res

        raw_output = gl.eq_principle.prompt_comparative(
            _run,
            "Compare ruling, scores (within 10 points), urgency, lease_support, evidence_strength, and the recommended_next_action — they should be substantively equivalent."
        )

        try:
            result = json.loads(raw_output)
        except Exception:
            raise VmUserError("Reviewer returned invalid JSON")

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
Return strict JSON only.
Decide whether the new evidence/argument materially changes the original ruling.

ORIGINAL_CASE: {json.dumps(c)}
ORIGINAL_REVIEW: {json.dumps(prev)}
RECONSIDERATION_REQUEST: {json.dumps(r)}

Return JSON with keys: reconsideration_decision, new_ruling, new_credibility_score,
new_actionability_score, confidence, accepted_arguments, rejected_arguments,
reasoning_summary, final_recommendation.

Allowed reconsideration_decision: ORIGINAL_RULING_UPHELD | ORIGINAL_RULING_ADJUSTED |
MORE_EVIDENCE_REQUIRED | ESCALATE_TO_HUMAN_MEDIATION | RECONSIDERATION_REJECTED.
new_ruling must be one of: ACTIONABLE | PARTIALLY_ACTIONABLE | NEEDS_MORE_EVIDENCE |
NOT_ACTIONABLE | LANDLORD_RESPONSE_REQUIRED | ESCALATE_TO_MEDIATION | URGENT_ESCALATION.
"""

        def _run() -> str:
            return gl.nondet.exec_prompt(prompt)

        raw = gl.eq_principle.prompt_comparative(
            _run,
            "Compare reconsideration_decision, new_ruling, and scores (within 10 points)."
        )
        try:
            result = json.loads(raw)
        except Exception:
            raise VmUserError("Reviewer returned invalid JSON")
        if result.get("reconsideration_decision") not in ALLOWED_RECONSIDERATION:
            raise VmUserError("Invalid reconsideration_decision")
        if result.get("new_ruling") not in ALLOWED_RULINGS:
            raise VmUserError("Invalid new_ruling")
        if not str(result.get("reasoning_summary", "")).strip():
            raise VmUserError("reasoning_summary empty")

        result["reconsiderationId"] = reconsideration_id
        result["caseId"] = case_id
        self.reconsideration_reviews[reconsideration_id] = json.dumps(result)

        r["status"] = "REVIEWED"
        self.reconsiderations[reconsideration_id] = json.dumps(r)

        if result["reconsideration_decision"] == "ORIGINAL_RULING_ADJUSTED":
            prev["ruling"] = result["new_ruling"]
            prev["credibility_score"] = result.get("new_credibility_score", prev.get("credibility_score"))
            prev["actionability_score"] = result.get("new_actionability_score", prev.get("actionability_score"))
            prev["reasoning_summary"] = result["reasoning_summary"]
            self.consensus_reviews[case_id] = json.dumps(prev)

    @gl.public.write
    def assess_lease_policy(self, case_id: str, clause_type: str) -> None:
        self._require_not_paused()
        self._require_keeper()
        c = self._get_case(case_id)
        prompt = f"""Assess how lease clause type '{clause_type}' applies to this tenant complaint.
Return strict JSON: {{"clause_type": "...", "applicability": "STRONG|PARTIAL|WEAK|NONE", "explanation": "..."}}
CASE: {json.dumps(c)}
"""
        def _run() -> str:
            return gl.nondet.exec_prompt(prompt)
        raw = gl.eq_principle.prompt_comparative(_run, "applicability matches and explanation is substantively equivalent")
        try:
            res = json.loads(raw)
        except Exception:
            raise VmUserError("Invalid JSON")
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
        prompt = f"""Identify conflicts among evidence items for this case. Return strict JSON:
{{"conflicts": [{{"items": [...], "issue": "..."}}], "summary": "..."}}
CASE: {json.dumps(c)}
EVIDENCE: {json.dumps(evidence_arr)}
"""
        def _run() -> str:
            return gl.nondet.exec_prompt(prompt)
        raw = gl.eq_principle.prompt_comparative(_run, "conflict items and summary substantively equivalent")
        try:
            res = json.loads(raw)
        except Exception:
            raise VmUserError("Invalid JSON")
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
        return self.user_cases.get(user.as_hex) or self.user_cases.get(user.as_hex.lower()) or "[]"

    @gl.public.view
    def get_keeper_queue(self, keeper: Address) -> str:
        out = []
        for cid_key in self.cases:
            raw = self.cases.get(cid_key)
            if not raw: continue
            c = json.loads(raw)
            if c.get("assignedKeeper", "").lower() == keeper.as_hex.lower() or self._is_keeper(keeper):
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
        return self.owner.as_hex
