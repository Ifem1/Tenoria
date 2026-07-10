# v0.2.18
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import json

try:
    from genlayer.errors import VmUserError
except Exception:
    try:
        from genlayer.vm import UserError as VmUserError
    except Exception:
        class VmUserError(Exception):
            pass


# 0.01 GEN, assuming 18 decimals.
DEFAULT_REVIEW_FEE_WEI = 10_000_000_000_000_000
MAX_JSON_CHARS = 6000
MAX_TEXT_CHARS = 1200

ALLOWED_STATUS = {
    "OPENED",
    "AWAITING_LANDLORD_RESPONSE",
    "RESPONSE_SUBMITTED",
    "NEEDS_MORE_EVIDENCE",
    "READY_FOR_REVIEW",
    "UNDER_REVIEW",
    "REVIEWED",
    "ACTIONABLE",
    "PARTIALLY_ACTIONABLE",
    "NOT_ACTIONABLE",
    "ESCALATED",
    "URGENT_ESCALATION",
    "RECONSIDERATION_SUBMITTED",
    "READY_FOR_RECONSIDERATION_REVIEW",
    "RECONSIDERATION_REVIEWED",
    "FINALIZED",
    "CANCELLED",
}

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
ALLOWED_BAND = {"LOW", "MEDIUM", "HIGH"}
ALLOWED_CREDIBILITY = {"WEAK", "MODERATE", "STRONG"}
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


def _addr_key(addr) -> str:
    return str(addr).lower()


def _extract_json(raw) -> dict:
    if isinstance(raw, dict):
        return raw
    s = str(raw or "").strip()
    if not s:
        raise ValueError("empty output")
    if s.startswith("```"):
        nl = s.find("\n")
        if nl != -1:
            s = s[nl + 1:]
        if s.endswith("```"):
            s = s[:-3]
        s = s.strip()
    try:
        data = json.loads(s)
        if isinstance(data, dict):
            return data
    except Exception:
        pass
    start = s.find("{")
    end = s.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("no JSON object found")
    data = json.loads(s[start:end + 1])
    if not isinstance(data, dict):
        raise ValueError("expected JSON object")
    return data


