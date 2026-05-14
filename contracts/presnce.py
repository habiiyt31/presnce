# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
from dataclasses import dataclass
import json
import re
import typing


# ─── Helpers ──────────────────────────────────────────────────

def _clean_json(text: str) -> dict:
    if isinstance(text, dict):
        return text
    text = str(text)
    first = text.find("{")
    last  = text.rfind("}")
    if first == -1 or last == -1:
        raise gl.UserError("Response did not contain valid JSON")
    text = text[first:last + 1]
    text = re.sub(r",(?!\s*?[\{\[\"'\w])", "", text)
    return json.loads(text)


def _safe_str(value: typing.Any, max_len: int = 500) -> str:
    return str(value).strip()[:max_len]


# ─── Storage dataclasses ───────────────────────────────────────

@allow_storage
@dataclass
class EventRecord:
    event_id:        u256
    organizer:       Address
    name:            str
    description:     str
    location:        str
    event_date:      str
    max_attendees:   u256
    attendee_count:  u256
    is_verified_org: bool
    is_closed:       bool
    profile_url:     str


@allow_storage
@dataclass
class AttendanceRecord:
    attendance_id: u256
    event_id:      u256
    attendee:      Address
    proof_url:     str
    verdict:       str       # "valid" | "invalid" | "insufficient"
    confidence:    u256
    reason:        str
    is_revoked:    bool
    cert_minted:   bool


@allow_storage
@dataclass
class OrganizerProfile:
    organizer:   Address
    profile_url: str
    is_verified: bool
    event_count: u256


@allow_storage
@dataclass
class AttendanceCertificate:
    token_id:       u256
    attendance_id:  u256
    event_id:       u256
    owner:          Address
    event_name:     str
    event_date:     str
    event_location: str
    confidence:     u256


# ─── EVM interface ─────────────────────────────────────────────

@gl.evm.contract_interface
class _EOA:
    class View:
        pass
    class Write:
        pass


# ─── Contract ──────────────────────────────────────────────────

