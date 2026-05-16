export interface EventRecord {
  event_id:        number;
  organizer:       string;
  name:            string;
  description:     string;
  location:        string;
  event_date:      string;
  event_time:      string;
  image_url:       string;
  max_attendees:   number;
  attendee_count:  number;
  is_closed:       boolean;
  profile_url:     string;
}

export interface AttendanceRecord {
  attendance_id: number;
  event_id:      number;
  attendee:      string;
  proof_url:     string;
  verdict:       "valid" | "invalid" | "insufficient";
  confidence:    number;
  reason:        string;
  is_revoked:    boolean;
  cert_minted:   boolean;
}

export interface OrganizerProfile {
  organizer:   string;
  profile_url: string;
  is_verified: boolean;
  event_count: number;
}

export interface AttendanceCertificate {
  token_id:       number;
  attendance_id:  number;
  event_id:       number;
  owner:          string;
  event_name:     string;
  event_date:     string;
  event_location: string;
  confidence:     number;
}

export interface PlayerStats {
  events_created: number;
  certs_earned:   number;
}

export interface ContractStats {
  total_events:       number;
  total_attendances:  number;
  total_certificates: number;
  total_organizers:   number;
  create_fee_wei:     number;
  claim_fee_wei:      number;
  platform_fee_pct:   number;
  platform_balance:   number;
  owner:              string;
}