class Tenoria(gl.Contract):
    owner: Address
    paused: bool
    review_fee_wei: u256
    keeper_required: bool

    case_count: u256
    evidence_count: u256
    review_count: u256
    reconsideration_count: u256
    flag_count: u256

    cases: TreeMap[str, str]
    landlord_responses: TreeMap[str, str]
    case_evidence: TreeMap[str, str]
    lease_policy_notes: TreeMap[str, str]
    case_timelines: TreeMap[str, str]
    consensus_reviews: TreeMap[str, str]
    reconsiderations: TreeMap[str, str]
    reconsideration_reviews: TreeMap[str, str]
    flags: TreeMap[str, str]

    keepers: TreeMap[str, str]
    case_assignments: TreeMap[str, str]
    user_cases: TreeMap[str, str]
    case_index: TreeMap[str, str]
    protocol_stats: TreeMap[str, str]

    def __init__(self):
        self.owner = gl.message.sender_address
        self.paused = False
        self.review_fee_wei = u256(DEFAULT_REVIEW_FEE_WEI)
        self.keeper_required = False
        self.case_count = u256(0)
        self.evidence_count = u256(0)
        self.review_count = u256(0)
        self.reconsideration_count = u256(0)
        self.flag_count = u256(0)
        self.keepers[_addr_key(self.owner)] = "OWNER"
        self.case_index["all"] = "[]"
        self.protocol_stats["created_at"] = str(gl.message.timestamp if hasattr(gl.message, "timestamp") else 0)

    # ----------------------------- helpers -----------------------------
    def _fail(self, msg: str) -> None:
        raise VmUserError(msg)

    def _sender(self) -> str:
        return _addr_key(gl.message.sender_address)

    def _require_not_paused(self) -> None:
        if self.paused:
            self._fail("Protocol is paused")

    def _require_owner(self) -> None:
        if self._sender() != _addr_key(self.owner):
            self._fail("Only owner")

    def _is_keeper_addr(self, addr) -> bool:
        return self.keepers.get(_addr_key(addr)) is not None

    def _is_keeper_sender(self) -> bool:
        return self._is_keeper_addr(gl.message.sender_address)

    def _safe_obj(self, raw: str) -> dict:
        if raw is None:
            self._fail("Invalid JSON")
        if len(str(raw)) > MAX_JSON_CHARS:
            self._fail("JSON payload too large")
        try:
            data = json.loads(raw)
        except Exception:
            self._fail("Invalid JSON")
        if not isinstance(data, dict):
            self._fail("Expected JSON object")
        return data

    def _safe_list(self, raw: str) -> list:
        if not raw:
            return []
        try:
            data = json.loads(raw)
            if isinstance(data, list):
                return data
        except Exception:
            pass
        return []

    def _json(self, data: dict) -> str:
        return json.dumps(data, sort_keys=True, separators=(",", ":"))

    def _append_to_list(self, store: TreeMap[str, str], key: str, value: str) -> None:
        arr = self._safe_list(store.get(key, "[]"))
        if value not in arr:
            arr.append(value)
        store[key] = json.dumps(arr)

    def _get_case(self, case_id: str) -> dict:
        cid = str(case_id).strip()
        raw = self.cases.get(cid, "")
        if not raw:
            self._fail("Case not found")
        return json.loads(raw)

    def _save_case(self, case_id: str, data: dict) -> None:
        self.cases[str(case_id).strip()] = self._json(data)

    def _case_parties(self, c: dict) -> tuple[str, str]:
        return (str(c.get("tenantWallet", "")).lower(), str(c.get("landlordWallet", "")).lower())

    def _can_access_case(self, c: dict, user: str) -> bool:
        tenant, landlord = self._case_parties(c)
        assigned = str(c.get("assignedKeeper", "")).lower()
        return user in (tenant, landlord, assigned) or self._is_keeper_sender() or user == _addr_key(self.owner)

    def _require_case_access(self, c: dict) -> None:
        if not self._can_access_case(c, self._sender()):
            self._fail("Not authorised for this private case")

    def _require_party_or_keeper_or_owner(self, c: dict) -> None:
        self._require_case_access(c)

    def _collect_evidence(self, case_id: str) -> list:
        ids = self._safe_list(self.case_evidence.get("list:" + case_id, "[]"))
        out = []
        for eid in ids:
            raw = self.case_evidence.get(str(eid), "")
            if raw:
                out.append(json.loads(raw))
        return out

    def _collect_policy_notes(self, case_id: str) -> list:
        ids = self._safe_list(self.lease_policy_notes.get("list:" + case_id, "[]"))
        out = []
        for pid in ids:
            raw = self.lease_policy_notes.get(str(pid), "")
            if raw:
                out.append(json.loads(raw))
        return out

    def _clean_enum_list(self, raw, allowed: set, max_items: int) -> list:
        if not isinstance(raw, list):
            raw = [raw]
        clean = []
        for item in raw:
            code = str(item).upper().strip()
            if code in allowed and code not in clean and len(clean) < max_items:
                clean.append(code)
        if not clean:
            clean.append("OTHER")
        return clean

    def _clean_text_list(self, raw, max_items: int, max_len: int) -> list:
        if not isinstance(raw, list):
            raw = [raw]
        clean = []
        for item in raw:
            value = str(item or "").strip()
            if value and len(clean) < max_items:
                clean.append(value[:max_len])
        return clean

    def _charge_review_fee(self) -> None:
        if int(self.review_fee_wei) <= 0:
            return
        if int(gl.message.value) < int(self.review_fee_wei):
            self._fail("Review fee too low")

    # ----------------------------- case writes -----------------------------
    @gl.public.write
    def open_case(self, case_id: str, case_json: str) -> str:
        self._require_not_paused()
        cid = str(case_id).strip()
        if not cid:
            self._fail("case_id required")
        if self.cases.get(cid, ""):
            self._fail("Case already exists")

        data = self._safe_obj(case_json)
        landlord = str(data.get("landlordWallet", "")).lower().strip()
        narrative = str(data.get("complaintNarrative", "")).strip()
        if not landlord:
            self._fail("landlordWallet required")
        if not narrative:
            self._fail("complaintNarrative required")

        tenant = self._sender()
        data["id"] = cid
        data["tenantWallet"] = tenant
        data["landlordWallet"] = landlord
        data["complaintNarrative"] = narrative[:MAX_TEXT_CHARS]
        data["status"] = "AWAITING_LANDLORD_RESPONSE"
        data["createdAt"] = str(gl.message.timestamp if hasattr(gl.message, "timestamp") else 0)
        data["privacyNotice"] = "Only sanitised summaries, hashes, CIDs or private links should be stored on-chain."

        self._save_case(cid, data)
        self.case_count = self.case_count + u256(1)
        self._append_to_list(self.user_cases, tenant, cid)
        self._append_to_list(self.user_cases, landlord, cid)
        self._append_to_list(self.case_index, "all", cid)
        return cid

    @gl.public.write
    def submit_landlord_response(self, case_id: str, response_json: str) -> str:
        self._require_not_paused()
        cid = str(case_id).strip()
        c = self._get_case(cid)
        if self._sender() != str(c.get("landlordWallet", "")).lower():
            self._fail("Only named landlord may respond")
        resp = self._safe_obj(response_json)
        resp["caseId"] = cid
        resp["landlordWallet"] = self._sender()
        resp["status"] = "SUBMITTED"
        self.landlord_responses[cid] = self._json(resp)
        c["status"] = "RESPONSE_SUBMITTED"
        self._save_case(cid, c)
        return cid

    @gl.public.write
    def add_evidence(self, evidence_id: str, case_id: str, evidence_json: str) -> str:
        self._require_not_paused()
        eid = str(evidence_id).strip()
        cid = str(case_id).strip()
        if not eid:
            self._fail("evidence_id required")
        if self.case_evidence.get(eid, ""):
            self._fail("Evidence id already exists")
        c = self._get_case(cid)
        self._require_party_or_keeper_or_owner(c)
        ev = self._safe_obj(evidence_json)
        ev["id"] = eid
        ev["caseId"] = cid
        ev["submittedBy"] = self._sender()
        ev["privacyNotice"] = "Store hashes, CIDs, private links, and sanitised summaries only. No raw private documents."
        self.case_evidence[eid] = self._json(ev)
        self._append_to_list(self.case_evidence, "list:" + cid, eid)
        self.evidence_count = self.evidence_count + u256(1)
        if c.get("status") in ("AWAITING_LANDLORD_RESPONSE", "RESPONSE_SUBMITTED", "NEEDS_MORE_EVIDENCE"):
            c["lastEvidenceAt"] = str(gl.message.timestamp if hasattr(gl.message, "timestamp") else 0)
            self._save_case(cid, c)
        return eid

    @gl.public.write
    def add_policy_note(self, note_id: str, case_id: str, policy_json: str) -> str:
        self._require_not_paused()
        nid = str(note_id).strip()
        cid = str(case_id).strip()
        if not nid:
            self._fail("note_id required")
        if self.lease_policy_notes.get(nid, ""):
            self._fail("Policy note id already exists")
        c = self._get_case(cid)
        self._require_party_or_keeper_or_owner(c)
        note = self._safe_obj(policy_json)
        note["id"] = nid
        note["caseId"] = cid
        note["submittedBy"] = self._sender()
        self.lease_policy_notes[nid] = self._json(note)
        self._append_to_list(self.lease_policy_notes, "list:" + cid, nid)
        return nid

    @gl.public.write
    def set_case_timeline(self, case_id: str, timeline_json: str) -> str:
        self._require_not_paused()
        cid = str(case_id).strip()
        c = self._get_case(cid)
        self._require_party_or_keeper_or_owner(c)
        if len(str(timeline_json)) > MAX_JSON_CHARS:
            self._fail("timeline too large")
        try:
            parsed = json.loads(timeline_json)
        except Exception:
            self._fail("Invalid timeline JSON")
        if not isinstance(parsed, list):
            self._fail("Timeline must be a JSON array")
        self.case_timelines[cid] = json.dumps(parsed)
        return cid

    @gl.public.write
    def mark_ready_for_review(self, case_id: str) -> str:
        self._require_not_paused()
        cid = str(case_id).strip()
        c = self._get_case(cid)
        self._require_party_or_keeper_or_owner(c)
        if c.get("status") in ("UNDER_REVIEW", "REVIEWED", "FINALIZED", "CANCELLED"):
            self._fail("Case cannot be marked ready from current status")
        ev_ids = self._safe_list(self.case_evidence.get("list:" + cid, "[]"))
        if len(ev_ids) < 1:
            self._fail("At least one evidence item or hash/CID summary is required")
        if self.keeper_required and not self._is_keeper_sender() and self._sender() != _addr_key(self.owner):
            self._fail("Keeper readiness gate is enabled")
        c["status"] = "READY_FOR_REVIEW"
        c["readyAt"] = str(gl.message.timestamp if hasattr(gl.message, "timestamp") else 0)
        self._save_case(cid, c)
        return cid

    @gl.public.write
    def request_more_information(self, case_id: str, request_json: str) -> str:
        self._require_not_paused()
        cid = str(case_id).strip()
        c = self._get_case(cid)
        if not (self._is_keeper_sender() or self._sender() == _addr_key(self.owner) or self._sender() in self._case_parties(c)):
            self._fail("Not authorised")
        req = self._safe_obj(request_json)
        c["moreInfoRequest"] = self._json(req)
        c["status"] = "NEEDS_MORE_EVIDENCE"
        self._save_case(cid, c)
        return cid

    @gl.public.write
    def cancel_case(self, case_id: str, reason: str) -> str:
        self._require_not_paused()
        cid = str(case_id).strip()
        c = self._get_case(cid)
        if self._sender() != str(c.get("tenantWallet", "")).lower() and self._sender() != _addr_key(self.owner):
            self._fail("Only tenant or owner may cancel")
        if c.get("status") in ("UNDER_REVIEW", "REVIEWED", "FINALIZED", "RECONSIDERATION_REVIEWED"):
            self._fail("Cannot cancel after review starts")
        c["status"] = "CANCELLED"
        c["cancelReason"] = str(reason or "")[:300]
        self._save_case(cid, c)
        return cid

    # ----------------------------- GenLayer review -----------------------------
    def _verify_evidence_resources(self, evidence_arr: list) -> list:
        # Contract-side check that submitted evidence links actually resolve, so the
        # review is grounded in a verifiable resource rather than trusting submitted
        # text alone. Runs inside the nondet leader/validator execution: each node
        # fetches independently and only the derived REACHABLE/UNREACHABLE label
        # (never raw response content) is used, which stays consensus-safe.
        checked = []
        fetch_budget = 5
        for ev in evidence_arr:
            uri = str(ev.get("uri") or "").strip()
            entry = {"id": ev.get("id"), "uri": uri}
            if not (uri.startswith("http://") or uri.startswith("https://")):
                entry["resource_check"] = "NOT_A_URL"
            elif fetch_budget <= 0:
                entry["resource_check"] = "NOT_CHECKED_LIMIT"
            else:
                fetch_budget -= 1
                try:
                    resp = gl.nondet.web.request(uri, method="GET")
                    code = int(getattr(resp, "status_code", 0) or 0)
                    entry["resource_check"] = "REACHABLE" if 200 <= code < 400 else f"UNREACHABLE_{code}"
                except Exception:
                    entry["resource_check"] = "FETCH_FAILED"
            checked.append(entry)
        return checked

    def _build_review_prompt(self, c: dict, resp: dict | None, evidence_arr: list, policy_arr: list, timeline: str, evidence_checks: list) -> str:
        return (
            "You are a neutral tenant complaint arbitrator for a private GenLayer case.\n"
            "Your task is not to apply a fixed rule. You must judge credibility, actionability, urgency, lease support, evidence strength, and next steps from the submitted records.\n"
            "Do not make legal conclusions or court orders. Do not invent missing facts. Distinguish weak evidence from bad faith.\n"
            "If landlord response is missing, treat landlord_response_quality as MISSING. If urgent safety risk appears, escalate.\n"
            "EVIDENCE_RESOURCE_CHECKS shows whether each evidence link actually resolved when fetched by the network. "
            "Evidence whose link is UNREACHABLE_* or FETCH_FAILED must be treated as weaker/unverified, not taken at face value.\n\n"
            "CASE_JSON:\n" + json.dumps(c) + "\n\n"
            "LANDLORD_RESPONSE_JSON:\n" + (json.dumps(resp) if resp else "MISSING") + "\n\n"
            "EVIDENCE_JSON_ARRAY:\n" + json.dumps(evidence_arr) + "\n\n"
            "EVIDENCE_RESOURCE_CHECKS:\n" + json.dumps(evidence_checks) + "\n\n"
            "LEASE_POLICY_NOTES_JSON_ARRAY:\n" + json.dumps(policy_arr) + "\n\n"
            "TIMELINE_JSON_ARRAY:\n" + (timeline or "[]") + "\n\n"
            "Return STRICT JSON ONLY, no markdown. Use this exact shape:\n"
            "{\n"
            '  "ruling": "ACTIONABLE",\n'
            '  "credibility_band": "MODERATE",\n'
            '  "actionability_band": "HIGH",\n'
            '  "confidence_band": "MEDIUM",\n'
            '  "risk_level": "MEDIUM",\n'
            '  "urgency": "MEDIUM",\n'
            '  "lease_support": "PARTIAL",\n'
            '  "evidence_strength": "MODERATE",\n'
            '  "landlord_response_quality": "PARTIAL",\n'
            '  "reason_codes": ["REPAIR_DELAY"],\n'
            '  "recommended_next_action": "REQUEST_LANDLORD_REPAIR_SCHEDULE",\n'
            '  "reasoning": ["short evidence-based reason"],\n'
            '  "missing_records": ["short missing record if any"],\n'
            '  "required_next_steps": ["short practical next step"]\n'
            "}\n\n"
            "Every field above must be a flat string or a flat list of strings — never a nested object. "
            "Do not add any extra top-level keys beyond the ones listed. Do not rename any key.\n\n"
            "Allowed ruling: ACTIONABLE, PARTIALLY_ACTIONABLE, NEEDS_MORE_EVIDENCE, NOT_ACTIONABLE, LANDLORD_RESPONSE_REQUIRED, ESCALATE_TO_MEDIATION, URGENT_ESCALATION.\n"
            "Allowed bands: LOW, MEDIUM, HIGH. Credibility: WEAK, MODERATE, STRONG. Risk/urgency: LOW, MEDIUM, HIGH, CRITICAL.\n"
            "Allowed lease_support: STRONG, PARTIAL, WEAK, NONE, UNCLEAR. Evidence: STRONG, MODERATE, WEAK, INSUFFICIENT, CONFLICTING.\n"
            "Allowed landlord_response_quality: COMPLETE, PARTIAL, WEAK, MISSING, CONTRADICTORY.\n"
            "Allowed recommended_next_action: REQUEST_LANDLORD_REPAIR_SCHEDULE, REQUEST_TENANT_ADDITIONAL_EVIDENCE, REQUEST_BOTH_PARTIES_EVIDENCE, SCHEDULE_PROPERTY_INSPECTION, ESCALATE_TO_MEDIATION, ESCALATE_URGENT_SAFETY_RISK, DISMISS_INSUFFICIENT_EVIDENCE, AWAIT_LANDLORD_RESPONSE, APPLY_RENT_ABATEMENT, ENFORCE_LEASE_TERM, NO_ACTION_REQUIRED.\n"
        )

    def _normalise_review(self, parsed: dict) -> dict:
        ruling = str(parsed.get("ruling", "NEEDS_MORE_EVIDENCE")).upper()
        if ruling not in ALLOWED_RULINGS:
            ruling = "NEEDS_MORE_EVIDENCE"
        credibility = str(parsed.get("credibility_band", "MODERATE")).upper()
        if credibility not in ALLOWED_CREDIBILITY:
            credibility = "MODERATE"
        actionability = str(parsed.get("actionability_band", "MEDIUM")).upper()
        if actionability not in ALLOWED_BAND:
            actionability = "MEDIUM"
        confidence = str(parsed.get("confidence_band", "MEDIUM")).upper()
        if confidence not in ALLOWED_BAND:
            confidence = "MEDIUM"
        risk = str(parsed.get("risk_level", "MEDIUM")).upper()
        if risk not in ALLOWED_URGENCY:
            risk = "MEDIUM"
        urgency = str(parsed.get("urgency", "MEDIUM")).upper()
        if urgency not in ALLOWED_URGENCY:
            urgency = "MEDIUM"
        lease = str(parsed.get("lease_support", "UNCLEAR")).upper()
        if lease not in ALLOWED_LEASE:
            lease = "UNCLEAR"
        evidence = str(parsed.get("evidence_strength", "INSUFFICIENT")).upper()
        if evidence not in ALLOWED_EVIDENCE:
            evidence = "INSUFFICIENT"
        llq = str(parsed.get("landlord_response_quality", "MISSING")).upper()
        if llq not in ALLOWED_LL_QUALITY:
            llq = "MISSING"
        next_action = str(parsed.get("recommended_next_action", "REQUEST_BOTH_PARTIES_EVIDENCE")).upper()
        if next_action not in ALLOWED_NEXT_ACTION:
            next_action = "REQUEST_BOTH_PARTIES_EVIDENCE"
        return {
            "ruling": ruling,
            "credibility_band": credibility,
            "actionability_band": actionability,
            "confidence_band": confidence,
            "risk_level": risk,
            "urgency": urgency,
            "lease_support": lease,
            "evidence_strength": evidence,
            "landlord_response_quality": llq,
            "reason_codes": self._clean_enum_list(parsed.get("reason_codes", []), ALLOWED_REASON_CODES, 5),
            "recommended_next_action": next_action,
            "reasoning": self._clean_text_list(parsed.get("reasoning", []), 5, 260) or ["Model did not return usable reasoning text for this ruling."],
            "missing_records": self._clean_text_list(parsed.get("missing_records", []), 5, 180),
            "required_next_steps": self._clean_text_list(parsed.get("required_next_steps", []), 5, 180),
        }

    def _validate_review(self, r: dict) -> None:
        if r["ruling"] not in ALLOWED_RULINGS: self._fail("Invalid ruling")
        if r["credibility_band"] not in ALLOWED_CREDIBILITY: self._fail("Invalid credibility_band")
        if r["actionability_band"] not in ALLOWED_BAND: self._fail("Invalid actionability_band")
        if r["confidence_band"] not in ALLOWED_BAND: self._fail("Invalid confidence_band")
        if r["risk_level"] not in ALLOWED_URGENCY: self._fail("Invalid risk_level")
        if r["urgency"] not in ALLOWED_URGENCY: self._fail("Invalid urgency")
        if r["lease_support"] not in ALLOWED_LEASE: self._fail("Invalid lease_support")
        if r["evidence_strength"] not in ALLOWED_EVIDENCE: self._fail("Invalid evidence_strength")
        if r["landlord_response_quality"] not in ALLOWED_LL_QUALITY: self._fail("Invalid landlord_response_quality")
        if r["recommended_next_action"] not in ALLOWED_NEXT_ACTION: self._fail("Invalid recommended_next_action")
        if not isinstance(r.get("reason_codes"), list) or len(r["reason_codes"]) < 1: self._fail("reason_codes required")
        if not isinstance(r.get("reasoning"), list) or len(r["reasoning"]) < 1: self._fail("reasoning required")
        if r["ruling"] == "URGENT_ESCALATION" and r["risk_level"] == "LOW": self._fail("Self-contradictory urgent ruling")

    @gl.public.write.payable
    def trigger_review(self, case_id: str) -> str:
        self._require_not_paused()
        cid = str(case_id).strip()
        c = self._get_case(cid)
        self._require_party_or_keeper_or_owner(c)
        if c.get("status") != "READY_FOR_REVIEW":
            self._fail("Case must be READY_FOR_REVIEW")
        self._charge_review_fee()

        resp_raw = self.landlord_responses.get(cid, "")
        resp = json.loads(resp_raw) if resp_raw else None
        evidence_arr = self._collect_evidence(cid)
        policy_arr = self._collect_policy_notes(cid)
        timeline = self.case_timelines.get(cid, "[]")

        c["status"] = "UNDER_REVIEW"
        self._save_case(cid, c)

        def leader_review() -> str:
            evidence_checks = self._verify_evidence_resources(evidence_arr)
            prompt = self._build_review_prompt(c, resp, evidence_arr, policy_arr, timeline, evidence_checks)
            raw = gl.nondet.exec_prompt(prompt, response_format="json")
            parsed = _extract_json(raw)
            normalised = self._normalise_review(parsed)
            return json.dumps(normalised, sort_keys=True)

        raw_output = gl.eq_principle.prompt_non_comparative(
            leader_review,
            task=(
                "Review a private tenant complaint using complaint narrative, landlord response, "
                "evidence metadata, lease policy notes, and timeline. Produce a structured judgement "
                "on actionability, credibility, urgency, lease support, evidence strength, and next steps."
            ),
            criteria=(
                "The output has already been normalised into strict flat JSON with allowed enum values by the contract "
                "before you see it, so do not disagree over formatting, key order, or exact wording of the reasoning text. "
                "Judge only the substance: reasoning must be evidence-based and must not invent facts; it must not make "
                "legal conclusions or court orders; it must distinguish weak evidence from bad faith; the judgement must "
                "be internally consistent (urgent escalation cannot pair with low risk); missing landlord response should "
                "be reflected as MISSING or LANDLORD_RESPONSE_REQUIRED where appropriate; evidence links marked "
                "UNREACHABLE_* or FETCH_FAILED in EVIDENCE_RESOURCE_CHECKS must not be treated as verified. "
                "Two outputs that reach the same substantive judgement in different words both satisfy these criteria — "
                "only disagree if the ruling or bands are clearly unsupported by, or contradict, the case record."
            ),
        )

        parsed = _extract_json(raw_output)
        final_review = self._normalise_review(parsed)
        self._validate_review(final_review)
        final_review["caseId"] = cid
        final_review["reviewedAt"] = str(gl.message.timestamp if hasattr(gl.message, "timestamp") else 0)
        final_review["reviewFeeWei"] = str(self.review_fee_wei)
        self.consensus_reviews[cid] = self._json(final_review)
        self.review_count = self.review_count + u256(1)

        status_map = {
            "ACTIONABLE": "ACTIONABLE",
            "PARTIALLY_ACTIONABLE": "PARTIALLY_ACTIONABLE",
            "NEEDS_MORE_EVIDENCE": "NEEDS_MORE_EVIDENCE",
            "NOT_ACTIONABLE": "NOT_ACTIONABLE",
            "LANDLORD_RESPONSE_REQUIRED": "AWAITING_LANDLORD_RESPONSE",
            "ESCALATE_TO_MEDIATION": "ESCALATED",
            "URGENT_ESCALATION": "URGENT_ESCALATION",
        }
        c2 = self._get_case(cid)
        c2["status"] = "REVIEWED"
        c2["ruling"] = final_review["ruling"]
        c2["outcomeStatus"] = status_map[final_review["ruling"]]
        c2["lastReviewedAt"] = final_review["reviewedAt"]
        self._save_case(cid, c2)
        return self._json(final_review)

    # Backwards-compatible alias for existing frontend code.
    @gl.public.write.payable
    def review_complaint(self, case_id: str) -> str:
        return self.trigger_review(case_id)

    # ----------------------------- reconsideration -----------------------------
    @gl.public.write
    def open_reconsideration(self, reconsideration_id: str, case_id: str, reconsideration_json: str) -> str:
        self._require_not_paused()
        rid = str(reconsideration_id).strip()
        cid = str(case_id).strip()
        if not rid:
            self._fail("reconsideration_id required")
        if self.reconsiderations.get(rid, ""):
            self._fail("Reconsideration already exists")
        c = self._get_case(cid)
        tenant, landlord = self._case_parties(c)
        if self._sender() not in (tenant, landlord):
            self._fail("Only tenant or landlord may request reconsideration")
        if not self.consensus_reviews.get(cid, ""):
            self._fail("Case must be reviewed before reconsideration")
        r = self._safe_obj(reconsideration_json)
        r["id"] = rid
        r["caseId"] = cid
        r["requestedBy"] = self._sender()
        r["status"] = "READY_FOR_RECONSIDERATION_REVIEW"
        self.reconsiderations[rid] = self._json(r)
        c["status"] = "READY_FOR_RECONSIDERATION_REVIEW"
        c["activeReconsiderationId"] = rid
        self._save_case(cid, c)
        self.reconsideration_count = self.reconsideration_count + u256(1)
        return rid

    def _build_reconsideration_prompt(self, case_json: str, prev_json: str, reconsideration_json: str) -> str:
        return (
            "You are reviewing a reconsideration request for a private tenant complaint.\n"
            "Judge whether the new evidence materially changes the original consensus review.\n"
            "Do not invent facts. Do not make legal orders. Return strict JSON only.\n\n"
            "CASE:\n" + case_json + "\n\n"
            "ORIGINAL_REVIEW:\n" + prev_json + "\n\n"
            "RECONSIDERATION_REQUEST:\n" + reconsideration_json + "\n\n"
            "Return this exact JSON shape:\n"
            "{\n"
            '  "reconsideration_decision": "ORIGINAL_RULING_UPHELD",\n'
            '  "new_ruling": "PARTIALLY_ACTIONABLE",\n'
            '  "new_credibility_band": "MODERATE",\n'
            '  "new_actionability_band": "MEDIUM",\n'
            '  "confidence_band": "MEDIUM",\n'
            '  "reason_codes": ["OTHER"],\n'
            '  "final_recommendation": "REQUEST_BOTH_PARTIES_EVIDENCE",\n'
            '  "reasoning": ["short evidence-based reason"],\n'
            '  "changed_fields": ["short field changed, or empty"]\n'
            "}\n\n"
            "Every field above must be a flat string or a flat list of strings — never a nested object. "
            "Do not add any extra top-level keys beyond the ones listed. Do not rename any key.\n"
        )

    def _normalise_reconsideration_review(self, parsed: dict) -> dict:
        decision = str(parsed.get("reconsideration_decision", "MORE_EVIDENCE_REQUIRED")).upper()
        if decision not in ALLOWED_RECONSIDERATION:
            decision = "MORE_EVIDENCE_REQUIRED"
        new_ruling = str(parsed.get("new_ruling", "NEEDS_MORE_EVIDENCE")).upper()
        if new_ruling not in ALLOWED_RULINGS:
            new_ruling = "NEEDS_MORE_EVIDENCE"
        cred = str(parsed.get("new_credibility_band", "MODERATE")).upper()
        if cred not in ALLOWED_CREDIBILITY:
            cred = "MODERATE"
        act = str(parsed.get("new_actionability_band", "MEDIUM")).upper()
        if act not in ALLOWED_BAND:
            act = "MEDIUM"
        conf = str(parsed.get("confidence_band", "MEDIUM")).upper()
        if conf not in ALLOWED_BAND:
            conf = "MEDIUM"
        rec = str(parsed.get("final_recommendation", "REQUEST_BOTH_PARTIES_EVIDENCE")).upper()
        if rec not in ALLOWED_NEXT_ACTION:
            rec = "REQUEST_BOTH_PARTIES_EVIDENCE"
        return {
            "reconsideration_decision": decision,
            "new_ruling": new_ruling,
            "new_credibility_band": cred,
            "new_actionability_band": act,
            "confidence_band": conf,
            "reason_codes": self._clean_enum_list(parsed.get("reason_codes", []), ALLOWED_REASON_CODES, 5),
            "final_recommendation": rec,
            "reasoning": self._clean_text_list(parsed.get("reasoning", []), 5, 260) or ["Model did not return usable reasoning text for this decision."],
            "changed_fields": self._clean_text_list(parsed.get("changed_fields", []), 5, 160),
        }

    @gl.public.write.payable
    def trigger_reconsideration_review(self, reconsideration_id: str) -> str:
        self._require_not_paused()
        rid = str(reconsideration_id).strip()
        rraw = self.reconsiderations.get(rid, "")
        if not rraw:
            self._fail("Reconsideration not found")
        r = json.loads(rraw)
        if r.get("status") != "READY_FOR_RECONSIDERATION_REVIEW":
            self._fail("Reconsideration is not ready")
        cid = str(r.get("caseId", ""))
        c = self._get_case(cid)
        self._require_party_or_keeper_or_owner(c)
        self._charge_review_fee()
        prev_raw = self.consensus_reviews.get(cid, "")
        if not prev_raw:
            self._fail("Original review not found")

        prompt = self._build_reconsideration_prompt(self._json(c), prev_raw, rraw)

        def leader_review() -> str:
            raw = gl.nondet.exec_prompt(prompt, response_format="json")
            parsed = _extract_json(raw)
            normalised = self._normalise_reconsideration_review(parsed)
            return json.dumps(normalised, sort_keys=True)

        raw_output = gl.eq_principle.prompt_non_comparative(
            leader_review,
            task="Review whether a tenant complaint reconsideration materially changes the original ruling.",
            criteria=(
                "The output has already been normalised into strict flat JSON with allowed enum values by the contract "
                "before you see it, so do not disagree over formatting, key order, or exact wording of the reasoning text. "
                "Judge only the substance: reasoning must be based on the original case, original review, and new "
                "reconsideration record; it must not invent facts or make legal orders. Two outputs that reach the same "
                "substantive decision in different words both satisfy these criteria — only disagree if the decision or "
                "ruling is clearly unsupported by, or contradicts, the record."
            ),
        )
        parsed = _extract_json(raw_output)
        result = self._normalise_reconsideration_review(parsed)
        if not result.get("reasoning"):
            self._fail("reconsideration reasoning required")
        result["reconsiderationId"] = rid
        result["caseId"] = cid
        result["reviewedAt"] = str(gl.message.timestamp if hasattr(gl.message, "timestamp") else 0)
        self.reconsideration_reviews[rid] = self._json(result)

        r["status"] = "REVIEWED"
        self.reconsiderations[rid] = self._json(r)
        c["status"] = "RECONSIDERATION_REVIEWED"
        c["lastReconsiderationId"] = rid
        if result["reconsideration_decision"] == "ORIGINAL_RULING_ADJUSTED":
            prev = json.loads(prev_raw)
            prev["ruling"] = result["new_ruling"]
            prev["credibility_band"] = result["new_credibility_band"]
            prev["actionability_band"] = result["new_actionability_band"]
            prev["recommended_next_action"] = result["final_recommendation"]
            prev["adjustedByReconsideration"] = rid
            self.consensus_reviews[cid] = self._json(prev)
            c["ruling"] = result["new_ruling"]
        self._save_case(cid, c)
        return self._json(result)

    # Backwards-compatible alias for existing frontend naming.
    @gl.public.write.payable
    def review_reconsideration(self, reconsideration_id: str) -> str:
        return self.trigger_reconsideration_review(reconsideration_id)

    # ----------------------------- flags / finalize -----------------------------
    @gl.public.write
    def flag_case(self, flag_id: str, case_id: str, reason_json: str) -> str:
        self._require_not_paused()
        fid = str(flag_id).strip()
        cid = str(case_id).strip()
        if not fid:
            self._fail("flag_id required")
        if self.flags.get(fid, ""):
            self._fail("Flag already exists")
        c = self._get_case(cid)
        self._require_case_access(c)
        data = self._safe_obj(reason_json)
        data["id"] = fid
        data["caseId"] = cid
        data["reporter"] = self._sender()
        data["createdAt"] = str(gl.message.timestamp if hasattr(gl.message, "timestamp") else 0)
        self.flags[fid] = self._json(data)
        self._append_to_list(self.flags, "list:" + cid, fid)
        self.flag_count = self.flag_count + u256(1)
        return fid

    @gl.public.write
    def finalize_case(self, case_id: str) -> str:
        self._require_not_paused()
        cid = str(case_id).strip()
        c = self._get_case(cid)
        self._require_party_or_keeper_or_owner(c)
        if not self.consensus_reviews.get(cid, ""):
            self._fail("Cannot finalize before review")
        c["status"] = "FINALIZED"
        c["finalizedAt"] = str(gl.message.timestamp if hasattr(gl.message, "timestamp") else 0)
        self._save_case(cid, c)
        return cid

    # ----------------------------- admin -----------------------------
    @gl.public.write
    def add_keeper(self, keeper: Address) -> str:
        self._require_owner()
        key = _addr_key(keeper)
        self.keepers[key] = "KEEPER"
        return key

    @gl.public.write
    def remove_keeper(self, keeper: Address) -> str:
        self._require_owner()
        key = _addr_key(keeper)
        if key == _addr_key(self.owner):
            self._fail("Cannot remove owner keeper role")
        if self.keepers.get(key) is not None:
            del self.keepers[key]
        return key

    @gl.public.write
    def assign_keeper(self, case_id: str, keeper: Address) -> str:
        self._require_owner()
        cid = str(case_id).strip()
        c = self._get_case(cid)
        if not self._is_keeper_addr(keeper):
            self._fail("Address is not a keeper")
        c["assignedKeeper"] = _addr_key(keeper)
        self._save_case(cid, c)
        self.case_assignments[cid] = _addr_key(keeper)
        return cid

    @gl.public.write
    def admin_set_review_fee(self, fee_wei: str) -> str:
        self._require_owner()
        try:
            fee = int(str(fee_wei))
        except Exception:
            self._fail("Invalid fee")
        if fee < 0:
            self._fail("Invalid fee")
        self.review_fee_wei = u256(fee)
        return str(self.review_fee_wei)

    @gl.public.write
    def admin_set_keeper_required(self, required: bool) -> bool:
        self._require_owner()
        self.keeper_required = bool(required)
        return self.keeper_required

    @gl.public.write
    def pause_protocol(self) -> None:
        self._require_owner()
        self.paused = True

    @gl.public.write
    def unpause_protocol(self) -> None:
        self._require_owner()
        self.paused = False

    @gl.public.write
    def transfer_ownership(self, new_owner: Address) -> str:
        self._require_owner()
        self.owner = new_owner
        self.keepers[_addr_key(new_owner)] = "OWNER"
        return _addr_key(new_owner)

    # ----------------------------- views -----------------------------
    @gl.public.view
    def get_case(self, case_id: str) -> str:
        c = self._get_case(str(case_id).strip())
        self._require_case_access(c)
        return self._json(c)

    @gl.public.view
    def get_landlord_response(self, case_id: str) -> str:
        c = self._get_case(str(case_id).strip())
        self._require_case_access(c)
        return self.landlord_responses.get(str(case_id).strip(), "")

    @gl.public.view
    def get_case_evidence(self, case_id: str) -> str:
        cid = str(case_id).strip()
        c = self._get_case(cid)
        self._require_case_access(c)
        return json.dumps(self._collect_evidence(cid))

    @gl.public.view
    def get_policy_notes(self, case_id: str) -> str:
        cid = str(case_id).strip()
        c = self._get_case(cid)
        self._require_case_access(c)
        return json.dumps(self._collect_policy_notes(cid))

    @gl.public.view
    def get_case_timeline(self, case_id: str) -> str:
        cid = str(case_id).strip()
        c = self._get_case(cid)
        self._require_case_access(c)
        return self.case_timelines.get(cid, "[]")

    @gl.public.view
    def get_consensus_review(self, case_id: str) -> str:
        cid = str(case_id).strip()
        c = self._get_case(cid)
        self._require_case_access(c)
        return self.consensus_reviews.get(cid, "")

    @gl.public.view
    def get_reconsideration(self, reconsideration_id: str) -> str:
        raw = self.reconsiderations.get(str(reconsideration_id).strip(), "")
        if not raw:
            return ""
        data = json.loads(raw)
        c = self._get_case(str(data.get("caseId", "")))
        self._require_case_access(c)
        return raw

    @gl.public.view
    def get_reconsideration_review(self, reconsideration_id: str) -> str:
        raw = self.reconsiderations.get(str(reconsideration_id).strip(), "")
        if not raw:
            return ""
        data = json.loads(raw)
        c = self._get_case(str(data.get("caseId", "")))
        self._require_case_access(c)
        return self.reconsideration_reviews.get(str(reconsideration_id).strip(), "")

    @gl.public.view
    def get_case_flags(self, case_id: str) -> str:
        cid = str(case_id).strip()
        c = self._get_case(cid)
        self._require_case_access(c)
        ids = self._safe_list(self.flags.get("list:" + cid, "[]"))
        out = []
        for fid in ids:
            raw = self.flags.get(str(fid), "")
            if raw:
                out.append(json.loads(raw))
        return json.dumps(out)

    @gl.public.view
    def get_user_cases(self, user: Address) -> str:
        # Only the user, keeper, or owner can list a user's private case ids.
        key = _addr_key(user)
        if self._sender() != key and not self._is_keeper_sender() and self._sender() != _addr_key(self.owner):
            self._fail("Not authorised")
        return self.user_cases.get(key, "[]")

    @gl.public.view
    def get_keeper_queue(self, keeper: Address) -> str:
        if _addr_key(keeper) != self._sender() and self._sender() != _addr_key(self.owner):
            self._fail("Not authorised")
        if not self._is_keeper_addr(keeper) and self._sender() != _addr_key(self.owner):
            self._fail("Not a keeper")
        all_ids = self._safe_list(self.case_index.get("all", "[]"))
        out = []
        keeper_key = _addr_key(keeper)
        for cid in all_ids:
            raw = self.cases.get(str(cid), "")
            if raw:
                c = json.loads(raw)
                assigned = str(c.get("assignedKeeper", "")).lower()
                if assigned == keeper_key or assigned == "" or self._sender() == _addr_key(self.owner):
                    if c.get("status") in ("READY_FOR_REVIEW", "READY_FOR_RECONSIDERATION_REVIEW", "NEEDS_MORE_EVIDENCE", "AWAITING_LANDLORD_RESPONSE"):
                        out.append(c)
        return json.dumps(out)

    @gl.public.view
    def get_protocol_stats(self) -> str:
        return json.dumps({
            "case_count": str(self.case_count),
            "evidence_count": str(self.evidence_count),
            "review_count": str(self.review_count),
            "reconsideration_count": str(self.reconsideration_count),
            "flag_count": str(self.flag_count),
            "review_fee_wei": str(self.review_fee_wei),
            "keeper_required": self.keeper_required,
            "paused": self.paused,
        }, sort_keys=True)

    @gl.public.view
    def get_config(self) -> str:
        return json.dumps({
            "owner": _addr_key(self.owner),
            "paused": self.paused,
            "review_fee_wei": str(self.review_fee_wei),
            "keeper_required": self.keeper_required,
        }, sort_keys=True)

    @gl.public.view
    def is_keeper(self, addr: Address) -> bool:
        return self._is_keeper_addr(addr)

    @gl.public.view
    def get_owner(self) -> str:
        return _addr_key(self.owner)