class Presnce(gl.Contract):

    # DynArrays — same pattern as OriginMark
    events:      DynArray[EventRecord]
    attendances: DynArray[AttendanceRecord]
    organizers:  DynArray[OrganizerProfile]

    # TreeMaps — NFTs + player stats, same pattern as MochiHallOfShame
    certificates:        TreeMap[u256, AttendanceCertificate]
    player_event_count:  TreeMap[Address, u256]
    player_cert_count:   TreeMap[Address, u256]

    # Counters
    event_count:       u256
    attendance_count:  u256
    organizer_count:   u256
    certificate_count: u256

    # Config
    owner:            Address
    create_fee:       u256   # 0.01 GEN
    claim_fee:        u256   # 0.005 GEN
    verify_fee:       u256   # 0.02 GEN
    platform_bps:     u256   # 500 = 5%
    platform_balance: u256

    def __init__(self):
        self.owner             = gl.message.sender_address
        self.create_fee        = u256(10_000_000_000_000_000)  # 0.01 GEN
        self.claim_fee         = u256(5_000_000_000_000_000)   # 0.005 GEN
        self.verify_fee        = u256(20_000_000_000_000_000)  # 0.02 GEN
        self.platform_bps      = u256(500)
        self.platform_balance  = u256(0)
        self.certificate_count = u256(0)

    # ── Internal helpers ───────────────────────────────────────

    def _platform_cut(self, amount: u256) -> u256:
        return (amount * self.platform_bps) // u256(10_000)

    def _get_organizer_idx(self, addr: Address) -> int:
        for i in range(int(self.organizer_count)):
            if self.organizers[i].organizer == addr:
                return i
        return -1

    # ── Write: Create Event ────────────────────────────────────

    @gl.public.write.payable
    def create_event(
        self,
        name:          str,
        description:   str,
        location:      str,
        event_date:    str,
        max_attendees: u256,
    ) -> str:
        organizer = gl.message.sender_address
        paid      = gl.message.value

        assert paid >= self.create_fee,       "Event creation fee 0.01 GEN required"
        assert len(name.strip()) >= 3,        "Name too short (min 3 chars)"
        assert len(description.strip()) >= 20,"Description too short (min 20 chars)"
        assert len(location.strip()) >= 2,    "Location required"
        assert len(event_date.strip()) >= 8,  "Event date required"
        assert int(max_attendees) > 0,        "Max attendees must be > 0"

        self.platform_balance = self.platform_balance + paid

        # Check organizer profile
        org_idx     = self._get_organizer_idx(organizer)
        is_verified = False
        profile_url = ""

        if org_idx >= 0:
            is_verified = bool(self.organizers[org_idx].is_verified)
            profile_url = str(self.organizers[org_idx].profile_url)
            self.organizers[org_idx].event_count = (
                self.organizers[org_idx].event_count + u256(1)
            )
        else:
            profile = gl.storage.inmem_allocate(
                OrganizerProfile,
                organizer,
                "",
                False,
                u256(1),
            )
            self.organizers.append(profile)
            self.organizer_count = self.organizer_count + u256(1)

        event_id = self.event_count

        rec = gl.storage.inmem_allocate(
            EventRecord,
            event_id,
            organizer,
            name,
            description,
            location,
            event_date,
            max_attendees,
            u256(0),
            is_verified,
            False,
            profile_url,
        )
        self.events.append(rec)
        self.event_count = self.event_count + u256(1)

        # Track player stats
        self.player_event_count[organizer] = u256(
            int(self.player_event_count.get(organizer, u256(0))) + 1
        )

        return json.dumps({
            "success":     True,
            "event_id":    int(event_id),
            "name":        name,
            "is_verified": is_verified,
        })

    # ── Write: Apply Verified Organizer ───────────────────────

    @gl.public.write.payable
    def apply_verified_organizer(self, profile_url: str) -> str:
        organizer   = gl.message.sender_address
        paid        = gl.message.value

        assert paid >= self.verify_fee,       "Verification fee 0.02 GEN required"
        assert len(profile_url.strip()) >= 8, "Profile URL required"

        self.platform_balance = self.platform_balance + paid

        profile_url_val = profile_url

        # Use eq_principle for organizer verification — same as OriginMark
        def judge_organizer() -> str:
            try:
                html    = gl.nondet.web.get(profile_url_val).body.decode("utf-8")
                snippet = html[:3000] if html else "(empty)"
            except Exception:
                snippet = "(unreachable)"

            prompt = (
                "You are a verification judge for Presnce, an on-chain event platform.\n\n"
                "An organizer is applying for a Verified badge.\n"
                "Profile URL: " + profile_url_val + "\n"
                "Page content preview:\n" + snippet + "\n\n"
                "Verification rules:\n"
                "1. APPROVE if the page shows a real person or organization with credible online presence\n"
                "2. APPROVE if they have a professional website, Twitter/X, LinkedIn, or event history\n"
                "3. REJECT if URL is unreachable, empty, or clearly fake/spam\n"
                "4. REJECT if no meaningful identity or reputation can be determined\n\n"
                "Reply ONLY valid JSON, no markdown:\n"
                "{\"approved\":true,\"reason\":\"short reason\",\"confidence\":85}"
            )
            raw = gl.nondet.exec_prompt(prompt)
            raw = raw.replace("```json", "").replace("```", "").strip()
            return json.dumps(json.loads(raw), sort_keys=True)

        result_str = gl.eq_principle.prompt_comparative(
            judge_organizer,
            "The approved boolean field must be identical"
        )
        result   = json.loads(result_str)
        approved = bool(result.get("approved", False))
        reason   = _safe_str(result.get("reason", ""), 200)
        confidence = max(0, min(100, int(result.get("confidence", 0))))

        org_idx = self._get_organizer_idx(organizer)
        if org_idx >= 0:
            self.organizers[org_idx].profile_url = profile_url
            if approved:
                self.organizers[org_idx].is_verified = True
                # Update all events by this organizer
                for i in range(int(self.event_count)):
                    if self.events[i].organizer == organizer:
                        self.events[i].is_verified_org = True
                        self.events[i].profile_url     = profile_url
        else:
            profile = gl.storage.inmem_allocate(
                OrganizerProfile,
                organizer,
                profile_url,
                approved,
                u256(0),
            )
            self.organizers.append(profile)
            self.organizer_count = self.organizer_count + u256(1)

        return json.dumps({
            "success":    True,
            "approved":   approved,
            "confidence": confidence,
            "reason":     reason,
        })

    # ── Write: Claim Attendance ────────────────────────────────

    @gl.public.write.payable
    def claim_attendance(self, event_id: u256, proof_url: str) -> str:
        attendee = gl.message.sender_address
        paid     = gl.message.value
        eid      = int(event_id)

        assert paid >= self.claim_fee,                          "Claim fee 0.005 GEN required"
        assert eid < int(self.event_count),                     "Event not found"
        assert len(proof_url.strip()) >= 8,                     "Proof URL required"

        ev = self.events[eid]
        assert not bool(ev.is_closed),                          "Event is closed"
        assert int(ev.attendee_count) < int(ev.max_attendees),  "Event is full"

        self.platform_balance = self.platform_balance + paid

        event_name_val = str(ev.name)
        event_loc_val  = str(ev.location)
        event_date_val = str(ev.event_date)
        proof_url_val  = proof_url

        # Use run_nondet_unsafe — same pattern as MochiHallOfShame
        def leader_fn() -> dict:
            try:
                html    = gl.nondet.web.get(proof_url_val).body.decode("utf-8")
                snippet = html[:3000] if html else "(empty)"
            except Exception:
                snippet = "(unreachable)"

            prompt = (
                "You are an attendance verification judge on Presnce, an on-chain event platform.\n\n"
                "Event details:\n"
                "- Name: " + event_name_val + "\n"
                "- Location: " + event_loc_val + "\n"
                "- Date: " + event_date_val + "\n\n"
                "Attendee submitted proof URL: " + proof_url_val + "\n"
                "Page content preview:\n" + snippet + "\n\n"
                "Verdict rules:\n"
                "- \"valid\": proof clearly shows attendance (ticket, social post mentioning event, check-in, RSVP confirmation)\n"
                "- \"insufficient\": page loads but evidence is ambiguous or only partially related\n"
                "- \"invalid\": proof is unrelated, unreachable, or does not confirm attendance\n\n"
                "Reply ONLY valid JSON, no markdown:\n"
                "{\"verdict\":\"valid\",\"confidence\":85,\"reason\":\"short reason\"}"
            )
            raw  = gl.nondet.exec_prompt(prompt, response_format="json")
            data = _clean_json(raw)

            verdict = _safe_str(data.get("verdict", "invalid"), 20).lower()
            if verdict not in ("valid", "insufficient", "invalid"):
                verdict = "invalid"

            return {
                "verdict":    verdict,
                "confidence": max(0, min(100, int(data.get("confidence", 0)))),
                "reason":     _safe_str(data.get("reason", ""), 200),
            }

        def validator_fn(leader_result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False
            data = leader_result.calldata
            if not isinstance(data, dict):
                return False
            if data.get("verdict") not in ("valid", "insufficient", "invalid"):
                return False
            confidence = data.get("confidence")
            if not isinstance(confidence, int) or not (0 <= confidence <= 100):
                return False
            return True

        result     = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        verdict    = result["verdict"]
        confidence = result["confidence"]
        reason     = result["reason"]

        aid = self.attendance_count

        rec = gl.storage.inmem_allocate(
            AttendanceRecord,
            aid,
            event_id,
            attendee,
            proof_url,
            verdict,
            u256(confidence),
            reason,
            False,
            False,
        )
        self.attendances.append(rec)
        self.attendance_count = self.attendance_count + u256(1)

        if verdict == "valid":
            self.events[eid].attendee_count = ev.attendee_count + u256(1)

        return json.dumps({
            "success":       True,
            "attendance_id": int(aid),
            "event_id":      eid,
            "verdict":       verdict,
            "confidence":    confidence,
            "reason":        reason,
        })

    # ── Write: Mint Certificate NFT ───────────────────────────

    @gl.public.write
    def mint_certificate(self, attendance_id: u256) -> str:
        aid      = int(attendance_id)
        caller   = gl.message.sender_address

        assert aid < int(self.attendance_count),        "Attendance not found"
        att = self.attendances[aid]

        assert att.attendee == caller,                  "Only attendee can mint"
        assert str(att.verdict) == "valid",             "Only valid attendance can be minted"
        assert not bool(att.cert_minted),               "Certificate already minted"

        eid = int(att.event_id)
        ev  = self.events[eid]

        token_id = self.certificate_count

        cert = AttendanceCertificate(
            token_id,
            u256(aid),
            att.event_id,
            caller,
            str(ev.name),
            str(ev.event_date),
            str(ev.location),
            att.confidence,
        )
        self.certificates[token_id]    = cert
        self.certificate_count         = self.certificate_count + u256(1)
        self.attendances[aid].cert_minted = True

        # Track player stats
        self.player_cert_count[caller] = u256(
            int(self.player_cert_count.get(caller, u256(0))) + 1
        )

        return json.dumps({
            "success":       True,
            "token_id":      int(token_id),
            "attendance_id": aid,
            "event_name":    str(ev.name),
            "event_date":    str(ev.event_date),
            "event_location":str(ev.location),
            "confidence":    int(att.confidence),
        })

    # ── Write: Close Event ─────────────────────────────────────

    @gl.public.write
    def close_event(self, event_id: u256) -> str:
        eid    = int(event_id)
        caller = gl.message.sender_address
        assert eid < int(self.event_count), "Event not found"
        assert (
            caller == self.events[eid].organizer or caller == self.owner
        ), "Only organizer or owner"
        self.events[eid].is_closed = True
        return json.dumps({"success": True, "event_id": eid})

    # ── Write: Revoke Attendance ───────────────────────────────

    @gl.public.write
    def revoke_attendance(self, attendance_id: u256) -> str:
        aid    = int(attendance_id)
        caller = gl.message.sender_address
        assert aid < int(self.attendance_count), "Attendance not found"
        att = self.attendances[aid]
        eid = int(att.event_id)
        assert (
            caller == self.events[eid].organizer or caller == self.owner
        ), "Only organizer or owner"
        self.attendances[aid].is_revoked = True
        if int(self.events[eid].attendee_count) > 0:
            self.events[eid].attendee_count = (
                self.events[eid].attendee_count - u256(1)
            )
        return json.dumps({"success": True, "attendance_id": aid})

    # ── Write: Withdraw Fees ───────────────────────────────────

    @gl.public.write
    def withdraw_fees(self) -> u256:
        assert gl.message.sender_address == self.owner, "Not owner"
        amount = self.platform_balance
        assert amount > u256(0), "Nothing to withdraw"
        self.platform_balance = u256(0)
        _EOA(self.owner).emit_transfer(value=amount)
        return amount

    # ── View: Events ───────────────────────────────────────────

    @gl.public.view
    def get_event(self, event_id: u256) -> dict:
        eid = int(event_id)
        if eid >= int(self.event_count):
            return {}
        ev = self.events[eid]
        return {
            "event_id":        int(ev.event_id),
            "organizer":       ev.organizer.as_hex,
            "name":            str(ev.name),
            "description":     str(ev.description),
            "location":        str(ev.location),
            "event_date":      str(ev.event_date),
            "max_attendees":   int(ev.max_attendees),
            "attendee_count":  int(ev.attendee_count),
            "is_verified_org": bool(ev.is_verified_org),
            "is_closed":       bool(ev.is_closed),
            "profile_url":     str(ev.profile_url),
        }

    @gl.public.view
    def get_all_events(self) -> list:
        result = []
        for i in range(int(self.event_count)):
            result.append(self.get_event(u256(i)))
        return result

    @gl.public.view
    def get_organizer_events(self, addr: str) -> list:
        target = Address(addr)
        result = []
        for i in range(int(self.event_count)):
            if self.events[i].organizer == target:
                result.append(int(self.events[i].event_id))
        return result

    # ── View: Attendance ───────────────────────────────────────

    @gl.public.view
    def get_attendance(self, attendance_id: u256) -> dict:
        aid = int(attendance_id)
        if aid >= int(self.attendance_count):
            return {}
        att = self.attendances[aid]
        return {
            "attendance_id": int(att.attendance_id),
            "event_id":      int(att.event_id),
            "attendee":      att.attendee.as_hex,
            "proof_url":     str(att.proof_url),
            "verdict":       str(att.verdict),
            "confidence":    int(att.confidence),
            "reason":        str(att.reason),
            "is_revoked":    bool(att.is_revoked),
            "cert_minted":   bool(att.cert_minted),
        }

    @gl.public.view
    def get_event_attendances(self, event_id: u256) -> list:
        eid    = int(event_id)
        result = []
        for i in range(int(self.attendance_count)):
            att = self.attendances[i]
            if int(att.event_id) == eid and not bool(att.is_revoked):
                result.append(int(att.attendance_id))
        return result

    @gl.public.view
    def get_attendee_history(self, addr: str) -> list:
        target = Address(addr)
        result = []
        for i in range(int(self.attendance_count)):
            att = self.attendances[i]
            if att.attendee == target:
                result.append(int(att.attendance_id))
        return result

    # ── View: Certificates ─────────────────────────────────────

    @gl.public.view
    def get_certificate(self, token_id: u256) -> dict:
        if token_id not in self.certificates:
            return {}
        cert = self.certificates[token_id]
        return {
            "token_id":       int(cert.token_id),
            "attendance_id":  int(cert.attendance_id),
            "event_id":       int(cert.event_id),
            "owner":          cert.owner.as_hex,
            "event_name":     str(cert.event_name),
            "event_date":     str(cert.event_date),
            "event_location": str(cert.event_location),
            "confidence":     int(cert.confidence),
        }

    @gl.public.view
    def get_player_certificates(self, addr: str) -> list:
        target = Address(addr)
        result = []
        for i in range(int(self.certificate_count)):
            cert = self.certificates[u256(i)]
            if cert.owner == target:
                result.append(int(cert.token_id))
        return result

    # ── View: Organizer ────────────────────────────────────────

    @gl.public.view
    def get_organizer(self, addr: str) -> dict:
        target  = Address(addr)
        org_idx = self._get_organizer_idx(target)
        if org_idx < 0:
            return {}
        org = self.organizers[org_idx]
        return {
            "organizer":   org.organizer.as_hex,
            "profile_url": str(org.profile_url),
            "is_verified": bool(org.is_verified),
            "event_count": int(org.event_count),
        }

    # ── View: Player stats ─────────────────────────────────────

    @gl.public.view
    def get_player_stats(self, addr: str) -> dict:
        player = Address(addr)
        return {
            "events_created": int(self.player_event_count.get(player, u256(0))),
            "certs_earned":   int(self.player_cert_count.get(player, u256(0))),
        }

    # ── View: Stats ────────────────────────────────────────────

    @gl.public.view
    def get_stats(self) -> dict:
        return {
            "total_events":       int(self.event_count),
            "total_attendances":  int(self.attendance_count),
            "total_certificates": int(self.certificate_count),
            "total_organizers":   int(self.organizer_count),
            "create_fee_wei":     int(self.create_fee),
            "claim_fee_wei":      int(self.claim_fee),
            "verify_fee_wei":     int(self.verify_fee),
            "platform_fee_pct":   int(self.platform_bps) / 100,
            "platform_balance":   int(self.platform_balance),
            "owner":              self.owner.as_hex,
        }

    @gl.public.view
    def get_owner(self) -> str:
        return self.owner.as_hex
