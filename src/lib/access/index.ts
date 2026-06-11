import type { ComplaintCase, Role } from "@/types";

export function deriveCaseRole(
  caseData: ComplaintCase | null,
  wallet: string,
  isKeeperFlag: boolean,
  isOwner: boolean
): Role {
  if (!wallet) return "none";
  const w = wallet.toLowerCase();
  if (isOwner) return "admin";
  if (!caseData) return isKeeperFlag ? "keeper" : "none";
  if (caseData.tenantWallet?.toLowerCase() === w) return "tenant";
  if (caseData.landlordWallet?.toLowerCase() === w) return "landlord";
  if (caseData.assignedKeeper?.toLowerCase() === w) return "keeper";
  if (isKeeperFlag) return "keeper";
  return "none";
}

export function canViewCase(role: Role): boolean {
  return role !== "none";
}

export function canTriggerReview(role: Role): boolean {
  return role === "keeper" || role === "admin";
}

export function canRespond(role: Role): boolean {
  return role === "landlord";
}

export function canAddEvidence(role: Role): boolean {
  return role === "tenant" || role === "landlord" || role === "keeper" || role === "admin";
}
