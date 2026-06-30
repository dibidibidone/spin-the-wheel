export type DomainCandidate = { name: string; available: boolean; priceUsd: number };
export type RegisterResult = { orderId: string; expiresAt: Date };

export type RegistrantContact = {
  firstName: string; lastName: string; address1: string; city: string;
  stateProvince: string; postalCode: string; country: string; phone: string; email: string;
};

export interface Registrar {
  checkAvailability(name: string): Promise<DomainCandidate>;
  suggest(keyword: string, tlds: string[]): Promise<DomainCandidate[]>;
  register(name: string): Promise<RegisterResult>;
  setNameservers(name: string, nameservers: string[]): Promise<void>;
}

export type DnsRecordInput = { type: "A" | "AAAA" | "CNAME"; name: string; content: string; proxied: boolean };
export type ZoneResult = { zoneId: string; nameservers: string[] };
export type SslStatus = "none" | "pending" | "active";

export interface EdgeDns {
  createZone(name: string): Promise<ZoneResult>;
  upsertRecords(zoneId: string, records: DnsRecordInput[]): Promise<void>;
  ensureSsl(zoneId: string): Promise<SslStatus>;
  deleteZone(zoneId: string): Promise<void>;
}

export type AttachStatus = { verified: boolean };

export interface OriginAttach {
  attach(hostname: string): Promise<AttachStatus>;
  verify(hostname: string): Promise<AttachStatus>;
  detach(hostname: string): Promise<void>;
}

export type OriginTarget = { ip?: string; cname?: string };

export type Providers = {
  registrar: Registrar;
  edge: EdgeDns;
  origin: OriginAttach;
  originTarget: OriginTarget;
};
